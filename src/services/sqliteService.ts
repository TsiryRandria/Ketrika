import initSqlJs, { Database, SqlJsStatic } from 'sql.js';
import { 
  Project, 
  Task, 
  Note, 
  Job, 
  Transaction, 
  FinanceSettings,
  NotificationItem, 
  UserProfile, 
  ChatMessage,
  JarvisConversation,
  JarvisConversationMode
} from '../types';
import { 
  initialProjects, 
  initialTasks, 
  initialNotes, 
  initialJobs, 
  initialTransactions, 
  initialFinanceSettings,
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
  private operationQueue: Promise<void> = Promise.resolve();
  private lastSortTimestamp = 0;

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

  isDatabaseReady(): boolean {
    return this.isInitialized && this.db !== null;
  }

  async ensureReady(): Promise<void> {
    await this.init();
  }

  async waitForPendingOperations(): Promise<void> {
    await this.ensureReady();
    let currentQueue = this.operationQueue;
    while (true) {
      await currentQueue;
      if (this.operationQueue === currentQueue) break;
      currentQueue = this.operationQueue;
    }
  }

  private enqueueOperation<T>(task: () => Promise<T> | T): Promise<T> {
    const next = this.operationQueue.then(async () => {
      await this.ensureReady();
      return task();
    });
    this.operationQueue = next.then(
      () => undefined,
      () => undefined
    );
    return next;
  }

  // Initialize SQLite Database with persistence, integrity verification and fallback
  async init(): Promise<void> {
    if (this.isInitialized && this.db) return;
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

        // 3. Ensure schema, incremental migrations & chronological sort_order atomically
        this.ensureSchemaAndMigrateSync(this.db);

        // 4. Migrate any pre-existing localStorage records if migration not yet flagged
        this.runSafeMigrationSync();

        // 5. Initial persist
        await this.persistImmediately();

        this.isInitialized = true;
      } catch (err) {
        console.error('[Ketrika SQLite] Critical initialization error, applying failover:', err);
        if (this.SQL && !this.db) {
          this.db = new this.SQL.Database();
          this.configurePragmas();
          this.ensureSchemaAndMigrateSync(this.db);
          this.runSafeMigrationSync();
        }
        this.isInitialized = Boolean(this.db);
      } finally {
        if (!this.isInitialized) {
          this.initPromise = null;
        }
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

  private getTableColumns(targetDb: Database, tableName: string): Set<string> {
    const cols = new Set<string>();
    try {
      const res = targetDb.exec(`PRAGMA table_info(${tableName});`);
      if (res.length > 0 && res[0].values) {
        const nameIdx = res[0].columns.indexOf('name');
        const idx = nameIdx >= 0 ? nameIdx : 1;
        for (const row of res[0].values) {
          if (row[idx]) cols.add(String(row[idx]));
        }
      }
    } catch {
      // Table may not exist yet
    }
    return cols;
  }

  private computeSortOrder(id: string, ascending = false, fallbackOrder?: number, enforceMonotonic = false): number {
    const match = /-(\d+)$/.exec(id || '');
    if (match) {
      const num = Number(match[1]);
      if (Number.isFinite(num)) {
        if (num >= 1_000_000_000) {
          if (enforceMonotonic) {
            const mono = Math.max(num, this.lastSortTimestamp + 1);
            this.lastSortTimestamp = mono;
            return mono;
          }
          if (num > this.lastSortTimestamp) this.lastSortTimestamp = num;
          return num;
        }
        // Seed items (e.g. task-1..task-7, notif-1..notif-12):
        // Descending feeds: smaller number = newer (1_000_000 - num), always < any real Date.now() timestamp.
        // Ascending logs (chat): smaller number = older (num), always < any real Date.now() timestamp.
        return ascending ? num : 1_000_000 - num;
      }
    }
    if (fallbackOrder !== undefined && Number.isFinite(fallbackOrder)) {
      return fallbackOrder;
    }
    const nextTs = Math.max(Date.now(), this.lastSortTimestamp + 1);
    this.lastSortTimestamp = nextTs;
    return nextTs;
  }

  private backfillSortOrderForTable(targetDb: Database, tableName: string, ascending = false) {
    try {
      const res = targetDb.exec(
        `SELECT rowid, id, sort_order FROM ${tableName} WHERE sort_order IS NULL OR sort_order = 0`
      );
      if (res.length === 0 || !res[0].values) return;
      for (const row of res[0].values) {
        const rowId = Number(row[0] || 0);
        const id = String(row[1] || '');
        const fallback = ascending ? rowId : 1_000_000 + rowId;
        const computed = this.computeSortOrder(id, ascending, fallback, false);
        targetDb.run(`UPDATE ${tableName} SET sort_order = ? WHERE id = ?`, [computed, id]);
      }
    } catch (e) {
      console.warn(`[Ketrika SQLite] Backfill sort_order notice (${tableName}):`, e);
    }
  }

  // Create tables, apply versioned column upgrades & backfill sort_order inside an atomic savepoint
  private ensureSchemaAndMigrateSync(targetDb: Database) {
    this.runInTransactionOn(targetDb, () => {
      targetDb.run(`
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
          tasks_json TEXT,
          sort_order INTEGER
        );

        CREATE TABLE IF NOT EXISTS tasks (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          description TEXT,
          category TEXT,
          priority TEXT,
          status TEXT,
          projectTitle TEXT,
          startDate TEXT,
          dueDate TEXT,
          dueTime TEXT,
          createdAt TEXT,
          completed INTEGER DEFAULT 0,
          isOverdue INTEGER DEFAULT 0,
          sort_order INTEGER
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
          checklist_json TEXT,
          sort_order INTEGER
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
          appliedCv TEXT,
          appliedCoverNote TEXT,
          appliedAt TEXT,
          postedDate TEXT,
          deadlineDate TEXT,
          sort_order INTEGER
        );

        CREATE TABLE IF NOT EXISTS transactions (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          type TEXT,
          category TEXT,
          amount REAL,
          date TEXT,
          source TEXT,
          sort_order INTEGER
        );

        CREATE TABLE IF NOT EXISTS notifications (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          description TEXT,
          category TEXT,
          time TEXT,
          isRead INTEGER DEFAULT 0,
          isRecent INTEGER DEFAULT 0,
          sort_order INTEGER
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
          documents_json TEXT,
          extended_json TEXT
        );

        CREATE TABLE IF NOT EXISTS chat_messages (
          id TEXT PRIMARY KEY,
          role TEXT,
          text TEXT,
          timestamp TEXT,
          attachment TEXT,
          sort_order INTEGER
        );

        CREATE TABLE IF NOT EXISTS finance_settings (
          id TEXT PRIMARY KEY,
          monthlyBudgetMax REAL,
          savingsGoalCurrent REAL,
          savingsGoalTarget REAL
        );

        CREATE TABLE IF NOT EXISTS jarvis_conversations (
          id TEXT PRIMARY KEY,
          mode TEXT NOT NULL,
          title TEXT NOT NULL,
          preview TEXT,
          createdAt TEXT,
          updatedAt TEXT,
          dateLabel TEXT,
          timeLabel TEXT,
          messages_json TEXT,
          sort_order INTEGER
        );
      `);

      const taskCols = this.getTableColumns(targetDb, 'tasks');
      if (!taskCols.has('startDate')) {
        targetDb.run("ALTER TABLE tasks ADD COLUMN startDate TEXT");
      }

      const profileCols = this.getTableColumns(targetDb, 'user_profile');
      if (!profileCols.has('extended_json')) {
        targetDb.run("ALTER TABLE user_profile ADD COLUMN extended_json TEXT");
      }

      const jobCols = this.getTableColumns(targetDb, 'jobs');
      if (!jobCols.has('appliedCv')) {
        targetDb.run("ALTER TABLE jobs ADD COLUMN appliedCv TEXT");
      }
      if (!jobCols.has('appliedCoverNote')) {
        targetDb.run("ALTER TABLE jobs ADD COLUMN appliedCoverNote TEXT");
      }
      if (!jobCols.has('appliedAt')) {
        targetDb.run("ALTER TABLE jobs ADD COLUMN appliedAt TEXT");
      }

      const sortableTables: { name: string; ascending: boolean }[] = [
        { name: 'projects', ascending: false },
        { name: 'tasks', ascending: false },
        { name: 'notes', ascending: false },
        { name: 'jobs', ascending: false },
        { name: 'transactions', ascending: false },
        { name: 'notifications', ascending: false },
        { name: 'chat_messages', ascending: true },
        { name: 'jarvis_conversations', ascending: false },
      ];

      for (const tbl of sortableTables) {
        const cols = this.getTableColumns(targetDb, tbl.name);
        if (!cols.has('sort_order')) {
          targetDb.run(`ALTER TABLE ${tbl.name} ADD COLUMN sort_order INTEGER`);
        }
        this.backfillSortOrderForTable(targetDb, tbl.name, tbl.ascending);
        targetDb.run(`CREATE INDEX IF NOT EXISTS idx_${tbl.name}_sort_order ON ${tbl.name}(sort_order)`);
      }

      targetDb.run("CREATE INDEX IF NOT EXISTS idx_jarvis_conversations_mode_sort ON jarvis_conversations(mode, sort_order DESC)");

      targetDb.run(
        "INSERT OR REPLACE INTO meta_info (key, value) VALUES ('schema_version', '4')"
      );
    });
  }

  // Safe synchronous migration from localStorage / initialData into SQLite
  private runSafeMigrationSync(forceInitialDefaults = false) {
    if (!this.db) return;

    if (!forceInitialDefaults) {
      try {
        const metaRes = this.db.exec("SELECT value FROM meta_info WHERE key = 'migration_status'");
        if (metaRes.length > 0 && metaRes[0].values.length > 0) {
          return; // Already migrated
        }
      } catch {
        // Continue
      }
    }

    console.log('[Ketrika SQLite] Executing safe migration into SQLite...');

    this.runInTransaction(() => {
      // 1. Projects
      let projectsToSave: Project[] = initialProjects;
      if (!forceInitialDefaults) {
        try {
          const saved = localStorage.getItem(`${LOCAL_STORAGE_KEY}_projects`);
          if (saved) {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed) && parsed.length > 0) projectsToSave = parsed;
          }
        } catch { projectsToSave = initialProjects; }
      }
      for (const p of projectsToSave) this.saveProjectSync(p);

      // 2. Tasks
      let tasksToSave: Task[] = initialTasks;
      if (!forceInitialDefaults) {
        try {
          const saved = localStorage.getItem(`${LOCAL_STORAGE_KEY}_tasks`);
          if (saved) {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed) && parsed.length > 0) tasksToSave = parsed;
          }
        } catch { tasksToSave = initialTasks; }
      }
      for (const t of tasksToSave) this.saveTaskSync(t);

      // 3. Notes
      let notesToSave: Note[] = initialNotes;
      if (!forceInitialDefaults) {
        try {
          const saved = localStorage.getItem(`${LOCAL_STORAGE_KEY}_notes`);
          if (saved) {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed) && parsed.length > 0) notesToSave = parsed;
          }
        } catch { notesToSave = initialNotes; }
      }
      for (const n of notesToSave) this.saveNoteSync(n);

      // 4. Jobs
      let jobsToSave: Job[] = initialJobs;
      if (!forceInitialDefaults) {
        try {
          const saved = localStorage.getItem(`${LOCAL_STORAGE_KEY}_jobs`);
          if (saved) {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed) && parsed.length > 0) jobsToSave = parsed;
          }
        } catch { jobsToSave = initialJobs; }
      }
      for (const j of jobsToSave) this.saveJobSync(j);

      // 5. Transactions
      let txToSave: Transaction[] = initialTransactions;
      if (!forceInitialDefaults) {
        try {
          const saved = localStorage.getItem(`${LOCAL_STORAGE_KEY}_transactions`);
          if (saved) {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed) && parsed.length > 0) txToSave = parsed;
          }
        } catch { txToSave = initialTransactions; }
      }
      for (const tx of txToSave) this.saveTransactionSync(tx);

      // 6. Notifications
      let notifsToSave: NotificationItem[] = initialNotifications;
      if (!forceInitialDefaults) {
        try {
          const saved = localStorage.getItem(`${LOCAL_STORAGE_KEY}_notifications`);
          if (saved) {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed) && parsed.length > 0) notifsToSave = parsed;
          }
        } catch { notifsToSave = initialNotifications; }
      }
      for (const notif of notifsToSave) this.saveNotificationSync(notif);

      // 7. Profile
      let profileToSave: UserProfile = initialProfile;
      if (!forceInitialDefaults) {
        try {
          const saved = localStorage.getItem(`${LOCAL_STORAGE_KEY}_profile`);
          if (saved) profileToSave = { ...initialProfile, ...JSON.parse(saved) };
        } catch { profileToSave = initialProfile; }
      }
      this.saveProfileSync(profileToSave);

      // 8. Chat
      let chatToSave: ChatMessage[] = initialChatMessages;
      if (!forceInitialDefaults) {
        try {
          const saved = localStorage.getItem(`${LOCAL_STORAGE_KEY}_chat`);
          if (saved) {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed) && parsed.length > 0) chatToSave = parsed;
          }
        } catch { chatToSave = initialChatMessages; }
      }
      for (const msg of chatToSave) this.saveChatMessageSync(msg);

      // 9. Finance Settings
      let financeToSave: FinanceSettings = initialFinanceSettings;
      if (!forceInitialDefaults) {
        try {
          const saved = localStorage.getItem(`${LOCAL_STORAGE_KEY}_finance_settings`);
          if (saved) financeToSave = { ...initialFinanceSettings, ...JSON.parse(saved) };
        } catch { financeToSave = initialFinanceSettings; }
      }
      this.saveFinanceSettingsSync(financeToSave);

      // 10. JARVIS Conversations (Voice & Text)
      if (!forceInitialDefaults) {
        try {
          const saved = localStorage.getItem(`${LOCAL_STORAGE_KEY}_jarvis_conversations`);
          if (saved) {
            const parsed: JarvisConversation[] = JSON.parse(saved);
            if (Array.isArray(parsed)) {
              for (const conv of parsed) {
                this.saveJarvisConversationSync(conv);
              }
            }
          }
        } catch {
          // Ignore malformed localStorage cache
        }
      }

      // Mark migration done
      this.db!.run(
        "INSERT OR REPLACE INTO meta_info (key, value) VALUES ('migration_status', 'completed_securely'), ('engine', 'sqlite-3.x-wasm'), ('schema_version', '4'), ('migrated_at', ?)",
        [new Date().toISOString()]
      );
    });

    console.log('[Ketrika SQLite] Migration transaction committed successfully.');
  }

  private runInTransactionOn<T>(targetDb: Database, action: () => T): T {
    const savepoint = `sp_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
    try {
      targetDb.run(`SAVEPOINT ${savepoint};`);
      const result = action();
      targetDb.run(`RELEASE SAVEPOINT ${savepoint};`);
      return result;
    } catch (err) {
      try {
        targetDb.run(`ROLLBACK TO SAVEPOINT ${savepoint};`);
      } catch (rollbackErr) {
        console.error('[Ketrika SQLite] Rollback failure:', rollbackErr);
      }
      throw err;
    }
  }

  // Execute an action wrapped in an SQLite Savepoint (Atomic Rollback on Error)
  private runInTransaction<T>(action: () => T): T {
    if (!this.db) throw new Error("SQLite database not initialized");
    return this.runInTransactionOn(this.db, action);
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
    if (!this.db || !this.isInitialized) return;
    if (this.persistDebounceTimer) {
      clearTimeout(this.persistDebounceTimer);
      this.persistDebounceTimer = null;
    }
    void this.enqueuePersistTask();
  }

  private flushPersistenceSync() {
    if (!this.db || !this.isInitialized) return;
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
    const sortOrder = this.computeSortOrder(p.id, false, undefined, true);
    this.db.run(
      `INSERT OR REPLACE INTO projects 
       (id, title, description, startDate, endDate, priority, status, progress, category, image, isArchived, tasks_json, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, COALESCE((SELECT sort_order FROM projects WHERE id = ?), ?))`,
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
        JSON.stringify(Array.isArray(p.tasks) ? p.tasks : []),
        p.id,
        sortOrder
      ]
    );
  }

  private saveTaskSync(t: Task) {
    if (!this.db) return;
    const sortOrder = this.computeSortOrder(t.id, false, undefined, true);
    this.db.run(
      `INSERT OR REPLACE INTO tasks
       (id, title, description, category, priority, status, projectTitle, startDate, dueDate, dueTime, createdAt, completed, isOverdue, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, COALESCE((SELECT sort_order FROM tasks WHERE id = ?), ?))`,
      [
        t.id,
        t.title,
        t.description || '',
        t.category || 'Organisation',
        t.priority || 'Moyenne',
        t.status || 'À faire',
        t.projectTitle || '',
        t.startDate || t.createdAt || '',
        t.dueDate || '',
        t.dueTime || '',
        t.createdAt || '',
        t.completed ? 1 : 0,
        t.isOverdue ? 1 : 0,
        t.id,
        sortOrder
      ]
    );
  }

  private saveNoteSync(n: Note) {
    if (!this.db) return;
    const sortOrder = this.computeSortOrder(n.id, false, undefined, true);
    this.db.run(
      `INSERT OR REPLACE INTO notes
       (id, title, content, isFavorite, isPinned, isArchived, createdAt, updatedAt, category, image, checklist_json, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, COALESCE((SELECT sort_order FROM notes WHERE id = ?), ?))`,
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
        JSON.stringify(Array.isArray(n.checklist) ? n.checklist : []),
        n.id,
        sortOrder
      ]
    );
  }

  private saveJobSync(j: Job) {
    if (!this.db) return;
    const sortOrder = this.computeSortOrder(j.id, false, undefined, true);
    this.db.run(
      `INSERT OR REPLACE INTO jobs
       (id, title, company, location, salary, contract, workMode, rating, experience, description, isFavorite, logo, applied, appliedCv, appliedCoverNote, appliedAt, postedDate, deadlineDate, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, COALESCE((SELECT sort_order FROM jobs WHERE id = ?), ?))`,
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
        j.appliedCv || '',
        j.appliedCoverNote || '',
        j.appliedAt || '',
        j.postedDate || '',
        j.deadlineDate || '',
        j.id,
        sortOrder
      ]
    );
  }

  private saveTransactionSync(tx: Transaction) {
    if (!this.db) return;
    const sortOrder = this.computeSortOrder(tx.id, false, undefined, true);
    this.db.run(
      `INSERT OR REPLACE INTO transactions
       (id, title, type, category, amount, date, source, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, COALESCE((SELECT sort_order FROM transactions WHERE id = ?), ?))`,
      [
        tx.id,
        tx.title,
        tx.type || 'Dépense',
        tx.category || 'Divers',
        Number(tx.amount || 0),
        tx.date || '',
        tx.source || 'Espèces',
        tx.id,
        sortOrder
      ]
    );
  }

  private saveNotificationSync(n: NotificationItem) {
    if (!this.db) return;
    const sortOrder = this.computeSortOrder(n.id, false, undefined, true);
    this.db.run(
      `INSERT OR REPLACE INTO notifications
       (id, title, description, category, time, isRead, isRecent, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, COALESCE((SELECT sort_order FROM notifications WHERE id = ?), ?))`,
      [
        n.id,
        n.title,
        n.description || '',
        n.category || 'task',
        n.time || '',
        n.isRead ? 1 : 0,
        n.isRecent ? 1 : 0,
        n.id,
        sortOrder
      ]
    );
  }

  private saveProfileSync(p: UserProfile) {
    if (!this.db) return;
    const extendedPayload = {
      birthDate: p.birthDate ?? '',
      city: p.city ?? '',
      country: p.country ?? '',
      currentStatus: p.currentStatus ?? '',
      bio: p.bio ?? '',
      professionalProfile: p.professionalProfile,
      experiences: p.experiences,
      educations: p.educations,
      skills: p.skills,
      languages: p.languages,
      portfolioLinks: p.portfolioLinks,
      additionalInfo: p.additionalInfo,
    };
    this.db.run(
      `INSERT OR REPLACE INTO user_profile
       (id, name, email, phone, address, isPremium, avatarUrl, notificationsEnabled, documents_json, extended_json)
       VALUES ('main_user', ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        p.name || 'Tsiry Randria',
        p.email || '',
        p.phone || '',
        p.address || '',
        p.isPremium ? 1 : 0,
        p.avatarUrl || '',
        p.notificationsEnabled ? 1 : 0,
        JSON.stringify(Array.isArray(p.documents) ? p.documents : []),
        JSON.stringify(extendedPayload)
      ]
    );
  }

  private saveChatMessageSync(m: ChatMessage) {
    if (!this.db) return;
    const sortOrder = this.computeSortOrder(m.id, true, undefined, true);
    this.db.run(
      `INSERT OR REPLACE INTO chat_messages (id, role, text, timestamp, attachment, sort_order)
       VALUES (?, ?, ?, ?, ?, COALESCE((SELECT sort_order FROM chat_messages WHERE id = ?), ?))`,
      [
        m.id,
        m.role,
        m.text || '',
        m.timestamp || '',
        m.attachment || '',
        m.id,
        sortOrder
      ]
    );
  }

  private saveFinanceSettingsSync(s: FinanceSettings) {
    if (!this.db) return;
    this.db.run(
      `INSERT OR REPLACE INTO finance_settings (id, monthlyBudgetMax, savingsGoalCurrent, savingsGoalTarget)
       VALUES ('default', ?, ?, ?)`,
      [
        Math.max(0, Number(s.monthlyBudgetMax ?? initialFinanceSettings.monthlyBudgetMax)),
        Math.max(0, Number(s.savingsGoalCurrent ?? initialFinanceSettings.savingsGoalCurrent)),
        Math.max(0, Number(s.savingsGoalTarget ?? initialFinanceSettings.savingsGoalTarget)),
      ]
    );
  }

  private saveJarvisConversationSync(c: JarvisConversation) {
    if (!this.db) return;
    const parsedTs = Date.parse(c.updatedAt || c.createdAt || '');
    const sortOrder = Number.isFinite(parsedTs)
      ? parsedTs
      : this.computeSortOrder(c.id, false, undefined, true);
    const normalizedMode: JarvisConversationMode = c.mode === 'voice' ? 'voice' : 'text';
    this.db.run(
      `INSERT OR REPLACE INTO jarvis_conversations
       (id, mode, title, preview, createdAt, updatedAt, dateLabel, timeLabel, messages_json, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        c.id,
        normalizedMode,
        c.title || (normalizedMode === 'voice' ? 'Session vocale' : 'Conversation écrite'),
        c.preview || '',
        c.createdAt || '',
        c.updatedAt || '',
        c.dateLabel || '',
        c.timeLabel || '',
        JSON.stringify(Array.isArray(c.messages) ? c.messages : []),
        sortOrder,
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
    if (!this.db || !this.isInitialized) return initialProjects;
    try {
      const res = this.db.exec("SELECT * FROM projects ORDER BY progress ASC, sort_order DESC, rowid DESC");
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
    if (!this.db || !this.isInitialized) return initialTasks;
    try {
      const res = this.db.exec("SELECT * FROM tasks ORDER BY completed ASC, sort_order DESC, rowid DESC");
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
          startDate: String(obj.startDate || obj.createdAt || ''),
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
    if (!this.db || !this.isInitialized) return initialNotes;
    try {
      const res = this.db.exec("SELECT * FROM notes ORDER BY isPinned DESC, sort_order DESC, rowid DESC");
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
    if (!this.db || !this.isInitialized) return initialJobs;
    try {
      const res = this.db.exec("SELECT * FROM jobs ORDER BY sort_order DESC, rowid DESC");
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
          appliedCv: obj.appliedCv ? String(obj.appliedCv) : undefined,
          appliedCoverNote: obj.appliedCoverNote ? String(obj.appliedCoverNote) : undefined,
          appliedAt: obj.appliedAt ? String(obj.appliedAt) : undefined,
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
    if (!this.db || !this.isInitialized) return initialTransactions;
    try {
      const res = this.db.exec("SELECT * FROM transactions ORDER BY sort_order DESC, rowid DESC");
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
    if (!this.db || !this.isInitialized) return initialNotifications;
    try {
      const res = this.db.exec("SELECT * FROM notifications ORDER BY sort_order DESC, rowid DESC");
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
    if (!this.db || !this.isInitialized) return initialProfile;
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

      let extended: any = {};
      try {
        extended = obj.extended_json ? JSON.parse(obj.extended_json) : {};
      } catch { extended = {}; }

      return {
        ...initialProfile,
        name: String(obj.name || initialProfile.name),
        email: String(obj.email || initialProfile.email),
        phone: String(obj.phone || initialProfile.phone),
        address: String(obj.address || initialProfile.address),
        isPremium: Boolean(Number(obj.isPremium)),
        avatarUrl: this.sanitizeLegacyUrl(obj.avatarUrl) || '/assets/images/avatar_user.jpg',
        notificationsEnabled: Boolean(Number(obj.notificationsEnabled)),
        documents,
        birthDate: extended.birthDate !== undefined ? extended.birthDate : initialProfile.birthDate,
        city: extended.city !== undefined ? extended.city : initialProfile.city,
        country: extended.country !== undefined ? extended.country : initialProfile.country,
        currentStatus: extended.currentStatus !== undefined ? extended.currentStatus : initialProfile.currentStatus,
        bio: extended.bio !== undefined ? extended.bio : initialProfile.bio,
        professionalProfile: extended.professionalProfile || initialProfile.professionalProfile,
        experiences: Array.isArray(extended.experiences) ? extended.experiences : initialProfile.experiences,
        educations: Array.isArray(extended.educations) ? extended.educations : initialProfile.educations,
        skills: Array.isArray(extended.skills) ? extended.skills : initialProfile.skills,
        languages: Array.isArray(extended.languages) ? extended.languages : initialProfile.languages,
        portfolioLinks: extended.portfolioLinks || initialProfile.portfolioLinks,
        additionalInfo: extended.additionalInfo || initialProfile.additionalInfo,
      };
    } catch (e) {
      console.error('[Ketrika SQLite] Error reading profile:', e);
      return initialProfile;
    }
  }

  getChatMessages(): ChatMessage[] {
    if (!this.db || !this.isInitialized) return initialChatMessages;
    try {
      const res = this.db.exec("SELECT * FROM chat_messages ORDER BY sort_order ASC, rowid ASC");
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

  getFinanceSettings(): FinanceSettings {
    if (!this.db || !this.isInitialized) return initialFinanceSettings;
    try {
      const res = this.db.exec("SELECT * FROM finance_settings WHERE id = 'default'");
      if (res.length === 0 || !res[0].values || res[0].values.length === 0) {
        return initialFinanceSettings;
      }
      const cols = res[0].columns;
      const row = res[0].values[0];
      const obj: any = {};
      cols.forEach((col, idx) => { obj[col] = row[idx]; });
      return {
        monthlyBudgetMax: obj.monthlyBudgetMax !== undefined && obj.monthlyBudgetMax !== null ? Number(obj.monthlyBudgetMax) : initialFinanceSettings.monthlyBudgetMax,
        savingsGoalCurrent: obj.savingsGoalCurrent !== undefined && obj.savingsGoalCurrent !== null ? Number(obj.savingsGoalCurrent) : initialFinanceSettings.savingsGoalCurrent,
        savingsGoalTarget: obj.savingsGoalTarget !== undefined && obj.savingsGoalTarget !== null ? Number(obj.savingsGoalTarget) : initialFinanceSettings.savingsGoalTarget,
      };
    } catch (e) {
      console.error('[Ketrika SQLite] Error reading finance settings:', e);
      return initialFinanceSettings;
    }
  }

  getJarvisConversations(): JarvisConversation[] {
    if (!this.db || !this.isInitialized) return [];
    try {
      const res = this.db.exec("SELECT * FROM jarvis_conversations ORDER BY sort_order DESC, rowid DESC");
      if (res.length === 0 || !res[0].values) return [];
      const cols = res[0].columns;
      return res[0].values.map(row => {
        const obj: any = {};
        cols.forEach((col, idx) => { obj[col] = row[idx]; });
        let messages: ChatMessage[] = [];
        try {
          messages = obj.messages_json ? JSON.parse(obj.messages_json) : [];
        } catch { messages = []; }

        const mode: JarvisConversationMode = obj.mode === 'voice' ? 'voice' : 'text';
        return {
          id: String(obj.id),
          mode,
          title: String(obj.title || (mode === 'voice' ? 'Conversation vocale' : 'Conversation écrite')),
          preview: String(obj.preview || ''),
          createdAt: String(obj.createdAt || ''),
          updatedAt: String(obj.updatedAt || ''),
          dateLabel: String(obj.dateLabel || ''),
          timeLabel: String(obj.timeLabel || ''),
          messages: Array.isArray(messages) ? messages : [],
        };
      });
    } catch (e) {
      console.error('[Ketrika SQLite] Error reading jarvis_conversations:', e);
      return [];
    }
  }

  // Safe async readers that await initialization & all pending write operations
  async readWhenReady<T>(reader: () => T): Promise<T> {
    await this.waitForPendingOperations();
    return reader();
  }

  async readAllWhenReady() {
    await this.waitForPendingOperations();
    return {
      projects: this.getProjects(),
      tasks: this.getTasks(),
      notes: this.getNotes(),
      jobs: this.getJobs(),
      transactions: this.getTransactions(),
      financeSettings: this.getFinanceSettings(),
      notifications: this.getNotifications(),
      profile: this.getProfile(),
      chatMessages: this.getChatMessages(),
      jarvisConversations: this.getJarvisConversations(),
    };
  }

  // ==========================================
  // PUBLIC API: WRITE / CRUD (SERIALIZED & TRANSACTION PROTECTED)
  // ==========================================

  async saveProject(p: Project): Promise<void> {
    return this.enqueueOperation(async () => {
      this.runInTransaction(() => {
        this.saveProjectSync(p);
      });
      await this.persist();
    });
  }

  async deleteProject(id: string): Promise<void> {
    return this.enqueueOperation(async () => {
      if (!this.db) return;
      this.runInTransaction(() => {
        this.db!.run("DELETE FROM projects WHERE id = ?", [id]);
      });
      await this.persist();
    });
  }

  async saveTask(t: Task): Promise<void> {
    return this.enqueueOperation(async () => {
      this.runInTransaction(() => {
        this.saveTaskSync(t);
      });
      await this.persist();
    });
  }

  async deleteTask(id: string): Promise<void> {
    return this.enqueueOperation(async () => {
      if (!this.db) return;
      this.runInTransaction(() => {
        this.db!.run("DELETE FROM tasks WHERE id = ?", [id]);
      });
      await this.persist();
    });
  }

  async saveNote(n: Note): Promise<void> {
    return this.enqueueOperation(async () => {
      this.runInTransaction(() => {
        this.saveNoteSync(n);
      });
      await this.persist();
    });
  }

  async deleteNote(id: string): Promise<void> {
    return this.enqueueOperation(async () => {
      if (!this.db) return;
      this.runInTransaction(() => {
        this.db!.run("DELETE FROM notes WHERE id = ?", [id]);
      });
      await this.persist();
    });
  }

  async saveJob(j: Job): Promise<void> {
    return this.enqueueOperation(async () => {
      this.runInTransaction(() => {
        this.saveJobSync(j);
      });
      await this.persist();
    });
  }

  async saveTransaction(tx: Transaction): Promise<void> {
    return this.enqueueOperation(async () => {
      this.runInTransaction(() => {
        this.saveTransactionSync(tx);
      });
      await this.persist();
    });
  }

  async deleteTransaction(id: string): Promise<void> {
    return this.enqueueOperation(async () => {
      if (!this.db) return;
      this.runInTransaction(() => {
        this.db!.run("DELETE FROM transactions WHERE id = ?", [id]);
      });
      await this.persist();
    });
  }

  async saveNotification(n: NotificationItem): Promise<void> {
    return this.enqueueOperation(async () => {
      this.runInTransaction(() => {
        this.saveNotificationSync(n);
      });
      await this.persist();
    });
  }

  async deleteNotification(id: string): Promise<void> {
    return this.enqueueOperation(async () => {
      if (!this.db) return;
      this.runInTransaction(() => {
        this.db!.run("DELETE FROM notifications WHERE id = ?", [id]);
      });
      await this.persist();
    });
  }

  async clearNotifications(): Promise<void> {
    return this.enqueueOperation(async () => {
      if (!this.db) return;
      this.runInTransaction(() => {
        this.db!.run("DELETE FROM notifications;");
      });
      await this.persist();
    });
  }

  async saveProfile(p: UserProfile): Promise<void> {
    return this.enqueueOperation(async () => {
      this.runInTransaction(() => {
        this.saveProfileSync(p);
      });
      await this.persist();
    });
  }

  async saveChatMessage(m: ChatMessage): Promise<void> {
    return this.enqueueOperation(async () => {
      this.runInTransaction(() => {
        this.saveChatMessageSync(m);
      });
      await this.persist();
    });
  }

  async clearChatMessages(): Promise<void> {
    return this.enqueueOperation(async () => {
      if (!this.db) return;
      this.runInTransaction(() => {
        this.db!.run("DELETE FROM chat_messages;");
        if (initialChatMessages[0]) {
          this.saveChatMessageSync(initialChatMessages[0]);
        }
      });
      await this.persist();
    });
  }

  async saveFinanceSettings(s: FinanceSettings): Promise<void> {
    return this.enqueueOperation(async () => {
      this.runInTransaction(() => {
        this.saveFinanceSettingsSync(s);
      });
      await this.persist();
    });
  }

  async saveJarvisConversation(c: JarvisConversation): Promise<void> {
    return this.enqueueOperation(async () => {
      this.runInTransaction(() => {
        this.saveJarvisConversationSync(c);
      });
      await this.persist();
    });
  }

  async deleteJarvisConversation(id: string): Promise<void> {
    return this.enqueueOperation(async () => {
      if (!this.db) return;
      this.runInTransaction(() => {
        this.db!.run("DELETE FROM jarvis_conversations WHERE id = ?", [id]);
      });
      await this.persist();
    });
  }

  async clearJarvisConversations(mode?: JarvisConversationMode): Promise<void> {
    return this.enqueueOperation(async () => {
      if (!this.db) return;
      this.runInTransaction(() => {
        if (mode) {
          this.db!.run("DELETE FROM jarvis_conversations WHERE mode = ?", [mode]);
        } else {
          this.db!.run("DELETE FROM jarvis_conversations;");
        }
      });
      await this.persist();
    });
  }

  async resetDatabase(): Promise<void> {
    return this.enqueueOperation(async () => {
      if (!this.db) return;
      this.runInTransaction(() => {
        this.db!.run(`
          DELETE FROM projects;
          DELETE FROM tasks;
          DELETE FROM notes;
          DELETE FROM jobs;
          DELETE FROM transactions;
          DELETE FROM finance_settings;
          DELETE FROM notifications;
          DELETE FROM user_profile;
          DELETE FROM chat_messages;
          DELETE FROM jarvis_conversations;
          DELETE FROM meta_info;
        `);
        this.runSafeMigrationSync(true);
      });
      await this.persistImmediately();
    });
  }

  // Export native SQLite database file (.db)
  exportSqliteBinary(): Uint8Array | null {
    if (!this.db || !this.isInitialized) return null;
    try {
      const binary = this.db.export();
      return isValidSqliteBinary(binary) ? binary : null;
    } catch {
      return null;
    }
  }

  // Import SQLite file from user upload with thorough header, integrity, and atomic schema migration checks
  async importSqliteBinary(bytes: Uint8Array): Promise<boolean> {
    return this.enqueueOperation(async () => {
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
          candidateDb.close();
          return false;
        }

        // Apply schema & sort_order migrations on candidateDb BEFORE swapping active db reference
        this.ensureSchemaAndMigrateSync(candidateDb);

        const oldDb = this.db;
        this.db = candidateDb;
        this.configurePragmas();
        this.isInitialized = true;
        await this.persistImmediately();
        if (oldDb && oldDb !== candidateDb) {
          try { oldDb.close(); } catch {}
        }
        console.log('[Ketrika SQLite] Imported SQLite database verified and persisted.');
        return true;
      } catch (e) {
        console.error('[Ketrika SQLite] Failed to import SQLite binary:', e);
        return false;
      }
    });
  }

  // Live Stats for UI with integrity healthcheck
  getDatabaseStats() {
    if (!this.db || !this.isInitialized) {
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
        jarvisConversationsCount: 0,
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
      jarvisConversationsCount: count('jarvis_conversations'),
      sizeInKb,
      engine: 'SQLite 3.x (Atomic Savepoints)',
      storage: 'IndexedDB Dual-Snapshot + Checksums',
    };
  }
}

export const sqliteService = new SQLiteService();
