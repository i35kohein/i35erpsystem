import React from 'react';
import { Trash2 } from 'lucide-react';
import type { SystemSettings } from '../../../types';

interface RecycleTabProps {
  formData: SystemSettings;
  setFormData: React.Dispatch<React.SetStateAction<SystemSettings>>;
  onOpenRecycleBin: () => void;
  archivedCount?: number;
}

const RecycleTab: React.FC<RecycleTabProps> = ({ onOpenRecycleBin, archivedCount }) => {
  return (
        <div className="bg-white p-6 rounded-2xl border border-line shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-line">
            <div>
              <h3 className="text-base font-extrabold text-ink flex items-center space-x-2">
                <Trash2 className="w-5 h-5 text-danger" />
                <span>Recycle Bin & Archive Management</span>
              </h3>
              <p className="text-xs text-muted mt-1">
                Manage deleted repair work orders and archived customer records. Restore accidentally deleted items or permanently purge them.
              </p>
            </div>

            {onOpenRecycleBin && (
              <button
                type="button"
                onClick={onOpenRecycleBin}
                className="px-4 py-2.5 bg-danger hover:bg-[#D70015] text-white font-extrabold text-xs rounded-xl transition-all shadow-2xs flex items-center space-x-2 shrink-0 cursor-pointer active:scale-95"
              >
                <Trash2 className="w-4 h-4" />
                <span>Open Recycle Bin ({archivedCount})</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-surface rounded-xl border border-line space-y-1">
              <span className="text-xs text-muted font-bold block">Archived Work Orders</span>
              <span className="text-2xl font-black text-ink">{archivedCount}</span>
              <p className="text-xs text-muted">Tickets currently held in the trash vault.</p>
            </div>

            <div className="p-4 bg-surface rounded-xl border border-line space-y-1">
              <span className="text-xs text-muted font-bold block">Restoration Policy</span>
              <span className="text-sm font-extrabold text-success">Instant Recovery</span>
              <p className="text-xs text-muted">Restored tickets return seamlessly to their active pipeline stage.</p>
            </div>

            <div className="p-4 bg-surface rounded-xl border border-line space-y-1">
              <span className="text-xs text-muted font-bold block">Action Manager</span>
              {onOpenRecycleBin ? (
                <button
                  type="button"
                  onClick={onOpenRecycleBin}
                  className="mt-2 text-xs font-bold text-brand hover:underline flex items-center space-x-1 cursor-pointer"
                >
                  <span>Launch Recycle Bin Modal →</span>
                </button>
              ) : (
                <span className="text-xs text-muted">No items pending action</span>
              )}
            </div>
          </div>
        </div>
  );
};

export default RecycleTab;
