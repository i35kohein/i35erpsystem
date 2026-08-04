import React, { useEffect, useRef, useState } from 'react';
import { Database, WifiOff, RefreshCw, X, CheckCircle2, AlertTriangle } from 'lucide-react';
import type { SyncStatusDetail } from '../../lib/supabase';

/** Compact live-database status button with a click-through status panel. */
export const OfflineSyncStatusBadge: React.FC = () => {
  const [status, setStatus] = useState<SyncStatusDetail>({
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    isConnected: undefined,
    pendingCount: 0,
    isSyncing: false,
  });
  const [open, setOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleSyncStatus = (event: Event) => {
      setStatus((event as CustomEvent<SyncStatusDetail>).detail);
    };
    const setOnline = () => setStatus((previous) => ({ ...previous, isOnline: true }));
    const setOffline = () => setStatus((previous) => ({ ...previous, isOnline: false, isConnected: false }));

    window.addEventListener('erp-offline-sync-status', handleSyncStatus);
    window.addEventListener('online', setOnline);
    window.addEventListener('offline', setOffline);
    return () => {
      window.removeEventListener('erp-offline-sync-status', handleSyncStatus);
      window.removeEventListener('online', setOnline);
      window.removeEventListener('offline', setOffline);
    };
  }, []);

  // Close the panel when clicking outside it.
  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open]);

  const unavailable = !status.isOnline || status.isConnected === false;
  const label = unavailable ? 'Live database unavailable' : 'Live Supabase data';

  const handleRefresh = () => {
    setRefreshing(true);
    window.dispatchEvent(new CustomEvent('erp-refresh-request'));
    window.setTimeout(() => setRefreshing(false), 1200);
  };

  return (
    <div className="relative shrink-0" ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border transition-all cursor-pointer active:scale-95 hover:brightness-95 ${
          unavailable
            ? 'border-rose-200 bg-rose-50 text-rose-700'
            : 'border-emerald-200/80 bg-emerald-50 text-emerald-700'
        }`}
        title={`${label} — click for details`}
        aria-label={`${label} — click for details`}
      >
        {unavailable ? <WifiOff className="h-4 w-4" /> : <Database className="h-4 w-4" />}
      </button>

      {open && (
        <div className="absolute right-0 top-9 z-[70] w-64 rounded-xl border border-[#E5E5EA] bg-white p-3 shadow-xl text-xs">
          <div className="flex items-center justify-between border-b border-[#E5E5EA] pb-2 mb-2">
            <span className="font-extrabold text-[#1D1D1F]">Live Database Status</span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close status panel"
              className="text-[#86868B] hover:text-[#1D1D1F] transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-1.5">
            <StatusRow ok={status.isOnline} label="Internet connection" value={status.isOnline ? 'Online' : 'Offline'} />
            <StatusRow
              ok={status.isConnected !== false}
              label="Supabase database"
              value={status.isConnected === false ? 'Unavailable' : status.isConnected === undefined ? 'Connecting…' : 'Connected'}
            />
            <StatusRow ok={status.pendingCount === 0} label="Pending writes" value={String(status.pendingCount ?? 0)} />
            {status.lastSyncedAt ? (
              <StatusRow ok label="Last synced" value={new Date(status.lastSyncedAt).toLocaleTimeString()} />
            ) : (
              <StatusRow ok label="Last synced" value="—" />
            )}
          </div>

          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing}
            className="mt-3 w-full flex items-center justify-center space-x-1.5 py-2 rounded-lg bg-[#0071E3] hover:bg-[#0051B3] text-white font-bold transition-all cursor-pointer disabled:opacity-60 disabled:cursor-wait"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>{refreshing ? 'Refreshing…' : 'Refresh Data Now'}</span>
          </button>
        </div>
      )}
    </div>
  );
};

const StatusRow: React.FC<{ ok: boolean; label: string; value: string }> = ({ ok, label, value }) => (
  <div className="flex items-center justify-between">
    <span className="text-[#86868B] font-medium">{label}</span>
    <span className={`flex items-center space-x-1 font-bold ${ok ? 'text-[#28A745]' : 'text-rose-600'}`}>
      {ok ? <CheckCircle2 className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
      <span>{value}</span>
    </span>
  </div>
);
