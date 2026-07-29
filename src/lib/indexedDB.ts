// IndexedDB Persistence Layer & Offline Sync Manager for ERP

const DB_NAME = 'AppleRepairERP_DB';
const DB_VERSION = 2;

export const STORES = [
  'workOrders',
  'parts',
  'suppliers',
  'rmas',
  'purchaseOrders',
  'customers',
  'technicians',
  'expenses',
  'supplierDebts',
  'technicianPayouts',
  'users',
  'systemSettings',
  'priceCatalog',
  'priceFolders',
  'priceCategories',
  'syncQueue'
];

export interface SyncQueueItem {
  queueId?: number;
  collectionName: string;
  action: 'save' | 'delete' | 'batch';
  data: any;
  timestamp: number;
}

let dbInstancePromise: Promise<IDBDatabase> | null = null;

export function initIndexedDB(): Promise<IDBDatabase> {
  if (dbInstancePromise) return dbInstancePromise;

  dbInstancePromise = new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !('indexedDB' in window)) {
      reject(new Error('IndexedDB is not supported in this environment'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
      const db = (event.target as IDBOpenDBRequest).result;

      STORES.forEach((storeName) => {
        if (!db.objectStoreNames.contains(storeName)) {
          if (storeName === 'syncQueue') {
            db.createObjectStore(storeName, { keyPath: 'queueId', autoIncrement: true });
          } else {
            db.createObjectStore(storeName, { keyPath: 'id' });
          }
        }
      });
    };

    request.onsuccess = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      db.onversionchange = () => {
        db.close();
        dbInstancePromise = null;
      };
      resolve(db);
    };

    request.onerror = (event) => {
      console.error('IndexedDB open error:', (event.target as IDBOpenDBRequest).error);
      dbInstancePromise = null;
      reject((event.target as IDBOpenDBRequest).error);
    };
  });

  return dbInstancePromise;
}

// Get all items from an IndexedDB store
export async function idbGetAll<T>(storeName: string): Promise<T[]> {
  try {
    const db = await initIndexedDB();
    if (!db.objectStoreNames.contains(storeName)) {
      console.warn(`IndexedDB store "${storeName}" does not exist yet.`);
      return [];
    }
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn(`IndexedDB idbGetAll error for store ${storeName}:`, err);
    return [];
  }
}

// Get single item from store
export async function idbGet<T>(storeName: string, id: string): Promise<T | null> {
  try {
    const db = await initIndexedDB();
    if (!db.objectStoreNames.contains(storeName)) {
      return null;
    }
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn(`IndexedDB idbGet error for store ${storeName}, id ${id}:`, err);
    return null;
  }
}

// Put single item into store
export async function idbPut<T extends { id: string }>(storeName: string, data: T): Promise<void> {
  try {
    const db = await initIndexedDB();
    if (!db.objectStoreNames.contains(storeName)) {
      console.warn(`IndexedDB store "${storeName}" does not exist for put.`);
      return;
    }
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const request = store.put(data);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn(`IndexedDB idbPut error for store ${storeName}:`, err);
  }
}

// Put multiple items in batch into store
export async function idbPutBatch<T extends { id: string }>(storeName: string, items: T[]): Promise<void> {
  if (!items || items.length === 0) return;
  try {
    const db = await initIndexedDB();
    if (!db.objectStoreNames.contains(storeName)) {
      console.warn(`IndexedDB store "${storeName}" does not exist for putBatch.`);
      return;
    }
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);

      items.forEach((item) => {
        store.put(item);
      });

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn(`IndexedDB idbPutBatch error for store ${storeName}:`, err);
  }
}

// Delete single item from store
export async function idbDelete(storeName: string, id: string): Promise<void> {
  try {
    const db = await initIndexedDB();
    if (!db.objectStoreNames.contains(storeName)) {
      return;
    }
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn(`IndexedDB idbDelete error for store ${storeName}, id ${id}:`, err);
  }
}

// Clear store
export async function idbClearStore(storeName: string): Promise<void> {
  try {
    const db = await initIndexedDB();
    if (!db.objectStoreNames.contains(storeName)) {
      return;
    }
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn(`IndexedDB idbClearStore error for store ${storeName}:`, err);
  }
}

// Queue offline sync operation
export async function idbAddToSyncQueue(op: {
  collectionName: string;
  action: 'save' | 'delete' | 'batch';
  data: any;
}): Promise<number> {
  try {
    const db = await initIndexedDB();
    if (!db.objectStoreNames.contains('syncQueue')) {
      return -1;
    }
    return new Promise((resolve, reject) => {
      const tx = db.transaction('syncQueue', 'readwrite');
      const store = tx.objectStore('syncQueue');
      const record: SyncQueueItem = {
        collectionName: op.collectionName,
        action: op.action,
        data: op.data,
        timestamp: Date.now(),
      };
      const request = store.add(record);

      request.onsuccess = () => resolve(request.result as number);
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn('Failed to add to sync queue in IndexedDB:', err);
    return -1;
  }
}

// Get pending sync items
export async function idbGetSyncQueue(): Promise<SyncQueueItem[]> {
  try {
    const db = await initIndexedDB();
    if (!db.objectStoreNames.contains('syncQueue')) {
      return [];
    }
    return new Promise((resolve, reject) => {
      const tx = db.transaction('syncQueue', 'readonly');
      const store = tx.objectStore('syncQueue');
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn('Failed to fetch sync queue from IndexedDB:', err);
    return [];
  }
}

// Remove processed item from sync queue
export async function idbRemoveSyncQueueItem(queueId: number): Promise<void> {
  try {
    const db = await initIndexedDB();
    if (!db.objectStoreNames.contains('syncQueue')) {
      return;
    }
    return new Promise((resolve, reject) => {
      const tx = db.transaction('syncQueue', 'readwrite');
      const store = tx.objectStore('syncQueue');
      const request = store.delete(queueId);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn(`Failed to remove item ${queueId} from sync queue:`, err);
  }
}
