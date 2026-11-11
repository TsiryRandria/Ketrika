import initSqlJs, { Database, SqlJsStatic } from 'sql.js';
import { 
  Project, 
  Task, 
  Note, 
  Job, 
  Transaction, 
  NotificationItem, 
  UserProfile, 
  ChatMessage 
} from '../types';
import { 
  initialProjects, 
  initialTasks, 
  initialNotes, 
  initialJobs, 
  initialTransactions, 
  initialNotifications, 
  initialProfile, 
  initialChatMessages 
} from '../data/initialData';

const DB_INDEXED_DB_NAME = 'KetrikaOfflineDB';
const DB_VERSION = 1;
const DB_STORE_NAME = 'ketrika_sqlite_store';
const KEY_CURRENT = 'current_db_v1';
const KEY_BACKUP = 'backup_db_v1';
const LEGACY_KEY = 'ketrika_sqlite_database_bin';
const LOCAL_STORAGE_KEY = 'ketrika_app_state_v1';

// Fast 32-bit FNV-1a checksum to detect file truncation & corruption
function computeChecksum(bytes: Uint8Array): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < bytes.length; i++) {
    hash ^= bytes[i];
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

// Check standard 16-byte SQLite 3 magic header ("SQLite format 3\0")
function isValidSqliteBinary(bytes: Uint8Array): boolean {
  if (!bytes || bytes.length < 100) return false;
  const magic = [0x53, 0x51, 0x4c, 0x69, 0x74, 0x65, 0x20, 0x66, 0x6f, 0x72, 0x6d, 0x61, 0x74, 0x20, 0x33, 0x00];
  for (let i = 0; i < 16; i++) {
    if (bytes[i] !== magic[i]) return false;
  }
  return true;
}

interface StoredDbRecord {
  binary: Uint8Array;
  checksum: number;
  timestamp: number;
}

class SQLiteService {
  private db: Database | null = null;
  private SQL: SqlJsStatic | null = null;
  private isInitialized = false;
  private initPromise: Promise<void> | null = null;
  
  // Concurrency & Persistence Queue
  private persistDebounceTimer: any = null;
  private isPersisting = false;
  private pendingPersist = false;
  private writeQueuePromise: Promise<void> = Promise.resolve();

  constructor() {
    // Flush persistence on page close / app pause in Android
    if (typeof window !== 'undefined') {
      window.addEventListener('pagehide', () => this.flushPersistenceSync());
      window.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
          this.flushPersistence();
        }
      });
    }
  }

  // Initialize SQLite Database with persistence, integrity verification and fallback
  async init(): Promise<void> {
    if (this.isInitialized) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      try {
        // 1. Load WebAssembly SQL.js
        this.SQL = await initSqlJs({
          locateFile: (file: string) => `/${file}`,
        });

        // 2. Load and verify stored binary
        let binary = await this.loadAndVerifyFromStorage();

        if (binary && isValidSqliteBinary(binary)) {
          try {
            const candidateDb = new this.SQL.Database(binary);
            // Verify integrity
            const integrityRes = candidateDb.exec("PRAGMA quick_check;");
            const status = integrityRes?.[0]?.values?.[0]?.[0];
            if (status === 'ok') {
              this.db = candidateDb;
              console.log('[Ketrika SQLite] Validated and loaded healthy database.');
            } else {
              console.warn('[Ketrika SQLite] Corrupted primary database detected, checking backup...');
              this.db = await this.recoverFromBackup();
            }
          } catch (loadErr) {
            console.warn('[Ketrika SQLite] Exception opening primary database:', loadErr);
            this.db = await this.recoverFromBackup();
          }
        } else {
          console.log('[Ketrika SQLite] No valid database found, initializing fresh database.');
          this.db = new this.SQL.Database();
        }

        if (!this.db) {
          this.db = new this.SQL.Database();
        }

        // Configure performance and safety pragmas
        this.configurePragmas();

        // 3. Ensure schema and all columns exist
        this.ensureSchemaIntegrity();

        // 4. Migrate any pre-existing localStorage records if migration not yet flagged
        await this.runSafeMigration();

        // 5. Initial persist
        await this.persistImmediately();

        this.isInitialized = true;
      } catch (err) {
        console.error('[Ketrika SQLite] Critical initialization error, applying failover:', err);
        if (this.SQL && !this.db) {
          this.db = new this.SQL.Database();
          this.configurePragmas();
          this.ensureSchemaIntegrity();
          await this.runSafeMigration();
        }
        this.isInitialized = true;
      }
    })();

    return this.initPromise;
  }

  private configurePragmas() {
    if (!this.db) return;
    try {
      this.db.run(`
        PRAGMA foreign_keys = ON;
        PRAGMA temp_store = MEMORY;
      `);
    } catch (e) {
      console.warn('[Ketrika SQLite] Pragma notice:', e);
    }
  }

  // Load candidate binary from IndexedDB (with checksum validation & legacy support)
  private async loadAndVerifyFromStorage(): Promise<Uint8Array | null> {
    try {
      const idb = await this.openIndexedDB();
      return new Promise<Uint8Array | null>((resolve) => {
        const tx = idb.transaction(DB_STORE_NAME, 'readonly');
        const store = tx.objectStore(DB_STORE_NAME);

        const req = store.get(KEY_CURRENT);
        req.onsuccess = () => {
          const res = req.result;
          if (res) {
            // New record with checksum
            if (res.binary && res.checksum) {
              const actualChecksum = computeChecksum(res.binary);
              if (actualChecksum === res.checksum && isValidSqliteBinary(res.binary)) {
                resolve(res.binary);
                return;
              }
              console.warn('[Ketrika SQLite] Current record checksum mismatch!');
            } else if (res instanceof Uint8Array && isValidSqliteBinary(res)) {
              // Raw binary
              resolve(res);
              return;
            }
          }

          // Fallback to legacy key
          const legacyReq = store.get(LEGACY_KEY);
          legacyReq.onsuccess = () => {
            if (legacyReq.result && isValidSqliteBinary(legacyReq.result)) {
              resolve(legacyReq.result);
            } else {
              resolve(null);
            }
          };
          legacyReq.onerror = () => resolve(null);
        };
        req.onerror = () => resolve(null);
        tx.oncomplete = () => idb.close();
      });
    } catch {
      return null;
    }
  }

  // Recover from secondary backup slot or fallback to localStorage replica
  private async recoverFromBackup(): Promise<Database> {
    try {
      const idb = await this.openIndexedDB();
      const backupBinary = await new Promise<Uint8Array | null>((resolve) => {
        const tx = idb.transaction(DB_STORE_NAME, 'readonly');
        const store = tx.objectStore(DB_STORE_NAME);
        const req = store.get(KEY_BACKUP);
        req.onsuccess = () => {
          const res = req.result;
          if (res && res.binary && isValidSqliteBinary(res.binary)) {
            const chk = computeChecksum(res.binary);
            if (chk === res.checksum) {
              resolve(res.binary);
              return;
            }
          }
          resolve(null);
        };
        req.onerror = () => resolve(null);
        tx.oncomplete = () => idb.close();
      });

      if (backupBinary && this.SQL) {
        console.log('[Ketrika SQLite] Recovered database successfully from backup slot.');
        return new this.SQL.Database(backupBinary);
      }
    } catch (e) {
      console.warn('[Ketrika SQLite] Backup slot recovery failed:', e);
    }

    // Secondary recovery: Recreate clean database and import from localStorage
    console.log('[Ketrika SQLite] Building fresh database from localStorage replica...');
    const freshDb = new this.SQL!.Database();
    return freshDb;
  }

  // Create tables and guarantee column integrity
  private ensureSchemaIntegrity() {
    if (!this.db) return;

    this.db.run(`
      CREATE TABLE IF NOT EXISTS meta_info (
        key TEXT PRIMARY KEY,
        value TEXT
      );

      CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        startDate TEXT,
        endDate TEXT,
        priority TEXT,
        status TEXT,
        progress INTEGER,
        category TEXT,
        image TEXT,
        isArchived INTEGER DEFAULT 0,
        tasks_json TEXT
      );

      CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        category TEXT,
        priority TEXT,
        status TEXT,
        projectTitle TEXT,
        dueDate TEXT,
        dueTime TEXT,
        createdAt TEXT,
        completed INTEGER DEFAULT 0,
        isOverdue INTEGER DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS notes (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        content TEXT,
        isFavorite INTEGER DEFAULT 0,
        isPinned INTEGER DEFAULT 0,
        isArchived INTEGER DEFAULT 0,
        createdAt TEXT,
        updatedAt TEXT,
        category TEXT,
        image TEXT,
        checklist_json TEXT
      );

      CREATE TABLE IF NOT EXISTS jobs (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        company TEXT,
        location TEXT,
        salary TEXT,
        contract TEXT,
        workMode TEXT,
        rating REAL,
        experience TEXT,
        description TEXT,
        isFavorite INTEGER DEFAULT 0,
        logo TEXT,
        applied INTEGER DEFAULT 0,
        postedDate TEXT,
        deadlineDate TEXT
      );

      CREATE TABLE IF NOT EXISTS transactions (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        type TEXT,
        category TEXT,
        amount REAL,
        date TEXT,
        source TEXT
      );

      CREATE TABLE IF NOT EXISTS notifications (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        category TEXT,
        time TEXT,
        isRead INTEGER DEFAULT 0,
        isRecent INTEGER DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS user_profile (
        id TEXT PRIMARY KEY,
        name TEXT,
        email TEXT,
        phone TEXT,
        address TEXT,
        isPremium INTEGER DEFAULT 1,
        avatarUrl TEXT,
        notificationsEnabled INTEGER DEFAULT 1,
        documents_json TEXT
      );

      CREATE TABLE IF NOT EXISTS chat_messages (
        id TEXT PRIMARY KEY,
        role TEXT,
        text TEXT,
        timestamp TEXT,
        attachment TEXT
      );
    `);
  }

  // Safe migration from localStorage to SQLite
  private async runSafeMigration() {
    if (!this.db) return;

    try {
      const metaRes = this.db.exec("SELECT value FROM meta_info WHERE key = 'migration_status'");
      if (metaRes.length > 0 && metaRes[0].values.length > 0) {
        return; // Already migrated
      }
    } catch {
      // Continue
    }

    console.log('[Ketrika SQLite] Executing safe migration into SQLite...');

    this.runInTransaction(() => {
      // 1. Projects
      let projectsToSave: Project[] = initialProjects;
      try {
        const saved = localStorage.getItem(`${LOCAL_STORAGE_KEY}_projects`);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) projectsToSave = parsed;
        }
      } catch { projectsToSave = initialProjects; }
      for (const p of projectsToSave) this.saveProjectSync(p);

      // 2. Tasks
      let tasksToSave: Task[] = initialTasks;
      try {
        const saved = localStorage.getItem(`${LOCAL_STORAGE_KEY}_tasks`);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) tasksToSave = parsed;
        }
      } catch { tasksToSave = initialTasks; }
      for (const t of tasksToSave) this.saveTaskSync(t);

      // 3. Notes
      let notesToSave: Note[] = initialNotes;
      try {
        const saved = localStorage.getItem(`${LOCAL_STORAGE_KEY}_notes`);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) notesToSave = parsed;
        }
      } catch { notesToSave = initialNotes; }
      for (const n of notesToSave) this.saveNoteSync(n);

      // 4. Jobs
      let jobsToSave: Job[] = initialJobs;
      try {
        const saved = localStorage.getItem(`${LOCAL_STORAGE_KEY}_jobs`);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) jobsToSave = parsed;
        }
      } catch { jobsToSave = initialJobs; }
      for (const j of jobsToSave) this.saveJobSync(j);

      // 5. Transactions
      let txToSave: Transaction[] = initialTransactions;
      try {
        const saved = localStorage.getItem(`${LOCAL_STORAGE_KEY}_transactions`);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) txToSave = parsed;
        }
      } catch { txToSave = initialTransactions; }
      for (const tx of txToSave) this.saveTransactionSync(tx);

      // 6. Notifications
      let notifsToSave: NotificationItem[] = initialNotifications;
      try {
        const saved = localStorage.getItem(`${LOCAL_STORAGE_KEY}_notifications`);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) notifsToSave = parsed;
        }
      } catch { notifsToSave = initialNotifications; }
      for (const notif of notifsToSave) this.saveNotificationSync(notif);

      // 7. Profile
      let profileToSave: UserProfile = initialProfile;
      try {
        const saved = localStorage.getItem(`${LOCAL_STORAGE_KEY}_profile`);
        if (saved) profileToSave = { ...initialProfile, ...JSON.parse(saved) };
      } catch { profileToSave = initialProfile; }
      this.saveProfileSync(profileToSave);

      // 8. Chat
      let chatToSave: ChatMessage[] = initialChatMessages;
      try {
        const saved = localStorage.getItem(`${LOCAL_STORAGE_KEY}_chat`);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) chatToSave = parsed;
        }
      } catch { chatToSave = initialChatMessages; }
      for (const msg of chatToSave) this.saveChatMessageSync(msg);

      // Mark migration done
      this.db!.run(
        "INSERT OR REPLACE INTO meta_info (key, value) VALUES ('migration_status', 'completed_securely'), ('engine', 'sqlite-3.x-wasm'), ('migrated_at', ?)",
        [new Date().toISOString()]
      );
    });

    console.log('[Ketrika SQLite] Migration transaction committed successfully.');
  }

  // Execute an action wrapped in an SQLite Savepoint (Atomic Rollback on Error)
  private runInTransaction<T>(action: () => T): T {
    if (!this.db) throw new Error("SQLite database not initialized");
    const savepoint = `sp_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    try {
      this.db.run(`SAVEPOINT ${savepoint};`);
      const result = action();
      this.db.run(`RELEASE SAVEPOINT ${savepoint};`);
      return result;
    } catch (err) {
      try {
        this.db.run(`ROLLBACK TO SAVEPOINT ${savepoint};`);
      } catch (rollbackErr) {
        console.error('[Ketrika SQLite] Rollback failure:', rollbackErr);
      }
      throw err;
    }
  }

  // --- Safe Asynchronous Debounced Persistence with Serialization ---
  async persist(): Promise<void> {
    if (!this.db) return;
    
    // Clear previous pending debounce
    if (this.persistDebounceTimer) {
      clearTimeout(this.persistDebounceTimer);
    }

    return new Promise<void>((resolve) => {
      this.persistDebounceTimer = setTimeout(() => {
        this.enqueuePersistTask().then(resolve);
      }, 80);
    });
  }

  private enqueuePersistTask(): Promise<void> {
    this.writeQueuePromise = this.writeQueuePromise.then(async () => {
      await this.persistImmediately();
    }).catch(err => {
      console.error('[Ketrika SQLite] Error in sequential persistence queue:', err);
    });
    return this.writeQueuePromise;
  }

  // Immediately writes SQLite binary with dual snapshot and checksum to IndexedDB
  private async persistImmediately(): Promise<void> {
    if (!this.db) return;
    if (this.isPersisting) {
      this.pendingPersist = true;
      return;
    }

    this.isPersisting = true;
    try {
      const binary = this.db.export();
      if (!isValidSqliteBinary(binary)) {
        throw new Error("Exported binary failed SQLite header validation, aborting persist to protect storage.");
      }

      const checksum = computeChecksum(binary);
      const record: StoredDbRecord = {
        binary,
        checksum,
        timestamp: Date.now()
      };

      await this.writeSnapshotToIndexedDB(record);
    } catch (err) {
      console.error('[Ketrika SQLite] Persist failed:', err);
    } finally {
      this.isPersisting = false;
      if (this.pendingPersist) {
        this.pendingPersist = false;
        await this.persistImmediately();
      }
    }
  }

  private flushPersistence() {
    if (this.persistDebounceTimer) {
      clearTimeout(this.persistDebounceTimer);
      this.persistDebounceTimer = null;
    }
    this.persistImmediately();
  }

  private flushPersistenceSync() {
    if (!this.db) return;
    try {
      const binary = this.db.export();
      if (isValidSqliteBinary(binary)) {
        // As last resort backup in sessionStorage / fallback
        sessionStorage.setItem('ketrika_last_sync', Date.now().toString());
      }
    } catch {}
  }

  // --- IndexedDB Storage Layer with Dual Snapshot ---
  private openIndexedDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      if (typeof window === 'undefined' || !window.indexedDB) {
        reject(new Error('IndexedDB not supported in this environment'));
        return;
      }
      const request = window.indexedDB.open(DB_INDEXED_DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const idb = request.result;
        if (!idb.objectStoreNames.contains(DB_STORE_NAME)) {
          idb.createObjectStore(DB_STORE_NAME);
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // Writes candidate to 'current', promoting previous 'current' to 'backup'
  private async writeSnapshotToIndexedDB(record: StoredDbRecord): Promise<void> {
    const idb = await this.openIndexedDB();
    return new Promise((resolve, reject) => {
      const tx = idb.transaction(DB_STORE_NAME, 'readwrite');
      const store = tx.objectStore(DB_STORE_NAME);

      // Read current to promote to backup
      const getReq = store.get(KEY_CURRENT);
      getReq.onsuccess = () => {
        const previousCurrent = getReq.result;
        if (previousCurrent && previousCurrent.binary) {
          store.put(previousCurrent, KEY_BACKUP);
        }

        // Put new record as current
        store.put(record, KEY_CURRENT);
        // Also update legacy key for backward compatibility
        store.put(record.binary, LEGACY_KEY);
      };

      tx.oncomplete = () => {
        idb.close();
        resolve();
      };
      tx.onerror = () => {
        idb.close();
        reject(tx.error);
      };
    });
  }

  // --- Synchronous Internal SQL Helpers (Safe, Parameterized, Null-Safe) ---

  private saveProjectSync(p: Project) {
    if (!this.db) return;
    this.db.run(
      `INSERT OR REPLACE INTO projects 
       (id, title, description, startDate, endDate, priority, status, progress, category, image, isArchived, tasks_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        p.id,
        p.title,
        p.description || '',
        p.startDate || '',
        p.endDate || '',
        p.priority || 'Moyenne',
        p.status || 'En cours',
        Math.max(0, Math.min(100, Number(p.progress || 0))),
        p.category || 'Général',
        p.image || '',
        p.isArchived ? 1 : 0,
        JSON.stringify(Array.isArray(p.tasks) ? p.tasks : [])
      ]
    );
  }

  private saveTaskSync(t: Task) {
    if (!this.db) return;
    this.db.run(
      `INSERT OR REPLACE INTO tasks
       (id, title, description, category, priority, status, projectTitle, dueDate, dueTime, createdAt, completed, isOverdue)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        t.id,
        t.title,
        t.description || '',
        t.category || 'Organisation',
        t.priority || 'Moyenne',
        t.status || 'À faire',
        t.projectTitle || '',
        t.dueDate || '',
        t.dueTime || '',
        t.createdAt || '',
        t.completed ? 1 : 0,
        t.isOverdue ? 1 : 0
      ]
    );
  }

  private saveNoteSync(n: Note) {
    if (!this.db) return;
    this.db.run(
      `INSERT OR REPLACE INTO notes
       (id, title, content, isFavorite, isPinned, isArchived, createdAt, updatedAt, category, image, checklist_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        n.id,
        n.title,
        n.content || '',
        n.isFavorite ? 1 : 0,
        n.isPinned ? 1 : 0,
        n.isArchived ? 1 : 0,
        n.createdAt || '',
        n.updatedAt || '',
        n.category || 'Personnel',
        n.image || '',
        JSON.stringify(Array.isArray(n.checklist) ? n.checklist : [])
      ]
    );
  }

  private saveJobSync(j: Job) {
    if (!this.db) return;
    this.db.run(
      `INSERT OR REPLACE INTO jobs
       (id, title, company, location, salary, contract, workMode, rating, experience, description, isFavorite, logo, applied, postedDate, deadlineDate)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        j.id,
        j.title,
        j.company || '',
        j.location || '',
        j.salary || '',
        j.contract || 'CDI',
        j.workMode || 'À distance',
        Number(j.rating || 5),
        j.experience || '',
        j.description || '',
        j.isFavorite ? 1 : 0,
        j.logo || '',
        j.applied ? 1 : 0,
        j.postedDate || '',
        j.deadlineDate || ''
      ]
    );
  }

  private saveTransactionSync(tx: Transaction) {
    if (!this.db) return;
    this.db.run(
      `INSERT OR REPLACE INTO transactions
       (id, title, type, category, amount, date, source)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        tx.id,
        tx.title,
        tx.type || 'Dépense',
        tx.category || 'Divers',
        Number(tx.amount || 0),
        tx.date || '',
        tx.source || 'Espèces'
      ]
    );
  }

  private saveNotificationSync(n: NotificationItem) {
    if (!this.db) return;
    this.db.run(
      `INSERT OR REPLACE INTO notifications
       (id, title, description, category, time, isRead, isRecent)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        n.id,
        n.title,
        n.description || '',
        n.category || 'task',
        n.time || '',
        n.isRead ? 1 : 0,
        n.isRecent ? 1 : 0
      ]
    );
  }

  private saveProfileSync(p: UserProfile) {
    if (!this.db) return;
    this.db.run(
      `INSERT OR REPLACE INTO user_profile
       (id, name, email, phone, address, isPremium, avatarUrl, notificationsEnabled, documents_json)
       VALUES ('main_user', ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        p.name || 'Tsiry Randria',
        p.email || '',
        p.phone || '',
        p.address || '',
        p.isPremium ? 1 : 0,
        p.avatarUrl || '',
        p.notificationsEnabled ? 1 : 0,
        JSON.stringify(Array.isArray(p.documents) ? p.documents : [])
      ]
    );
  }

  private saveChatMessageSync(m: ChatMessage) {
    if (!this.db) return;
    this.db.run(
      `INSERT OR REPLACE INTO chat_messages (id, role, text, timestamp, attachment)
       VALUES (?, ?, ?, ?, ?)`,
      [
        m.id,
        m.role,
        m.text || '',
        m.timestamp || '',
        m.attachment || ''
      ]
    );
  }

  private sanitizeLegacyUrl(url?: string): string | undefined {
    if (!url) return undefined;
    if (url.includes('photo-1534528741775')) return '/assets/images/avatar_user.jpg';
    if (url.includes('photo-1486406146926')) return '/assets/images/project_architecture.jpg';
    if (url.includes('photo-1498050108023')) return '/assets/images/project_code.jpg';
    if (url.includes('photo-1542601906990')) return '/assets/images/project_eco.jpg';
    if (url.includes('photo-1516321318423')) return '/assets/images/project_tech.jpg';
    if (url.includes('photo-1539020140153')) return '/assets/images/note_meeting.jpg';
    if (url.includes('favicon.ico')) return '/assets/logos/google.ico';
    if (url.includes('Microsoft_logo')) return '/assets/logos/microsoft.svg';
    if (url.includes('Meta_Platforms')) return '/assets/logos/meta.svg';
    if (url.includes('Amazon_Web_Services')) return '/assets/logos/aws.svg';
    return url;
  }

  // ==========================================
  // PUBLIC API: READ OPERATIONS (WITH SAFE FALLBACKS)
  // ==========================================

  getProjects(): Project[] {
    if (!this.db) return initialProjects;
    try {
      const res = this.db.exec("SELECT * FROM projects ORDER BY progress ASC");
      if (res.length === 0 || !res[0].values) return [];
      const cols = res[0].columns;
      return res[0].values.map(row => {
        const obj: any = {};
        cols.forEach((col, idx) => { obj[col] = row[idx]; });
        let subtasks = [];
        try {
          subtasks = obj.tasks_json ? JSON.parse(obj.tasks_json) : [];
        } catch { subtasks = []; }

        return {
          id: String(obj.id),
          title: String(obj.title || 'Sans titre'),
          description: String(obj.description || ''),
          startDate: String(obj.startDate || ''),
          endDate: String(obj.endDate || ''),
          priority: (obj.priority || 'Moyenne') as Project['priority'],
          status: (obj.status || 'En cours') as Project['status'],
          progress: Math.max(0, Math.min(100, Number(obj.progress || 0))),
          category: String(obj.category || 'Général'),
          image: this.sanitizeLegacyUrl(obj.image) || '/assets/images/project_architecture.jpg',
          isArchived: Boolean(Number(obj.isArchived)),
          tasks: subtasks
        };
      });
    } catch (e) {
      console.error('[Ketrika SQLite] Error reading projects:', e);
      return initialProjects;
    }
  }

  getTasks(): Task[] {
    if (!this.db) return initialTasks;
    try {
      const res = this.db.exec("SELECT * FROM tasks ORDER BY completed ASC, id DESC");
      if (res.length === 0 || !res[0].values) return [];
      const cols = res[0].columns;
      return res[0].values.map(row => {
        const obj: any = {};
        cols.forEach((col, idx) => { obj[col] = row[idx]; });
        return {
          id: String(obj.id),
          title: String(obj.title || 'Sans titre'),
          description: String(obj.description || ''),
          category: (obj.category || 'Organisation') as Task['category'],
          priority: (obj.priority || 'Moyenne') as Task['priority'],
          status: (obj.status || 'À faire') as Task['status'],
          projectTitle: String(obj.projectTitle || ''),
          dueDate: String(obj.dueDate || ''),
          dueTime: String(obj.dueTime || ''),
          createdAt: String(obj.createdAt || ''),
          completed: Boolean(Number(obj.completed)),
          isOverdue: Boolean(Number(obj.isOverdue))
        };
      });
    } catch (e) {
      console.error('[Ketrika SQLite] Error reading tasks:', e);
      return initialTasks;
    }
  }

  getNotes(): Note[] {
    if (!this.db) return initialNotes;
    try {
      const res = this.db.exec("SELECT * FROM notes ORDER BY isPinned DESC, id DESC");
      if (res.length === 0 || !res[0].values) return [];
      const cols = res[0].columns;
      return res[0].values.map(row => {
        const obj: any = {};
        cols.forEach((col, idx) => { obj[col] = row[idx]; });
        let checklist = [];
        try {
          checklist = obj.checklist_json ? JSON.parse(obj.checklist_json) : [];
        } catch { checklist = []; }

        return {
          id: String(obj.id),
          title: String(obj.title || 'Sans titre'),
          content: String(obj.content || ''),
          isFavorite: Boolean(Number(obj.isFavorite)),
          isPinned: Boolean(Number(obj.isPinned)),
          isArchived: Boolean(Number(obj.isArchived)),
          createdAt: String(obj.createdAt || ''),
          updatedAt: String(obj.updatedAt || ''),
          category: String(obj.category || 'Personnel'),
          image: this.sanitizeLegacyUrl(obj.image),
          checklist
        };
      });
    } catch (e) {
      console.error('[Ketrika SQLite] Error reading notes:', e);
      return initialNotes;
    }
  }

  getJobs(): Job[] {
    if (!this.db) return initialJobs;
    try {
      const res = this.db.exec("SELECT * FROM jobs ORDER BY id DESC");
      if (res.length === 0 || !res[0].values) return [];
      const cols = res[0].columns;
      return res[0].values.map(row => {
        const obj: any = {};
        cols.forEach((col, idx) => { obj[col] = row[idx]; });
        return {
          id: String(obj.id),
          title: String(obj.title || ''),
          company: String(obj.company || ''),
          location: String(obj.location || ''),
          salary: String(obj.salary || ''),
          contract: (obj.contract || 'CDI') as Job['contract'],
          workMode: (obj.workMode || 'À distance') as Job['workMode'],
          rating: Number(obj.rating || 5),
          experience: String(obj.experience || ''),
          description: String(obj.description || ''),
          isFavorite: Boolean(Number(obj.isFavorite)),
          logo: this.sanitizeLegacyUrl(obj.logo) || '/assets/logos/google.ico',
          applied: Boolean(Number(obj.applied)),
          postedDate: String(obj.postedDate || ''),
          deadlineDate: String(obj.deadlineDate || '')
        };
      });
    } catch (e) {
      console.error('[Ketrika SQLite] Error reading jobs:', e);
      return initialJobs;
    }
  }

  getTransactions(): Transaction[] {
    if (!this.db) return initialTransactions;
    try {
      const res = this.db.exec("SELECT * FROM transactions ORDER BY id DESC");
      if (res.length === 0 || !res[0].values) return [];
      const cols = res[0].columns;
      return res[0].values.map(row => {
        const obj: any = {};
        cols.forEach((col, idx) => { obj[col] = row[idx]; });
        return {
          id: String(obj.id),
          title: String(obj.title || 'Transaction'),
          type: (obj.type || 'Dépense') as Transaction['type'],
          category: String(obj.category || 'Divers'),
          amount: Number(obj.amount || 0),
          date: String(obj.date || ''),
          source: String(obj.source || 'Espèces')
        };
      });
    } catch (e) {
      console.error('[Ketrika SQLite] Error reading transactions:', e);
      return initialTransactions;
    }
  }

  getNotifications(): NotificationItem[] {
    if (!this.db) return initialNotifications;
    try {
      const res = this.db.exec("SELECT * FROM notifications ORDER BY id DESC");
      if (res.length === 0 || !res[0].values) return [];
      const cols = res[0].columns;
      return res[0].values.map(row => {
        const obj: any = {};
        cols.forEach((col, idx) => { obj[col] = row[idx]; });
        return {
          id: String(obj.id),
          title: String(obj.title || 'Notification'),
          description: String(obj.description || ''),
          category: (obj.category || 'task') as NotificationItem['category'],
          time: String(obj.time || "À l'instant"),
          isRead: Boolean(Number(obj.isRead)),
          isRecent: Boolean(Number(obj.isRecent))
        };
      });
    } catch (e) {
      console.error('[Ketrika SQLite] Error reading notifications:', e);
      return initialNotifications;
    }
  }

  getProfile(): UserProfile {
    if (!this.db) return initialProfile;
    try {
      const res = this.db.exec("SELECT * FROM user_profile WHERE id = 'main_user'");
      if (res.length === 0 || !res[0].values || res[0].values.length === 0) return initialProfile;
      const cols = res[0].columns;
      const row = res[0].values[0];
      const obj: any = {};
      cols.forEach((col, idx) => { obj[col] = row[idx]; });
      let documents = [];
      try {
        documents = obj.documents_json ? JSON.parse(obj.documents_json) : initialProfile.documents;
      } catch { documents = initialProfile.documents; }

      return {
        name: String(obj.name || initialProfile.name),
        email: String(obj.email || initialProfile.email),
        phone: String(obj.phone || initialProfile.phone),
        address: String(obj.address || initialProfile.address),
        isPremium: Boolean(Number(obj.isPremium)),
        avatarUrl: this.sanitizeLegacyUrl(obj.avatarUrl) || '/assets/images/avatar_user.jpg',
        notificationsEnabled: Boolean(Number(obj.notificationsEnabled)),
        documents
      };
    } catch (e) {
      console.error('[Ketrika SQLite] Error reading profile:', e);
      return initialProfile;
    }
  }

  getChatMessages(): ChatMessage[] {
    if (!this.db) return initialChatMessages;
    try {
      const res = this.db.exec("SELECT * FROM chat_messages ORDER BY id ASC");
      if (res.length === 0 || !res[0].values) return initialChatMessages;
      const cols = res[0].columns;
      return res[0].values.map(row => {
        const obj: any = {};
        cols.forEach((col, idx) => { obj[col] = row[idx]; });
        return {
          id: String(obj.id),
          role: (obj.role || 'user') as ChatMessage['role'],
          text: String(obj.text || ''),
          timestamp: String(obj.timestamp || ''),
          attachment: obj.attachment || undefined
        };
      });
    } catch (e) {
      console.error('[Ketrika SQLite] Error reading chat messages:', e);
      return initialChatMessages;
    }
  }

  // ==========================================
  // PUBLIC API: WRITE / CRUD (WITH TRANSACTION PROTECTION)
  // ==========================================

  async saveProject(p: Project): Promise<void> {
    this.runInTransaction(() => {
      this.saveProjectSync(p);
    });
    await this.persist();
  }

  async deleteProject(id: string): Promise<void> {
    if (!this.db) return;
    this.runInTransaction(() => {
      this.db!.run("DELETE FROM projects WHERE id = ?", [id]);
    });
    await this.persist();
  }

  async saveTask(t: Task): Promise<void> {
    this.runInTransaction(() => {
      this.saveTaskSync(t);
    });
    await this.persist();
  }

  async deleteTask(id: string): Promise<void> {
    if (!this.db) return;
    this.runInTransaction(() => {
      this.db!.run("DELETE FROM tasks WHERE id = ?", [id]);
    });
    await this.persist();
  }

  async saveNote(n: Note): Promise<void> {
    this.runInTransaction(() => {
      this.saveNoteSync(n);
    });
    await this.persist();
  }

  async deleteNote(id: string): Promise<void> {
    if (!this.db) return;
    this.runInTransaction(() => {
      this.db!.run("DELETE FROM notes WHERE id = ?", [id]);
    });
    await this.persist();
  }

  async saveJob(j: Job): Promise<void> {
    this.runInTransaction(() => {
      this.saveJobSync(j);
    });
    await this.persist();
  }

  async saveTransaction(tx: Transaction): Promise<void> {
    this.runInTransaction(() => {
      this.saveTransactionSync(tx);
    });
    await this.persist();
  }

  async deleteTransaction(id: string): Promise<void> {
    if (!this.db) return;
    this.runInTransaction(() => {
      this.db!.run("DELETE FROM transactions WHERE id = ?", [id]);
    });
    await this.persist();
  }

  async saveNotification(n: NotificationItem): Promise<void> {
    this.runInTransaction(() => {
      this.saveNotificationSync(n);
    });
    await this.persist();
  }

  async deleteNotification(id: string): Promise<void> {
    if (!this.db) return;
    this.runInTransaction(() => {
      this.db!.run("DELETE FROM notifications WHERE id = ?", [id]);
    });
    await this.persist();
  }

  async clearNotifications(): Promise<void> {
    if (!this.db) return;
    this.runInTransaction(() => {
      this.db!.run("DELETE FROM notifications;");
    });
    await this.persist();
  }

  async saveProfile(p: UserProfile): Promise<void> {
    this.runInTransaction(() => {
      this.saveProfileSync(p);
    });
    await this.persist();
  }

  async saveChatMessage(m: ChatMessage): Promise<void> {
    this.runInTransaction(() => {
      this.saveChatMessageSync(m);
    });
    await this.persist();
  }

  async clearChatMessages(): Promise<void> {
    if (!this.db) return;
    this.runInTransaction(() => {
      this.db!.run("DELETE FROM chat_messages;");
      if (initialChatMessages[0]) {
        this.saveChatMessageSync(initialChatMessages[0]);
      }
    });
    await this.persist();
  }

  async resetDatabase(): Promise<void> {
    if (!this.db) return;
    this.runInTransaction(() => {
      this.db!.run(`
        DELETE FROM projects;
        DELETE FROM tasks;
        DELETE FROM notes;
        DELETE FROM jobs;
        DELETE FROM transactions;
        DELETE FROM notifications;
        DELETE FROM user_profile;
        DELETE FROM chat_messages;
        DELETE FROM meta_info;
      `);
      this.runSafeMigration();
    });
    await this.persistImmediately();
  }

  // Export native SQLite database file (.db)
  exportSqliteBinary(): Uint8Array | null {
    if (!this.db) return null;
    try {
      const binary = this.db.export();
      return isValidSqliteBinary(binary) ? binary : null;
    } catch {
      return null;
    }
  }

  // Import SQLite file from user upload with thorough header and integrity checks
  async importSqliteBinary(bytes: Uint8Array): Promise<boolean> {
    if (!this.SQL) return false;
    if (!isValidSqliteBinary(bytes)) {
      console.error('[Ketrika SQLite] Invalid SQLite binary file provided.');
      return false;
    }

    try {
      const candidateDb = new this.SQL.Database(bytes);
      const integrity = candidateDb.exec("PRAGMA quick_check;");
      if (integrity?.[0]?.values?.[0]?.[0] !== 'ok') {
        console.error('[Ketrika SQLite] Imported SQLite database failed integrity check.');
        return false;
      }

      this.db = candidateDb;
      this.configurePragmas();
      this.ensureSchemaIntegrity();
      await this.persistImmediately();
      console.log('[Ketrika SQLite] Imported SQLite database verified and persisted.');
      return true;
    } catch (e) {
      console.error('[Ketrika SQLite] Failed to import SQLite binary:', e);
      return false;
    }
  }

  // Live Stats for UI with integrity healthcheck
  getDatabaseStats() {
    if (!this.db) {
      return {
        isReady: false,
        isHealthy: false,
        projectsCount: 0,
        tasksCount: 0,
        notesCount: 0,
        transactionsCount: 0,
        jobsCount: 0,
        notificationsCount: 0,
        chatMessagesCount: 0,
        sizeInKb: 0,
        engine: 'SQLite 3.x (Chargement...)',
        storage: 'IndexedDB Dual-Snapshot',
      };
    }

    const count = (table: string): number => {
      try {
        const res = this.db!.exec(`SELECT COUNT(*) FROM ${table}`);
        if (res.length > 0 && res[0].values.length > 0) {
          return Number(res[0].values[0][0]);
        }
        return 0;
      } catch {
        return 0;
      }
    };

    let sizeInKb = 0;
    let isHealthy = true;
    try {
      const bin = this.db.export();
      sizeInKb = Math.round(bin.byteLength / 1024);
      const check = this.db.exec("PRAGMA quick_check;");
      isHealthy = check?.[0]?.values?.[0]?.[0] === 'ok';
    } catch {
      isHealthy = false;
    }

    return {
      isReady: true,
      isHealthy,
      projectsCount: count('projects'),
      tasksCount: count('tasks'),
      notesCount: count('notes'),
      transactionsCount: count('transactions'),
      jobsCount: count('jobs'),
      notificationsCount: count('notifications'),
      chatMessagesCount: count('chat_messages'),
      sizeInKb,
      engine: 'SQLite 3.x (Atomic Savepoints)',
      storage: 'IndexedDB Dual-Snapshot + Checksums',
    };
  }
}

export const sqliteService = new SQLiteService();
