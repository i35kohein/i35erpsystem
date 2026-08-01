import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY to .env.local.');
}

type SupabaseGlobal = typeof globalThis & { __i35SupabaseClient?: SupabaseClient };
const supabaseGlobal = globalThis as SupabaseGlobal;

// Reuse one client through Vite hot reloads. ERP records are cloud-only: this
// module deliberately has no IndexedDB, localStorage, or offline write queue.
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
  pendingCount: 0;
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

async function fetchCloudCollection<T>(collectionName: string): Promise<T[]> {
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

/**
 * Cloud-only data subscription. The third argument remains for call-site
 * compatibility, but bundled seed data is intentionally never displayed or
 * uploaded from this function.
 */
export function subscribeToCollection<T extends { id: string }>(
  collectionName: string,
  onData: (items: T[]) => void,
  _initialSeedData: T[] = [],
) {
  let active = true;

  const load = async () => {
    // Never render stale browser data while the live request is pending.
    if (active) onData([]);

    try {
      const cloudItems = await fetchCloudCollection<T>(collectionName);
      if (!active) return;
      onData(cloudItems);
      notifySyncStatus({
        isOnline: browserOnline(),
        isConnected: true,
        pendingCount: 0,
        isSyncing: false,
        lastSyncedAt: Date.now(),
      });
    } catch (error) {
      console.warn(`Supabase load failed for ${collectionName}:`, error);
      if (active) onData([]);
      notifySyncStatus({
        isOnline: browserOnline(),
        isConnected: false,
        pendingCount: 0,
        isSyncing: false,
      });
    }
  };

  void load();

  const channel = supabase
    .channel(`erp-${collectionName}-${Math.random().toString(36).slice(2)}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'erp_records', filter: `collection_name=eq.${collectionName}` },
      () => void load(),
    )
    .subscribe();

  return () => {
    active = false;
    void supabase.removeChannel(channel);
  };
}

export async function saveDocument<T extends { id: string }>(collectionName: string, data: T) {
  if (!browserOnline()) throw new Error('Internet connection required to save ERP data.');
  const { error } = await supabase.from('erp_records').upsert(toRows(collectionName, [data]), {
    onConflict: 'collection_name,id',
  });
  if (error) {
    notifySyncStatus({ isOnline: true, isConnected: false, pendingCount: 0, isSyncing: false });
    throw error;
  }
  notifySyncStatus({ isOnline: true, isConnected: true, pendingCount: 0, isSyncing: false, lastSyncedAt: Date.now() });
}

export async function saveBatchDocuments<T extends { id: string }>(collectionName: string, items: T[]) {
  if (!items.length) return;
  if (!browserOnline()) throw new Error('Internet connection required to save ERP data.');
  const { error } = await supabase.from('erp_records').upsert(toRows(collectionName, items), {
    onConflict: 'collection_name,id',
  });
  if (error) {
    notifySyncStatus({ isOnline: true, isConnected: false, pendingCount: 0, isSyncing: false });
    throw error;
  }
  notifySyncStatus({ isOnline: true, isConnected: true, pendingCount: 0, isSyncing: false, lastSyncedAt: Date.now() });
}

export async function deleteDocument(collectionName: string, id: string) {
  if (!browserOnline()) throw new Error('Internet connection required to save ERP data.');
  const { error } = await supabase
    .from('erp_records')
    .delete()
    .eq('collection_name', collectionName)
    .eq('id', id);
  if (error) {
    notifySyncStatus({ isOnline: true, isConnected: false, pendingCount: 0, isSyncing: false });
    throw error;
  }
  notifySyncStatus({ isOnline: true, isConnected: true, pendingCount: 0, isSyncing: false, lastSyncedAt: Date.now() });
}

export async function clearCollection(collectionName: string) {
  if (!browserOnline()) throw new Error('Internet connection required to save ERP data.');
  const { error } = await supabase.from('erp_records').delete().eq('collection_name', collectionName);
  if (error) {
    notifySyncStatus({ isOnline: true, isConnected: false, pendingCount: 0, isSyncing: false });
    throw error;
  }
  notifySyncStatus({ isOnline: true, isConnected: true, pendingCount: 0, isSyncing: false, lastSyncedAt: Date.now() });
}
