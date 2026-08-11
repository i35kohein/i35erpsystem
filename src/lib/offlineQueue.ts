/**
 * Offline write queue for i35 ERP (bug #1 fix).
 *
 * When the browser is offline (or a Supabase write fails), saves/deletes are
 * queued here in IndexedDB instead of being lost. `flushOfflineQueue()` in
 * lib/supabase.ts replays the queue when connectivity returns.
 */

const DB_NAME = 'i35erp-sync-queue';
const STORE = 'queue';

export type OfflineQueueAction = 'save' | 'batch' | 'delete' | 'clear';

export interface OfflineQueueItem {
  queueId?: number;
  collectionName: string;
  action: OfflineQueueAction;
  /** save → item, batch → item[], delete → { id }, clear → null */
  data: unknown;
  queuedAt: number;
}

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'queueId', autoIncrement: true });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

function runStore<T>(
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(STORE, mode);
        const req = fn(tx.objectStore(STORE));
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      }),
  );
}

export async function addToQueue(
  item: Omit<OfflineQueueItem, 'queueId' | 'queuedAt'>,
): Promise<number> {
  // Coalesce (audit B-2): a newer write for the same document supersedes any
  // older queued copy — replaying a stale snapshot after a successful live
  // retry would permanently regress the record. Deletes supersede saves;
  // saves supersede deletes (re-created doc).
  const existing = await getQueue();
  const idsOf = (data: unknown): string[] => {
    if (!data) return [];
    const arr = Array.isArray(data) ? data : [data];
    return arr.map((d: any) => d?.id).filter(Boolean);
  };
  const touchedIds = new Set(idsOf(item.data));
  const toRemove: number[] = [];
  for (const q of existing) {
    const qIds = idsOf(q.data);
    const overlaps = qIds.some((id) => touchedIds.has(id));
    if (!overlaps) continue; // different document — untouched
    // Overlapping entries: only a delete that comes AFTER our write wins;
    // a save for the same doc is superseded by the newer copy we're adding.
    const incomingIsDelete = item.action === 'delete';
    const existingIsDelete = q.action === 'delete';
    if (incomingIsDelete) {
      // delete wins over stale queued saves; identical delete → drop older
      toRemove.push(q.queueId as number);
      continue;
    }
    if (existingIsDelete) {
      // re-creating a doc that was queued for deletion → drop the old delete
      toRemove.push(q.queueId as number);
      continue;
    }
    // save+batch overlap: older queued write is superseded by the newer one
    toRemove.push(q.queueId as number);
  }
  // Drop superseded entries, then append the newest write (FIFO preserved).
  for (const queueId of toRemove) {
    await removeFromQueue(queueId);
  }
  const queueId = await runStore('readwrite', (store) =>
    store.add({ ...item, queuedAt: Date.now() } as OfflineQueueItem),
  );
  return Number(queueId);
}

export async function getQueue(): Promise<OfflineQueueItem[]> {
  try {
    return await runStore('readonly', (store) => store.getAll());
  } catch (err) {
    console.warn('Offline queue read failed:', err);
    return [];
  }
}

export async function getQueueCount(): Promise<number> {
  try {
    return await runStore('readonly', (store) => store.count());
  } catch {
    return 0;
  }
}

export async function removeFromQueue(queueId: number): Promise<void> {
  await runStore('readwrite', (store) => store.delete(queueId));
}

export async function clearQueue(): Promise<void> {
  await runStore('readwrite', (store) => store.clear());
}
