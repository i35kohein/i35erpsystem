import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import {
  idbAddToSyncQueue,
  idbClearStore,
  idbDelete,
  idbGetAll,
  idbGetSyncQueue,
  idbPut,
  idbPutBatch,
  idbRemoveSyncQueueItem,
  STORES,
} from './indexedDB';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY to .env.local.');
}

type SupabaseGlobal = typeof globalThis & { __i35SupabaseClient?: SupabaseClient };
const supabaseGlobal = globalThis as SupabaseGlobal;

// Reuse the one browser client across Vite hot reloads. Creating a new client
// on each reload can create competing auth/storage listeners and make cloud
// sync status unreliable during live development.
export const supabase = supabaseGlobal.__i35SupabaseClient ?? createClient(
  supabaseUrl.replace(/\/rest\/v1\/?$/, ''),
  supabaseKey,
  { auth: { persistSession: true, autoRefreshToken: true } },
);
supabaseGlobal.__i35SupabaseClient = supabase;

type ErpRecord = {
  collection_name: string;
  id: string;
  data: Record<string, unknown>;
  updated_at?: string;
};

function localKey(collectionName: string) {
  return `app_data_${collectionName}`;
}

function getLocalCollection<T>(collectionName: string): T[] {
  try {
    return JSON.parse(localStorage.getItem(localKey(collectionName)) || '[]');
  } catch {
    return [];
  }
}

function saveLocalCollection<T>(collectionName: string, items: T[]) {
  localStorage.setItem(localKey(collectionName), JSON.stringify(items));
}

// Secrets remain local. Only non-sensitive settings are synchronized to the browser-readable table.
function cloudSafeData<T extends { id: string }>(collectionName: string, data: T): T {
  if (collectionName !== 'systemSettings') return data;
  const {
    aiApiKey: _aiApiKey,
    telegramBotToken: _telegramBotToken,
    ...safe
  } = data as T & { aiApiKey?: string; telegramBotToken?: string };
  return safe as T;
}

function toRows<T extends { id: string }>(collectionName: string, items: T[]): ErpRecord[] {
  return items.map((item) => ({
    collection_name: collectionName,
    id: item.id,
    data: cloudSafeData(collectionName, item) as Record<string, unknown>,
    updated_at: new Date().toISOString(),
  }));
}

export function notifySyncStatus(status: {
  isOnline: boolean;
  pendingCount: number;
  isSyncing: boolean;
  lastSyncedAt?: number;
}) {
  window.dispatchEvent(new CustomEvent('erp-offline-sync-status', { detail: status }));
}

async function persistLocal<T extends { id: string }>(collectionName: string, items: T[]) {
  saveLocalCollection(collectionName, items);
  if (STORES.includes(collectionName)) {
    await idbClearStore(collectionName);
    if (items.length) await idbPutBatch(collectionName, items);
  }
}

async function fetchCloudCollection<T>(collectionName: string): Promise<T[]> {
  const { data, error } = await supabase
    .from('erp_records')
    .select('data')
    .eq('collection_name', collectionName);
  if (error) throw error;
  return (data || []).map((row) => row.data as T);
}

let syncing = false;

export async function syncOfflineQueueToSupabase() {
  const queue = await idbGetSyncQueue();
  if (!navigator.onLine || syncing) {
    notifySyncStatus({ isOnline: navigator.onLine, pendingCount: queue.length, isSyncing: syncing });
    return { syncedCount: 0, remainingCount: queue.length };
  }

  syncing = true;
  let syncedCount = 0;
  notifySyncStatus({ isOnline: true, pendingCount: queue.length, isSyncing: true });

  for (const item of queue) {
    if (!item.queueId) continue;
    try {
      if (item.action === 'delete') {
        const { error } = await supabase
          .from('erp_records')
          .delete()
          .eq('collection_name', item.collectionName)
          .eq('id', item.data.id);
        if (error) throw error;
      } else {
        const items = item.action === 'batch' ? item.data : [item.data];
        const { error } = await supabase.from('erp_records').upsert(toRows(item.collectionName, items), {
          onConflict: 'collection_name,id',
        });
        if (error) throw error;
      }
      await idbRemoveSyncQueueItem(item.queueId);
      syncedCount += 1;
    } catch (error) {
      console.warn('Supabase offline sync paused:', error);
      break;
    }
  }

  syncing = false;
  const remaining = await idbGetSyncQueue();
  notifySyncStatus({
    isOnline: navigator.onLine,
    pendingCount: remaining.length,
    isSyncing: false,
    lastSyncedAt: Date.now(),
  });
  return { syncedCount, remainingCount: remaining.length };
}

// Kept as an alias so existing UI integrations continue to work.
export const syncOfflineQueueToFirestore = syncOfflineQueueToSupabase;

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => void syncOfflineQueueToSupabase());
  window.addEventListener('offline', async () => {
    const pending = await idbGetSyncQueue();
    notifySyncStatus({ isOnline: false, pendingCount: pending.length, isSyncing: false });
  });
}

export function subscribeToCollection<T extends { id: string }>(
  collectionName: string,
  onData: (items: T[]) => void,
  initialSeedData: T[] = []
) {
  let active = true;

  const load = async () => {
    const idbItems = STORES.includes(collectionName) ? await idbGetAll<T>(collectionName) : [];
    const localItems = idbItems.length ? idbItems : getLocalCollection<T>(collectionName);
    const initialItems = localItems.length ? localItems : initialSeedData;
    if (initialItems.length && active) onData(initialItems);

    try {
      const cloudItems = await fetchCloudCollection<T>(collectionName);
      if (!active) return;
      if (cloudItems.length) {
        await persistLocal(collectionName, cloudItems);
        onData(cloudItems);
      } else if (initialItems.length) {
        // First connection migration: preserve current browser records when the cloud is empty.
        const { error } = await supabase.from('erp_records').upsert(toRows(collectionName, initialItems), {
          onConflict: 'collection_name,id',
        });
        if (error) throw error;
        await persistLocal(collectionName, initialItems);
        onData(initialItems);
      } else {
        onData([]);
      }
      notifySyncStatus({ isOnline: true, pendingCount: (await idbGetSyncQueue()).length, isSyncing: false, lastSyncedAt: Date.now() });
    } catch (error) {
      console.warn(`Supabase load fallback for ${collectionName}:`, error);
      if (!initialItems.length && active) onData(initialSeedData);
    }
  };

  void load();

  const channel = supabase
    .channel(`erp-${collectionName}-${Math.random().toString(36).slice(2)}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'erp_records', filter: `collection_name=eq.${collectionName}` },
      async () => {
        if (!active) return;
        try {
          const cloudItems = await fetchCloudCollection<T>(collectionName);
          await persistLocal(collectionName, cloudItems);
          if (active) onData(cloudItems);
        } catch (error) {
          console.warn(`Supabase realtime refresh failed for ${collectionName}:`, error);
        }
      }
    )
    .subscribe();

  return () => {
    active = false;
    void supabase.removeChannel(channel);
  };
}

export async function saveDocument<T extends { id: string }>(collectionName: string, data: T) {
  if (STORES.includes(collectionName)) await idbPut(collectionName, data);
  const localItems = getLocalCollection<T>(collectionName);
  const index = localItems.findIndex((item) => item.id === data.id);
  if (index >= 0) localItems[index] = { ...localItems[index], ...data };
  else localItems.unshift(data);
  saveLocalCollection(collectionName, localItems);

  try {
    const { error } = await supabase.from('erp_records').upsert(toRows(collectionName, [data]), {
      onConflict: 'collection_name,id',
    });
    if (error) throw error;
    const pending = await idbGetSyncQueue();
    notifySyncStatus({
      isOnline: typeof navigator === 'undefined' || navigator.onLine,
      pendingCount: pending.length,
      isSyncing: false,
      lastSyncedAt: Date.now(),
    });
  } catch (error) {
    console.warn(`Supabase save queued for ${collectionName}:`, error);
    await idbAddToSyncQueue({ collectionName, action: 'save', data });
    const pending = await idbGetSyncQueue();
    notifySyncStatus({
      isOnline: typeof navigator === 'undefined' || navigator.onLine,
      pendingCount: pending.length,
      isSyncing: false,
    });
  }
}

export async function saveBatchDocuments<T extends { id: string }>(collectionName: string, items: T[]) {
  if (!items.length) return;
  if (STORES.includes(collectionName)) await idbPutBatch(collectionName, items);
  const merged = new Map(getLocalCollection<T>(collectionName).map((item) => [item.id, item]));
  items.forEach((item) => merged.set(item.id, { ...merged.get(item.id), ...item }));
  saveLocalCollection(collectionName, [...merged.values()]);

  try {
    const { error } = await supabase.from('erp_records').upsert(toRows(collectionName, items), {
      onConflict: 'collection_name,id',
    });
    if (error) throw error;
  } catch (error) {
    console.warn(`Supabase batch queued for ${collectionName}:`, error);
    await idbAddToSyncQueue({ collectionName, action: 'batch', data: items });
  }
}

export async function deleteDocument(collectionName: string, id: string) {
  if (STORES.includes(collectionName)) await idbDelete(collectionName, id);
  saveLocalCollection(collectionName, getLocalCollection<{ id: string }>(collectionName).filter((item) => item.id !== id));

  try {
    const { error } = await supabase
      .from('erp_records')
      .delete()
      .eq('collection_name', collectionName)
      .eq('id', id);
    if (error) throw error;
  } catch (error) {
    console.warn(`Supabase delete queued for ${collectionName}:`, error);
    await idbAddToSyncQueue({ collectionName, action: 'delete', data: { id } });
  }
}

export async function clearCollection(collectionName: string) {
  saveLocalCollection(collectionName, []);
  if (STORES.includes(collectionName)) await idbClearStore(collectionName);
  const { error } = await supabase.from('erp_records').delete().eq('collection_name', collectionName);
  if (error) throw error;
}
