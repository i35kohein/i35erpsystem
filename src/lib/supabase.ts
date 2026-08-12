/**
 * Data layer — P0 security fix (Ko Hein 2026-08-13).
 *
 * The old implementation talked to Supabase DIRECTLY with a publishable key
 * shipped in the JS bundle. Anyone who opened the site could read, write and
 * delete every business table (customers, work orders, payouts, users).
 *
 * Now ALL reads/writes go through the authenticated server proxy
 * (/api/data/*), which holds the service-role key server-side only and
 * requires a valid session token on every request. The client bundle no
 * longer contains ANY database credential. Realtime is replaced by light
 * polling (every POLL_MS) so the UI still stays in sync across devices.
 */
import { addToQueue, getQueue, getQueueCount, removeFromQueue, type OfflineQueueItem } from './offlineQueue';

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

/** Session token for the server proxy (same token used for login). */
function sessionToken(): string {
  if (typeof window === 'undefined') return '';
  return window.localStorage.getItem('i35_session_token') || '';
}

async function proxyFetch<T = unknown>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      'x-session-token': sessionToken(),
      ...(init?.headers || {}),
    },
  });
  if (res.status === 401) {
    // Session expired/invalid — clear local auth so the login screen shows.
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem('i35_session_token');
      window.localStorage.removeItem('i35_session_user');
    }
    throw new Error('AUTH_EXPIRED');
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as any)?.error || `Request failed (${res.status})`);
  }
  return (await res.json()) as T;
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
  try {
    const rows = await fetchCloudCollection<any>(collectionName);
    const live = rows.find((r) => r.id === queued.id);
    const liveUpdatedAt = live?.updatedAt || live?.updated_at;
    if (!liveUpdatedAt) return false; // no live row → nothing to regress
    const qTime = new Date(queuedUpdatedAt).getTime();
    const lTime = new Date(liveUpdatedAt).getTime();
    if (Number.isNaN(qTime) || Number.isNaN(lTime)) return false;
    return lTime > qTime;
  } catch {
    return false;
  }
}

export async function fetchCloudCollection<T>(collectionName: string): Promise<T[]> {
  const { rows } = await proxyFetch<{ success: boolean; rows: unknown[] }>(
    `/api/data/${encodeURIComponent(collectionName)}`
  );
  return (rows || []) as T[];
}

function browserOnline() {
  return typeof navigator === 'undefined' || navigator.onLine;
}

// ---------------------------------------------------------------------------
// Shared per-collection state (incremental updates, no empty flash)
// ---------------------------------------------------------------------------

interface CollectionState<T> {
  items: T[];
  listeners: Set<() => void>;
  pollTimer: ReturnType<typeof setInterval> | null;
  loaded: boolean;
}

const collectionStates = new Map<string, CollectionState<never>>();

function getState<T>(collectionName: string): CollectionState<T> {
  let state = collectionStates.get(collectionName) as CollectionState<T> | undefined;
  if (!state) {
    state = { items: [], listeners: new Set(), pollTimer: null, loaded: false };
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
 *  items on failure (no `onData([])` flash). */
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
  } catch (error: any) {
    if (error?.message === 'AUTH_EXPIRED') {
      notifySyncStatus({
        isOnline: browserOnline(),
        isConnected: false,
        pendingCount: await pendingQueueCount(),
        isSyncing: false,
      });
      return;
    }
    console.warn(`Data load failed for ${collectionName}:`, error);
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

/** Poll interval for live updates (replaces Supabase Realtime — the client
 *  no longer holds a database key, so realtime is not available). 15s is a
 *  good balance of freshness vs load for a single-shop ERP. */
const POLL_MS = 15_000;

/**
 * Live subscription with incremental polling.
 * - Renders cached items immediately (no empty flash).
 * - Refetches the collection every POLL_MS while at least one subscriber
 *   is active, patching the shared array in place.
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

  if (!state.pollTimer) {
    // Initial load + periodic refresh (also heals after reconnects).
    if (!state.loaded) void refreshCollection(collectionName);
    state.pollTimer = setInterval(() => {
      if (!browserOnline()) return;
      void refreshCollection(collectionName);
    }, POLL_MS);
  }

  return () => {
    state.listeners.delete(listener);
    if (state.listeners.size === 0) {
      if (state.pollTimer) {
        clearInterval(state.pollTimer);
        state.pollTimer = null;
      }
      state.loaded = false;
      collectionStates.delete(collectionName);
    }
  };
}

// ---------------------------------------------------------------------------
// Optimistic local patches (offline writes appear in the UI instantly)
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
// Writes with offline queueing
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

  try {
    await proxyFetch('/api/data/save', {
      method: 'POST',
      body: JSON.stringify({ collection: collectionName, rows: [data] }),
    });
  } catch (error: any) {
    if (error?.message === 'AUTH_EXPIRED') throw error;
    console.warn(`Data write failed for ${collectionName}/${data.id} — queued for retry:`, error);
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

  try {
    await proxyFetch('/api/data/save', {
      method: 'POST',
      body: JSON.stringify({ collection: collectionName, rows: items }),
    });
  } catch (error: any) {
    if (error?.message === 'AUTH_EXPIRED') throw error;
    console.warn(`Data batch write failed for ${collectionName} — queued for retry:`, error);
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

  try {
    await proxyFetch('/api/data/delete', {
      method: 'POST',
      body: JSON.stringify({ collection: collectionName, ids: [id] }),
    });
  } catch (error: any) {
    if (error?.message === 'AUTH_EXPIRED') throw error;
    console.warn(`Data delete failed for ${collectionName}/${id} — queued for retry:`, error);
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

  try {
    await proxyFetch('/api/data/clear', {
      method: 'POST',
      body: JSON.stringify({ collection: collectionName }),
    });
  } catch (error: any) {
    if (error?.message === 'AUTH_EXPIRED') throw error;
    console.warn(`Data clear failed for ${collectionName} — queued for retry:`, error);
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

/** Replay the offline queue against the server proxy. Safe to call any time. */
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
          // Stale-write guard (audit B-2): skip replaying older snapshots.
          if (isStaleQueuedWrite(item.collectionName, data)) {
            await removeFromQueue(item.queueId);
            syncedCount++;
            continue;
          }
          await proxyFetch('/api/data/save', {
            method: 'POST',
            body: JSON.stringify({ collection: item.collectionName, rows: [data] }),
          });
        } else if (item.action === 'batch') {
          const items = (item.data as { id: string }[]) || [];
          // Drop any batch items superseded by newer live writes.
          const fresh = [];
          for (const it of items) {
            if (!isStaleQueuedWrite(item.collectionName, it)) fresh.push(it);
          }
          if (fresh.length > 0) {
            await proxyFetch('/api/data/save', {
              method: 'POST',
              body: JSON.stringify({ collection: item.collectionName, rows: fresh }),
            });
          }
        } else if (item.action === 'delete') {
          const { id } = (item.data as { id?: string }) || {};
          if (id) {
            await proxyFetch('/api/data/delete', {
              method: 'POST',
              body: JSON.stringify({ collection: item.collectionName, ids: [id] }),
            });
          }
        } else if (item.action === 'clear') {
          await proxyFetch('/api/data/clear', {
            method: 'POST',
            body: JSON.stringify({ collection: item.collectionName }),
          });
        }
        await removeFromQueue(item.queueId);
        syncedCount++;
      } catch (err: any) {
        if (err?.message === 'AUTH_EXPIRED') {
          // Session is gone — stop replaying; user must log in again.
          flushInProgress = false;
          return { syncedCount, remainingCount: await pendingQueueCount() };
        }
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
