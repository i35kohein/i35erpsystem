import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, RefreshCw, Database, CheckCircle2, AlertTriangle, CloudUpload, ShieldCheck } from 'lucide-react';
import { syncOfflineQueueToSupabase } from '../../lib/supabase';
import { idbGetSyncQueue, idbGetAll, STORES } from '../../lib/indexedDB';

interface SyncStatusDetail {
  isOnline: boolean;
  pendingCount: number;
  isSyncing: boolean;
  lastSyncedAt?: number;
}

export const OfflineSyncStatusBadge: React.FC = () => {
  const [status, setStatus] = useState<SyncStatusDetail>({
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    pendingCount: 0,
    isSyncing: false,
  });
  const [modalOpen, setModalOpen] = useState(false);
  const [dbStats, setDbStats] = useState<Record<string, number>>({});
  const [queueItems, setQueueItems] = useState<any[]>([]);

  // Listen to custom offline/sync status events dispatched by firebase/indexedDB layer
  useEffect(() => {
    // Initial check
    idbGetSyncQueue().then((pending) => {
      setStatus((prev) => ({
        ...prev,
        isOnline: navigator.onLine,
        pendingCount: pending.length,
      }));
    });

    const handleSyncStatus = (e: CustomEvent<SyncStatusDetail>) => {
      setStatus(e.detail);
    };

    window.addEventListener('erp-offline-sync-status' as any, handleSyncStatus);
    return () => {
      window.removeEventListener('erp-offline-sync-status' as any, handleSyncStatus);
    };
  }, []);

  // Fetch detailed stats when opening modal
  const loadModalStats = async () => {
    const queue = await idbGetSyncQueue();
    setQueueItems(queue);

    const stats: Record<string, number> = {};
    for (const store of STORES) {
      if (store === 'syncQueue') continue;
      const items = await idbGetAll(store);
      stats[store] = items.length;
    }
    setDbStats(stats);
  };

  const handleOpenModal = () => {
    loadModalStats();
    setModalOpen(true);
  };

  const handleManualSync = async () => {
    await syncOfflineQueueToSupabase();
    loadModalStats();
  };

  return (
    <>
      {/* Top Bar Offline / Online Sync Badge */}
      <button
        type="button"
        onClick={handleOpenModal}
        className={`relative inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors cursor-pointer ${
          !status.isOnline
            ? 'bg-amber-500 text-white ring-2 ring-amber-300'
            : status.pendingCount > 0
            ? 'bg-indigo-600 text-white'
            : status.isSyncing
            ? 'bg-purple-600 text-white'
            : 'bg-emerald-50 text-emerald-800 border border-emerald-200/80 hover:bg-emerald-100/80'
        }`}
        title={
          !status.isOnline
            ? `Offline — ${status.pendingCount} saved`
            : status.isSyncing
              ? `Syncing ${status.pendingCount} change(s)`
              : status.pendingCount > 0
                ? `${status.pendingCount} change(s) ready to sync`
                : 'Supabase synced'
        }
        aria-label={
          !status.isOnline
            ? `Offline, ${status.pendingCount} changes saved`
            : status.isSyncing
              ? 'Supabase syncing'
              : status.pendingCount > 0
                ? `${status.pendingCount} changes ready to sync`
                : 'Supabase synced'
        }
      >
        {!status.isOnline ? (
          <WifiOff className="h-4 w-4" />
        ) : status.isSyncing ? (
          <RefreshCw className="h-4 w-4 animate-spin" />
        ) : status.pendingCount > 0 ? (
          <CloudUpload className="h-4 w-4" />
        ) : (
          <Database className="h-4 w-4 text-emerald-600" />
        )}
        {status.pendingCount > 0 && (
          <span className="absolute -right-1 -top-1 min-w-4 rounded-full bg-rose-500 px-1 text-center text-[9px] font-black leading-4 text-white ring-2 ring-white">
            {status.pendingCount > 9 ? '9+' : status.pendingCount}
          </span>
        )}
      </button>

      {/* IndexedDB & Offline Sync Inspector Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 space-y-4 shadow-2xl border border-[#E5E5EA]">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[#E5E5EA] pb-3">
              <div className="flex items-center space-x-2">
                <div className={`p-2 rounded-xl ${!status.isOnline ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>
                  {status.isOnline ? <Wifi className="w-5 h-5" /> : <WifiOff className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-[#1D1D1F]">IndexedDB Persistence & Sync</h3>
                  <p className="text-xs text-[#86868B] font-medium">Full offline mode engine with automatic background sync</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1.5 rounded-lg text-[#86868B] hover:bg-[#F5F5F7] transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Connection Status Banner */}
            <div className={`p-3.5 rounded-xl border flex items-center justify-between text-xs font-semibold ${
              !status.isOnline
                ? 'bg-amber-50 border-amber-200 text-amber-900'
                : 'bg-emerald-50 border-emerald-200 text-emerald-900'
            }`}>
              <div className="flex items-center space-x-2">
                {!status.isOnline ? (
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                )}
                <div>
                  <div className="font-bold">
                    {status.isOnline ? 'Internet Connected (Cloud Active)' : 'Offline Mode Active'}
                  </div>
                  <div className="text-[11px] opacity-80 font-normal">
                    {status.isOnline
                      ? 'Changes automatically sync to Supabase & local IndexedDB.'
                      : 'All new work orders, inventory edits, and POS sales are stored locally in IndexedDB.'}
                  </div>
                </div>
              </div>

              {status.isOnline && queueItems.length > 0 && (
                <button
                  type="button"
                  onClick={handleManualSync}
                  disabled={status.isSyncing}
                  className="px-3 py-1.5 bg-[#7360F2] text-white rounded-lg font-bold hover:bg-[#5e4cd9] transition-all cursor-pointer shrink-0 flex items-center space-x-1 shadow-2xs"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${status.isSyncing ? 'animate-spin' : ''}`} />
                  <span>Sync Now</span>
                </button>
              )}
            </div>

            {/* Pending Sync Queue */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-[#1D1D1F]">
                <span className="flex items-center space-x-1.5">
                  <CloudUpload className="w-4 h-4 text-[#7360F2]" />
                  <span>Pending Sync Queue ({queueItems.length})</span>
                </span>
                {status.lastSyncedAt && (
                  <span className="text-[10px] text-[#86868B] font-normal">
                    Last sync: {new Date(status.lastSyncedAt).toLocaleTimeString()}
                  </span>
                )}
              </div>

              {queueItems.length === 0 ? (
                <div className="p-3 bg-[#F5F5F7] rounded-xl text-center text-xs text-[#86868B] font-medium border border-[#E5E5EA]">
                  ✨ No pending offline changes. Local IndexedDB data is synchronized with Supabase.
                </div>
              ) : (
                <div className="max-h-32 overflow-y-auto space-y-1.5 pr-1">
                  {queueItems.map((item, idx) => (
                    <div key={idx} className="p-2 bg-purple-50/70 border border-purple-200 rounded-lg flex items-center justify-between text-xs">
                      <div>
                        <span className="font-bold text-purple-900 uppercase text-[10px] bg-purple-200/80 px-1.5 py-0.5 rounded mr-2">
                          {item.action}
                        </span>
                        <span className="font-semibold text-[#1D1D1F]">{item.collectionName}</span>
                        <span className="text-[10px] text-[#86868B] ml-2">
                          (ID: {item.data?.id || item.data?.[0]?.id || 'batch'})
                        </span>
                      </div>
                      <span className="text-[10px] text-[#86868B]">
                        {new Date(item.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* IndexedDB Local Store Snapshot */}
            <div className="space-y-2 pt-2 border-t border-[#E5E5EA]">
              <div className="flex items-center space-x-1.5 text-xs font-bold text-[#1D1D1F]">
                <Database className="w-4 h-4 text-emerald-600" />
                <span>IndexedDB Storage Vault Snapshot</span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-xs">
                {Object.entries(dbStats).map(([storeName, count]) => (
                  <div key={storeName} className="p-2 bg-[#F5F5F7] rounded-lg border border-[#E5E5EA] flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-[#86868B] truncate max-w-[80px]" title={storeName}>
                      {storeName}
                    </span>
                    <span className="font-mono font-bold text-[#1D1D1F] bg-white px-1.5 py-0.5 rounded border border-[#E5E5EA]">
                      {count}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="pt-2 flex items-center justify-between text-[11px] text-[#86868B] border-t border-[#E5E5EA]">
              <div className="flex items-center space-x-1 text-emerald-700 font-semibold">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>IndexedDB Auto-Persistence Active</span>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="px-4 py-1.5 bg-[#1D1D1F] text-white rounded-xl font-bold hover:bg-black transition-all cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
