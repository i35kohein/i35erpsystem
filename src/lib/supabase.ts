import { createClient, type SupabaseClient, type RealtimeChannel } from '@supabase/supabase-js';
import { addToQueue, getQueue, getQueueCount, removeFromQueue, type OfflineQueueItem } from './offlineQueue';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY to .env.local.');
}

type SupabaseGlobal = typeof globalThis & { __i35SupabaseClient?: SupabaseClient };
const supabaseGlobal = globalThis as SupabaseGlobal;

// Reuse one client through Vite hot reloads.
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

export interface SyncStatusDetail {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  isConnected?: boolean;
  lastSyncedAt?: number;
}

export function notifySyncStatus(status: SyncStatusDetail) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('erp-offline-sync-status', { detail: status }));
  }
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

/**
 * Stale-write guard (audit B-2): returns true when the queued copy of a
 * document is OLDER than what already exists live. A successful live retry
 * (or a newer save from another device) must not be regressed by replaying
 * an older queued snapshot. Compare on updatedAt when present; without a
 * timestamp we optimistically treat the queued write as fresh.
 */
async function isStaleQueuedWrite(collectionName: string, queued: { id: string }): Promise<boolean> {
  const queuedUpdatedAt = (queued as any)?.updatedAt || (queued as any)?.updated_at;
  if (!queuedUpdatedAt) return false;
  const { data } = await supabase
    .from('erp_records')
    .select('data')
    .eq('collection_name', collectionName)
    .eq('id', queued.id)
    .maybeSingle();
  const live = (data as { data?: any } | null)?.data;
  const liveUpdatedAt = live?.updatedAt || live?.updated_at;
  if (!liveUpdatedAt) return false; // no live row → nothing to regress
  const qTime = new Date(queuedUpdatedAt).getTime();
  const lTime = new Date(liveUpdatedAt).getTime();
  if (Number.isNaN(qTime) || Number.isNaN(lTime)) return false;
  return lTime > qTime;
}

export async function fetchCloudCollection<T>(collectionName: string): Promise<T[]> {
  const { data, error } = await supabase
    .from('erp_records')
    .select('data')
    .eq('collection_name', collectionName);
  if (error) throw error;
  return (data || []).map((row) => row.data as T);
}

function browserOnline() {
  return typeof navigator === 'undefined' || navigator.onLine;
}

// ---------------------------------------------------------------------------
// Shared per-collection state (fix #2: incremental realtime, no empty flash)
// ---------------------------------------------------------------------------

interface CollectionState<T> {
  items: T[];
  listeners: Set<() => void>;
  channel: RealtimeChannel | null;
  loaded: boolean;
}

const collectionStates = new Map<string, CollectionState<never>>();

function getState<T>(collectionName: string): CollectionState<T> {
  let state = collectionStates.get(collectionName) as CollectionState<T> | undefined;
  if (!state) {
    state = { items: [], listeners: new Set(), channel: null, loaded: false };
    collectionStates.set(collectionName, state as CollectionState<never>);
  }
  return state;
}

function notifyState<T>(state: CollectionState<T>) {
  state.listeners.forEach((listener) => listener());
}

async function pendingQueueCount(): Promise<number> {
  try {
    return await getQueueCount();
  } catch {
    return 0;
  }
}

/** Full re-fetch of one collection into the shared cache. Keeps last-known
 *  items on failure (fix #2: no `onData([])` flash). */
export async function refreshCollection<T>(collectionName: string): Promise<void> {
  const state = getState<T>(collectionName);
  try {
    const cloudItems = await fetchCloudCollection<T>(collectionName);
    state.items = cloudItems;
    state.loaded = true;
    notifyState(state);
    notifySyncStatus({
      isOnline: true,
      isConnected: true,
      pendingCount: await pendingQueueCount(),
      isSyncing: false,
      lastSyncedAt: Date.now(),
    });
  } catch (error) {
    console.warn(`Supabase load failed for ${collectionName}:`, error);
    // Keep whatever we already have — do not clear the UI.
    notifySyncStatus({
      isOnline: browserOnline(),
      isConnected: false,
      pendingCount: await pendingQueueCount(),
      isSyncing: false,
    });
  }
}

/** Re-fetch every collection that has at least one active subscriber
 *  (used on reconnect / after flushing the offline queue). */
export function refreshAllCollections() {
  collectionStates.forEach((_state, collectionName) => {
    void refreshCollection(collectionName);
  });
}

/**
 * Live subscription with incremental realtime updates.
 * - Renders cached items immediately (no empty flash).
 * - INSERT / UPDATE / DELETE events patch the local array instead of
 *   refetching the whole collection (fix #2).
 * - One realtime channel per collection, shared by all subscribers.
 */
export function subscribeToCollection<T extends { id: string }>(
  collectionName: string,
  onData: (items: T[]) => void,
  _initialSeedData: T[] = [],
) {
  const state = getState<T>(collectionName);

  const listener = () => onData([...state.items]);
  state.listeners.add(listener);
  listener(); // instant render from cache

  if (!state.channel) {
    const filter = `collection_name=eq.${collectionName}`;
    const onInsert = (payload: any) => {
      const row = payload?.new as ErpRecord | undefined;
      if (!row?.id || !row.data) return;
      const item = { ...(row.data as T), id: row.id } as T;
      if (!state.items.some((existing) => existing.id === item.id)) {
        state.items = [item, ...state.items];
        notifyState(state);
      }
    };
    const onUpdate = (payload: any) => {
      const row = payload?.new as ErpRecord | undefined;
      if (!row?.id || !row.data) return;
      const item = { ...(row.data as T), id: row.id } as T;
      if (state.items.some((existing) => existing.id === item.id)) {
        state.items = state.items.map((existing) => (existing.id === item.id ? item : existing));
      } else {
        state.items = [item, ...state.items];
      }
      notifyState(state);
    };
    const onDelete = (payload: any) => {
      const row = payload?.old as { id?: string } | undefined;
      if (!row?.id) return;
      const before = state.items.length;
      state.items = state.items.filter((existing) => existing.id !== row.id);
      if (state.items.length !== before) notifyState(state);
    };

    state.channel = supabase
      .channel(`erp-${collectionName}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'erp_records', filter }, onInsert)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'erp_records', filter }, onUpdate)
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'erp_records', filter }, onDelete)
      .subscribe();

    if (!state.loaded) void refreshCollection(collectionName);
  }

  return () => {
    state.listeners.delete(listener);
    if (state.listeners.size === 0) {
      if (state.channel) {
        void supabase.removeChannel(state.channel);
        state.channel = null;
      }
      state.loaded = false;
      collectionStates.delete(collectionName);
    }
  };
}

// ---------------------------------------------------------------------------
// Optimistic local patches (fix #1: offline writes appear in the UI instantly)
// ---------------------------------------------------------------------------

export function applyLocalChange<T extends { id: string }>(collectionName: string, data: T) {
  const state = collectionStates.get(collectionName) as CollectionState<T> | undefined;
  if (!state) return;
  if (state.items.some((existing) => existing.id === data.id)) {
    state.items = state.items.map((existing) => (existing.id === data.id ? data : existing));
  } else {
    state.items = [data, ...state.items];
  }
  notifyState(state);
}

export function removeLocalItem(collectionName: string, id: string) {
  const state = collectionStates.get(collectionName) as CollectionState<any> | undefined;
  if (!state) return;
  const before = state.items.length;
  state.items = state.items.filter((existing) => existing.id !== id);
  if (state.items.length !== before) notifyState(state);
}

export function clearLocalCollection(collectionName: string) {
  const state = collectionStates.get(collectionName) as CollectionState<any> | undefined;
  if (!state) return;
  if (state.items.length > 0) {
    state.items = [];
    notifyState(state);
  }
}

// ---------------------------------------------------------------------------
// Writes with offline queueing (fix #1)
// ---------------------------------------------------------------------------

async function queueWrite(item: Omit<OfflineQueueItem, 'queueId' | 'queuedAt'>) {
  await addToQueue(item);
  notifySyncStatus({
    isOnline: browserOnline(),
    isConnected: browserOnline(),
    pendingCount: await pendingQueueCount(),
    isSyncing: false,
  });
}

export async function saveDocument<T extends { id: string }>(collectionName: string, data: T) {
  applyLocalChange(collectionName, data); // optimistic — UI updates instantly

  if (!browserOnline()) {
    await queueWrite({ collectionName, action: 'save', data });
    return;
  }

  const { error } = await supabase.from('erp_records').upsert(toRows(collectionName, [data]), {
    onConflict: 'collection_name,id',
  });
  if (error) {
    console.warn(`Supabase write failed for ${collectionName}/${data.id} — queued for retry:`, error);
    await queueWrite({ collectionName, action: 'save', data });
    return; // not thrown — data is queued, badge shows pending count
  }

  notifySyncStatus({
    isOnline: true,
    isConnected: true,
    pendingCount: await pendingQueueCount(),
    isSyncing: false,
    lastSyncedAt: Date.now(),
  });
  void flushOfflineQueue(); // connection is back — push any backlog
}

export async function saveBatchDocuments<T extends { id: string }>(collectionName: string, items: T[]) {
  if (!items.length) return;
  items.forEach((item) => applyLocalChange(collectionName, item));

  if (!browserOnline()) {
    await queueWrite({ collectionName, action: 'batch', data: items });
    return;
  }

  const { error } = await supabase.from('erp_records').upsert(toRows(collectionName, items), {
    onConflict: 'collection_name,id',
  });
  if (error) {
    console.warn(`Supabase batch write failed for ${collectionName} — queued for retry:`, error);
    await queueWrite({ collectionName, action: 'batch', data: items });
    return;
  }

  notifySyncStatus({
    isOnline: true,
    isConnected: true,
    pendingCount: await pendingQueueCount(),
    isSyncing: false,
    lastSyncedAt: Date.now(),
  });
  void flushOfflineQueue();
}

export async function deleteDocument(collectionName: string, id: string) {
  removeLocalItem(collectionName, id);

  if (!browserOnline()) {
    await queueWrite({ collectionName, action: 'delete', data: { id } });
    return;
  }

  const { error } = await supabase
    .from('erp_records')
    .delete()
    .eq('collection_name', collectionName)
    .eq('id', id);
  if (error) {
    console.warn(`Supabase delete failed for ${collectionName}/${id} — queued for retry:`, error);
    await queueWrite({ collectionName, action: 'delete', data: { id } });
    return;
  }

  notifySyncStatus({
    isOnline: true,
    isConnected: true,
    pendingCount: await pendingQueueCount(),
    isSyncing: false,
    lastSyncedAt: Date.now(),
  });
  void flushOfflineQueue();
}

export async function clearCollection(collectionName: string) {
  clearLocalCollection(collectionName);

  if (!browserOnline()) {
    await queueWrite({ collectionName, action: 'clear', data: null });
    return;
  }

  const { error } = await supabase.from('erp_records').delete().eq('collection_name', collectionName);
  if (error) {
    console.warn(`Supabase clear failed for ${collectionName} — queued for retry:`, error);
    await queueWrite({ collectionName, action: 'clear', data: null });
    return;
  }

  notifySyncStatus({
    isOnline: true,
    isConnected: true,
    pendingCount: await pendingQueueCount(),
    isSyncing: false,
    lastSyncedAt: Date.now(),
  });
  void flushOfflineQueue();
}

// ---------------------------------------------------------------------------
// Queue flush
// ---------------------------------------------------------------------------

let flushInProgress = false;

/** Replay the offline queue against Supabase. Safe to call any time. */
export async function flushOfflineQueue(): Promise<{ syncedCount: number; remainingCount: number }> {
  if (typeof window === 'undefined') return { syncedCount: 0, remainingCount: 0 };

  if (!navigator.onLine) {
    notifySyncStatus({
      isOnline: false,
      isConnected: false,
      pendingCount: await pendingQueueCount(),
      isSyncing: false,
    });
    return { syncedCount: 0, remainingCount: await pendingQueueCount() };
  }

  if (flushInProgress) return { syncedCount: 0, remainingCount: await pendingQueueCount() };
  flushInProgress = true;

  let syncedCount = 0;
  try {
    const queue = await getQueue();
    if (queue.length > 0) {
      notifySyncStatus({
        isOnline: true,
        isConnected: true,
        pendingCount: queue.length,
        isSyncing: true,
      });
    }

    for (const item of queue) {
      if (item.queueId == null) continue;
      try {
        if (item.action === 'save') {
          const data = item.data as { id: string };
          // Stale-write guard (audit B-2): if a NEWER version of this document
          // already landed live (e.g. the user retried successfully while this
          // copy was still queued), replaying this older snapshot would regress
          // the record. Compare updatedAt before upserting.
          if (isStaleQueuedWrite(item.collectionName, data)) {
            await removeFromQueue(item.queueId);
            syncedCount++;
            continue;
          }
          const { error } = await supabase.from('erp_records').upsert(toRows(item.collectionName, [data]), {
            onConflict: 'collection_name,id',
          });
          if (error) throw error;
        } else if (item.action === 'batch') {
          const items = (item.data as { id: string }[]) || [];
          // Drop any batch items superseded by newer live writes.
          const fresh = [];
          for (const it of items) {
            if (!isStaleQueuedWrite(item.collectionName, it)) fresh.push(it);
          }
          if (fresh.length > 0) {
            const { error } = await supabase.from('erp_records').upsert(toRows(item.collectionName, fresh), {
              onConflict: 'collection_name,id',
            });
            if (error) throw error;
          }
        } else if (item.action === 'delete') {
          const { id } = (item.data as { id?: string }) || {};
          if (id) {
            const { error } = await supabase
              .from('erp_records')
              .delete()
              .eq('collection_name', item.collectionName)
              .eq('id', id);
            if (error) throw error;
          }
        } else if (item.action === 'clear') {
          const { error } = await supabase
            .from('erp_records')
            .delete()
            .eq('collection_name', item.collectionName);
          if (error) throw error;
        }
        await removeFromQueue(item.queueId);
        syncedCount++;
      } catch (err) {
        console.warn(`Offline queue item ${item.queueId} failed (${item.collectionName}/${item.action}):`, err);
        // Stop replaying if the network dropped mid-flush; keep the rest queued.
        if (!navigator.onLine) break;
      }
    }

    const remaining = await getQueue();
    notifySyncStatus({
      isOnline: navigator.onLine,
      isConnected: true,
      pendingCount: remaining.length,
      isSyncing: false,
      lastSyncedAt: Date.now(),
    });
    return { syncedCount, remainingCount: remaining.length };
  } catch (err) {
    console.error('Failed processing offline queue:', err);
    const remaining = await getQueue();
    notifySyncStatus({
      isOnline: navigator.onLine,
      isConnected: false,
      pendingCount: remaining.length,
      isSyncing: false,
    });
    return { syncedCount, remainingCount: remaining.length };
  } finally {
    flushInProgress = false;
  }
}

// Auto-flush + refetch when connectivity returns (covers missed realtime events).
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    void flushOfflineQueue().then(() => refreshAllCollections());
  });
}
