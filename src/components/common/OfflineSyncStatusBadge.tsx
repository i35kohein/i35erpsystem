import React, { useEffect, useState } from 'react';
import { Database, WifiOff } from 'lucide-react';
import type { SyncStatusDetail } from '../../lib/supabase';

/** Compact live-database status only. Offline caching and queued writes are disabled. */
export const OfflineSyncStatusBadge: React.FC = () => {
  const [status, setStatus] = useState<SyncStatusDetail>({
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    isConnected: undefined,
    pendingCount: 0,
    isSyncing: false,
  });

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

  const unavailable = !status.isOnline || status.isConnected === false;
  const label = unavailable ? 'Live database unavailable' : 'Live Supabase data';

  return (
    <span
      className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${
        unavailable
          ? 'border-rose-200 bg-rose-50 text-rose-700'
          : 'border-emerald-200/80 bg-emerald-50 text-emerald-700'
      }`}
      title={label}
      aria-label={label}
    >
      {unavailable ? <WifiOff className="h-4 w-4" /> : <Database className="h-4 w-4" />}
    </span>
  );
};
