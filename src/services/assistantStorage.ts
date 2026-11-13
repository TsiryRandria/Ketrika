import type { Conversation } from '../components/assistant/types';

/**
 * Stockage additif des conversations de l'assistant.
 * Base IndexedDB dédiée : n'affecte ni SQLite, ni chat_messages, ni l'export/import .db.
 * Repli sur localStorage si IndexedDB est indisponible.
 */
const DB_NAME = 'ketrika_assistant_v1';
const STORE = 'conversations';
const LS_KEY = 'ketrika_assistant_conversations_v1';
const MIGRATION_FLAG = 'ketrika_assistant_legacy_migrated_v1';

const openDb = (): Promise<IDBDatabase> =>
  new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB indisponible'));
      return;
    }
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) {
        req.result.createObjectStore(STORE, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

const lsRead = (): Conversation[] => {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? (JSON.parse(raw) as Conversation[]) : [];
  } catch {
    return [];
  }
};

const lsWrite = (list: Conversation[]) => {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(list));
  } catch {
    // quota : on ignore, les données restent en mémoire pour la session
  }
};

export const assistantStorage = {
  async loadAll(): Promise<Conversation[]> {
    try {
      const db = await openDb();
      return await new Promise<Conversation[]>((resolve, reject) => {
        const req = db.transaction(STORE, 'readonly').objectStore(STORE).getAll();
        req.onsuccess = () => resolve((req.result as Conversation[]).sort((a, b) => b.updatedAt - a.updatedAt));
        req.onerror = () => reject(req.error);
      });
    } catch {
      return lsRead().sort((a, b) => b.updatedAt - a.updatedAt);
    }
  },

  async save(conv: Conversation): Promise<void> {
    try {
      const db = await openDb();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE, 'readwrite');
        tx.objectStore(STORE).put(conv);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch {
      const list = lsRead().filter((c) => c.id !== conv.id);
      list.push(conv);
      lsWrite(list);
    }
  },

  async remove(id: string): Promise<void> {
    try {
      const db = await openDb();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE, 'readwrite');
        tx.objectStore(STORE).delete(id);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch {
      lsWrite(lsRead().filter((c) => c.id !== id));
    }
  },

  isLegacyMigrated(): boolean {
    try {
      return localStorage.getItem(MIGRATION_FLAG) === '1';
    } catch {
      return true;
    }
  },

  markLegacyMigrated() {
    try {
      localStorage.setItem(MIGRATION_FLAG, '1');
    } catch {
      // ignore
    }
  },
};
