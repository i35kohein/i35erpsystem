import { initializeApp } from 'firebase/app';
import { 
  initializeFirestore, 
  collection, 
  onSnapshot, 
  doc, 
  setDoc, 
  deleteDoc, 
  getDocs, 
  writeBatch 
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import config from '../../firebase-applet-config.json';
import { 
  idbGetAll, 
  idbPutBatch, 
  idbPut, 
  idbDelete, 
  idbClearStore, 
  idbAddToSyncQueue, 
  idbGetSyncQueue, 
  idbRemoveSyncQueueItem,
  STORES
} from './indexedDB';

const app = initializeApp(config);

const dbId = (config as any).firestoreDatabaseId;
export const db = initializeFirestore(
  app,
  {
    experimentalForceLongPolling: true,
  },
  dbId || '(default)'
);
export const auth = getAuth(app);

// Helper to sanitize objects for Firestore (removes undefined fields which cause setDoc to fail)
export function sanitizeForFirestore<T>(obj: T): T {
  if (obj === undefined) return null as any;
  if (obj === null || typeof obj !== 'object') return obj;

  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeForFirestore(item)) as any;
  }

  const clean: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      clean[key] = sanitizeForFirestore(value);
    }
  }
  return clean as T;
}

// Local Storage Fallback Helpers
function getLocalCollection<T>(collectionName: string): T[] | null {
  try {
    const raw = localStorage.getItem(`app_data_${collectionName}`);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error(`Error reading local storage for ${collectionName}:`, e);
  }
  return null;
}

function saveLocalCollection<T>(collectionName: string, items: T[]): void {
  try {
    localStorage.setItem(`app_data_${collectionName}`, JSON.stringify(items));
  } catch (e) {
    console.error(`Error saving local storage for ${collectionName}:`, e);
  }
}

// Dispatch Real-time Sync Status Event to App UI
export function notifySyncStatus(status: {
  isOnline: boolean;
  pendingCount: number;
  isSyncing: boolean;
  lastSyncedAt?: number;
}) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('erp-offline-sync-status', { detail: status })
    );
  }
}

let isSyncingActive = false;

// Process IndexedDB Offline Queue to Firestore
export async function syncOfflineQueueToFirestore(): Promise<{ syncedCount: number; remainingCount: number }> {
  if (typeof window === 'undefined' || !navigator.onLine) {
    const pending = await idbGetSyncQueue();
    notifySyncStatus({
      isOnline: false,
      pendingCount: pending.length,
      isSyncing: false,
    });
    return { syncedCount: 0, remainingCount: pending.length };
  }

  if (isSyncingActive) {
    const pending = await idbGetSyncQueue();
    return { syncedCount: 0, remainingCount: pending.length };
  }

  isSyncingActive = true;
  let syncedCount = 0;

  try {
    const queue = await idbGetSyncQueue();
    if (queue.length === 0) {
      notifySyncStatus({
        isOnline: true,
        pendingCount: 0,
        isSyncing: false,
        lastSyncedAt: Date.now(),
      });
      isSyncingActive = false;
      return { syncedCount: 0, remainingCount: 0 };
    }

    notifySyncStatus({
      isOnline: true,
      pendingCount: queue.length,
      isSyncing: true,
    });

    for (const item of queue) {
      if (!item.queueId) continue;
      try {
        if (item.action === 'save') {
          const docRef = doc(db, item.collectionName, item.data.id);
          const cleanedData = sanitizeForFirestore(item.data);
          await setDoc(docRef, cleanedData, { merge: true });
        } else if (item.action === 'batch' && Array.isArray(item.data)) {
          const batch = writeBatch(db);
          item.data.forEach((d: any) => {
            const docRef = doc(db, item.collectionName, d.id);
            batch.set(docRef, sanitizeForFirestore(d), { merge: true });
          });
          await batch.commit();
        } else if (item.action === 'delete') {
          const docRef = doc(db, item.collectionName, item.data.id);
          await deleteDoc(docRef);
        }

        // Successfully synced to cloud, remove from IndexedDB queue
        await idbRemoveSyncQueueItem(item.queueId);
        syncedCount++;
      } catch (err) {
        console.warn(`Error syncing queued item ${item.queueId} to Firestore:`, err);
        // Stop processing rest if network connection broke mid-sync
        if (!navigator.onLine) break;
      }
    }

    const remaining = await idbGetSyncQueue();
    notifySyncStatus({
      isOnline: navigator.onLine,
      pendingCount: remaining.length,
      isSyncing: false,
      lastSyncedAt: Date.now(),
    });

    isSyncingActive = false;
    return { syncedCount, remainingCount: remaining.length };
  } catch (err) {
    console.error('Failed processing offline queue:', err);
    isSyncingActive = false;
    const remaining = await idbGetSyncQueue();
    notifySyncStatus({
      isOnline: navigator.onLine,
      pendingCount: remaining.length,
      isSyncing: false,
    });
    return { syncedCount, remainingCount: remaining.length };
  }
}

// Auto-trigger sync when connectivity is restored
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    console.log('📶 Internet connection restored. Processing IndexedDB offline queue...');
    syncOfflineQueueToFirestore();
  });

  window.addEventListener('offline', () => {
    console.warn('⚡ Application switched to OFFLINE mode. All writes will be stored in IndexedDB.');
    idbGetSyncQueue().then((pending) => {
      notifySyncStatus({
        isOnline: false,
        pendingCount: pending.length,
        isSyncing: false,
      });
    });
  });
}

// Real-time collection subscription prioritizing IndexedDB for instantaneous offline & online loads
export function subscribeToCollection<T extends { id: string }>(
  collectionName: string,
  onData: (data: T[]) => void,
  initialSeedData?: T[]
) {
  const seededKey = `firebase_seeded_${collectionName}`;
  const alreadySeeded = localStorage.getItem(seededKey) === 'true';

  // 1. Immediately load data from IndexedDB (or localStorage fallback) so UI opens instantly offline
  (async () => {
    const idbItems = await idbGetAll<T>(collectionName);
    if (idbItems && idbItems.length > 0) {
      onData(idbItems);
    } else {
      const localItems = getLocalCollection<T>(collectionName);
      if (alreadySeeded || localItems !== null) {
        onData(localItems || []);
        if (localItems && localItems.length > 0 && STORES.includes(collectionName)) {
          idbPutBatch(collectionName, localItems);
        }
      } else if (initialSeedData && initialSeedData.length > 0) {
        localStorage.setItem(seededKey, 'true');
        saveLocalCollection(collectionName, initialSeedData);
        if (STORES.includes(collectionName)) {
          idbPutBatch(collectionName, initialSeedData);
        }
        onData(initialSeedData);
      }
    }
  })();

  const colRef = collection(db, collectionName);

  // 2. Listen for live updates from Firestore when online
  const unsubscribe = onSnapshot(
    colRef,
    async (snapshot) => {
      const isSeeded = localStorage.getItem(seededKey) === 'true';

      if (snapshot.empty && !isSeeded && initialSeedData && initialSeedData.length > 0) {
        // Auto-seed database collection if empty on initial startup
        try {
          localStorage.setItem(seededKey, 'true');
          const batch = writeBatch(db);
          initialSeedData.forEach((item) => {
            const cleanedItem = sanitizeForFirestore(item);
            const itemRef = doc(db, collectionName, item.id);
            batch.set(itemRef, cleanedItem);
          });
          await batch.commit();
          saveLocalCollection(collectionName, initialSeedData);
          if (STORES.includes(collectionName)) {
            await idbPutBatch(collectionName, initialSeedData);
          }
          onData(initialSeedData);
        } catch (err) {
          console.error(`Error seeding ${collectionName}:`, err);
          const idbFallback = await idbGetAll<T>(collectionName);
          onData(idbFallback.length > 0 ? idbFallback : initialSeedData);
        }
      } else if (!snapshot.empty) {
        localStorage.setItem(seededKey, 'true');
        const items: T[] = [];
        snapshot.forEach((docSnap) => {
          items.push({ ...(docSnap.data() as T), id: docSnap.id });
        });
        saveLocalCollection(collectionName, items);
        if (STORES.includes(collectionName)) {
          await idbPutBatch(collectionName, items);
        }
        onData(items);
      } else {
        localStorage.setItem(seededKey, 'true');
        saveLocalCollection(collectionName, []);
        if (STORES.includes(collectionName)) {
          await idbClearStore(collectionName);
        }
        onData([]);
      }
    },
    async (error) => {
      console.warn(`Firestore subscription offline fallback for ${collectionName}:`, error);
      const idbFallback = await idbGetAll<T>(collectionName);
      if (idbFallback && idbFallback.length > 0) {
        onData(idbFallback);
      } else {
        const currentLocal = getLocalCollection<T>(collectionName);
        onData(currentLocal !== null ? currentLocal : initialSeedData || []);
      }
    }
  );

  return unsubscribe;
}

// Clear all documents in a collection
export async function clearCollection(collectionName: string): Promise<void> {
  saveLocalCollection(collectionName, []);
  if (STORES.includes(collectionName)) {
    await idbClearStore(collectionName);
  }
  const seededKey = `firebase_seeded_${collectionName}`;
  localStorage.setItem(seededKey, 'true');

  if (!navigator.onLine) {
    console.warn(`Offline clear queued for ${collectionName}`);
    return;
  }

  try {
    const colRef = collection(db, collectionName);
    const snapshot = await getDocs(colRef);
    if (snapshot.empty) return;

    const batch = writeBatch(db);
    snapshot.forEach((docSnap) => {
      batch.delete(docSnap.ref);
    });
    await batch.commit();
  } catch (err) {
    console.warn(`Firestore clear warning for ${collectionName}:`, err);
  }
}

// Upsert document to IndexedDB, Local Storage, and Firestore (or Sync Queue if offline)
export async function saveDocument<T extends { id: string }>(
  collectionName: string,
  data: T
): Promise<void> {
  // 1. Immediately write to IndexedDB & Local Storage so UI updates seamlessly
  if (STORES.includes(collectionName)) {
    await idbPut(collectionName, data);
  }

  try {
    const localItems = getLocalCollection<T>(collectionName) || [];
    const idx = localItems.findIndex((x) => x.id === data.id);
    let updatedLocal: T[];
    if (idx >= 0) {
      updatedLocal = [...localItems];
      updatedLocal[idx] = { ...updatedLocal[idx], ...data };
    } else {
      updatedLocal = [data, ...localItems];
    }
    saveLocalCollection(collectionName, updatedLocal);
  } catch (e) {
    console.error(`Local save error for ${collectionName}:`, e);
  }

  // 2. If offline, add to IndexedDB Sync Queue immediately
  if (!navigator.onLine) {
    await idbAddToSyncQueue({ collectionName, action: 'save', data });
    const pending = await idbGetSyncQueue();
    notifySyncStatus({
      isOnline: false,
      pendingCount: pending.length,
      isSyncing: false,
    });
    return;
  }

  // 3. Try live Firestore write
  try {
    const docRef = doc(db, collectionName, data.id);
    const cleanedData = sanitizeForFirestore(data);
    await setDoc(docRef, cleanedData, { merge: true });
  } catch (err) {
    console.warn(`Firestore write failed for ${collectionName}. Queueing into IndexedDB sync queue:`, err);
    await idbAddToSyncQueue({ collectionName, action: 'save', data });
    const pending = await idbGetSyncQueue();
    notifySyncStatus({
      isOnline: navigator.onLine,
      pendingCount: pending.length,
      isSyncing: false,
    });
  }
}

// Upsert multiple documents in batch to IndexedDB, Local Storage, and Firestore
export async function saveBatchDocuments<T extends { id: string }>(
  collectionName: string,
  items: T[]
): Promise<void> {
  if (!items || items.length === 0) return;

  // 1. Immediately write to IndexedDB
  if (STORES.includes(collectionName)) {
    await idbPutBatch(collectionName, items);
  }

  try {
    const localItems = getLocalCollection<T>(collectionName) || [];
    let updatedLocal = [...localItems];
    items.forEach((data) => {
      const idx = updatedLocal.findIndex((x) => x.id === data.id);
      if (idx >= 0) {
        updatedLocal[idx] = { ...updatedLocal[idx], ...data };
      } else {
        updatedLocal = [data, ...updatedLocal];
      }
    });
    saveLocalCollection(collectionName, updatedLocal);
  } catch (e) {
    console.error(`Local saveBatch error for ${collectionName}:`, e);
  }

  // 2. If offline, queue batch write
  if (!navigator.onLine) {
    await idbAddToSyncQueue({ collectionName, action: 'batch', data: items });
    const pending = await idbGetSyncQueue();
    notifySyncStatus({
      isOnline: false,
      pendingCount: pending.length,
      isSyncing: false,
    });
    return;
  }

  // 3. Try live Firestore batch write
  try {
    const batch = writeBatch(db);
    items.forEach((data) => {
      const docRef = doc(db, collectionName, data.id);
      const cleanedData = sanitizeForFirestore(data);
      batch.set(docRef, cleanedData, { merge: true });
    });
    await batch.commit();
  } catch (err) {
    console.warn(`Firestore saveBatch failed for ${collectionName}. Queueing into IndexedDB sync queue:`, err);
    await idbAddToSyncQueue({ collectionName, action: 'batch', data: items });
    const pending = await idbGetSyncQueue();
    notifySyncStatus({
      isOnline: navigator.onLine,
      pendingCount: pending.length,
      isSyncing: false,
    });
  }
}

// Delete document from IndexedDB, Local Storage, and Firestore
export async function deleteDocument(
  collectionName: string,
  id: string
): Promise<void> {
  // 1. Immediately remove from IndexedDB & Local Storage
  if (STORES.includes(collectionName)) {
    await idbDelete(collectionName, id);
  }

  try {
    const localItems = getLocalCollection<any>(collectionName) || [];
    const updatedLocal = localItems.filter((x) => x.id !== id);
    saveLocalCollection(collectionName, updatedLocal);
  } catch (e) {
    console.error(`Local delete error for ${collectionName}:`, e);
  }

  // 2. If offline, queue delete action
  if (!navigator.onLine) {
    await idbAddToSyncQueue({ collectionName, action: 'delete', data: { id } });
    const pending = await idbGetSyncQueue();
    notifySyncStatus({
      isOnline: false,
      pendingCount: pending.length,
      isSyncing: false,
    });
    return;
  }

  // 3. Try live Firestore delete
  try {
    const docRef = doc(db, collectionName, id);
    await deleteDoc(docRef);
  } catch (err) {
    console.warn(`Firestore delete failed for ${collectionName}. Queueing into IndexedDB sync queue:`, err);
    await idbAddToSyncQueue({ collectionName, action: 'delete', data: { id } });
    const pending = await idbGetSyncQueue();
    notifySyncStatus({
      isOnline: navigator.onLine,
      pendingCount: pending.length,
      isSyncing: false,
    });
  }
}
