import React, { useState } from 'react';
import {Trash2, RotateCcw, Search, X, ShieldAlert} from 'lucide-react';
import { WorkOrder } from '../../types';
import { Button } from '../ui';
import { StatusBadge } from './StatusBadge';
import { PriorityBadge } from './PriorityBadge';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';

interface RecycleBinModalProps {
  isOpen: boolean;
  onClose: () => void;
  archivedWorkOrders: WorkOrder[];
  onRestoreWorkOrder: (id: string) => void;
  onPermanentDeleteWorkOrder: (id: string) => void;
  onRestoreAll: () => void;
  onEmptyRecycleBin: () => void;
}

export const RecycleBinModal: React.FC<RecycleBinModalProps> = ({
  isOpen,
  onClose,
  archivedWorkOrders,
  onRestoreWorkOrder,
  onPermanentDeleteWorkOrder,
  onRestoreAll,
  onEmptyRecycleBin,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [confirmEmptyOpen, setConfirmEmptyOpen] = useState(false);
  const [singleToDelete, setSingleToDelete] = useState<WorkOrder | null>(null);

  if (!isOpen) return null;

  const filteredWorkOrders = archivedWorkOrders.filter((wo) => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    return (
      wo.orderNumber.toLowerCase().includes(query) ||
      wo.id.toLowerCase().includes(query) ||
      wo.customerName.toLowerCase().includes(query) ||
      wo.customerPhone.toLowerCase().includes(query) ||
      wo.deviceModel.toLowerCase().includes(query) ||
      (wo.serialNumber && wo.serialNumber.toLowerCase().includes(query))
    );
  });

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl border border-line shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden text-ink">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-line flex items-center justify-between bg-[#F9F9FB]">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="font-extrabold text-base sm:text-lg text-ink">Recycle Bin & Archive</h2>
                <span className="px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-700 text-xs font-bold">
                  {archivedWorkOrders.length} {archivedWorkOrders.length === 1 ? 'ticket' : 'tickets'}
                </span>
              </div>
              <p className="text-xs text-muted mt-0.5">
                Deleted repair tickets are safely stored here. You can restore them anytime or permanently delete them.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {archivedWorkOrders.length > 0 && (
              <>
                <Button
                  type="button"
                  onClick={onRestoreAll}
                  variant="secondary"
                  size="sm"
                  className="hidden sm:flex items-center space-x-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Restore All</span>
                </Button>

                <Button
                  type="button"
                  onClick={() => setConfirmEmptyOpen(true)}
                  variant="secondary"
                  size="sm"
                  className="hidden sm:flex items-center space-x-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border-rose-200"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Empty Bin</span>
                </Button>
              </>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-muted hover:text-ink hover:bg-line/50 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        {archivedWorkOrders.length > 0 && (
          <div className="p-3 sm:p-4 border-b border-line bg-white flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search archived tickets by WO#, name, model..."
                className="w-full bg-surface text-xs text-ink placeholder-muted pl-9 pr-4 py-2 rounded-xl border border-line focus:bg-white focus:outline-none focus:border-brand transition-all"
              />
            </div>

            {/* Mobile Restore All & Empty buttons */}
            <div className="flex sm:hidden items-center space-x-2 w-full justify-end">
              <button
                type="button"
                onClick={onRestoreAll}
                className="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Restore All</span>
              </button>
              <button
                type="button"
                onClick={() => setConfirmEmptyOpen(true)}
                className="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-rose-50 text-rose-600 border border-rose-200 text-xs font-bold"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Empty Bin</span>
              </button>
            </div>
          </div>
        )}

        {/* List Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3 bg-surface">
          {archivedWorkOrders.length === 0 ? (
            <div className="py-16 text-center space-y-3 bg-white rounded-2xl border border-line p-8 shadow-2xs">
              <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
                <Trash2 className="w-8 h-8" />
              </div>
              <h3 className="font-bold text-base text-ink">Recycle Bin is Empty</h3>
              <p className="text-xs text-muted max-w-md mx-auto leading-relaxed">
                When repair tickets are deleted from the pipeline or intake portal, they will be archived here. You can safely restore them anytime with all diagnostics and logs intact.
              </p>
            </div>
          ) : filteredWorkOrders.length === 0 ? (
            <div className="py-12 text-center space-y-2 bg-white rounded-2xl border border-line p-6">
              <Search className="w-8 h-8 text-muted mx-auto" />
              <p className="font-bold text-sm text-ink">No matching archived tickets found</p>
              <p className="text-xs text-muted">Try searching with a different keyword or ticket number.</p>
            </div>
          ) : (
            filteredWorkOrders.map((wo) => (
              <div
                key={wo.id}
                className="bg-white rounded-2xl border border-line p-4 shadow-2xs hover:border-brand/40 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
                    <span className="font-mono font-bold text-brand text-sm">{wo.orderNumber || wo.id}</span>
                    <StatusBadge status={wo.status} size="sm" />
                    <PriorityBadge priority={wo.priority} size="sm" showNormal={true} />
                  </div>

                  <div className="flex items-center space-x-3 text-xs text-ink">
                    <span className="font-semibold truncate">{wo.customerName}</span>
                    <span className="text-muted">({wo.customerPhone})</span>
                  </div>

                  <div className="flex items-center space-x-2 text-xs text-muted">
                    <span className="font-medium text-ink">{wo.deviceCategory} {wo.deviceModel}</span>
                    {wo.serialNumber && <span>• S/N: {wo.serialNumber}</span>}
                  </div>

                  {wo.archivedAt && (
                    <div className="text-xs text-rose-500 font-medium">
                      Archived on {new Date(wo.archivedAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center space-x-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-line">
                  <Button
                    type="button"
                    onClick={() => onRestoreWorkOrder(wo.id)}
                    className="flex-1 sm:flex-initial bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Restore Ticket</span>
                  </Button>

                  <Button
                    type="button"
                    onClick={() => setSingleToDelete(wo)}
                    variant="outline"
                    className="flex-1 sm:flex-initial bg-rose-50 hover:bg-rose-100 text-rose-600 border-rose-200"
                    title="Permanently Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span className="hidden md:inline">Delete Permanently</span>
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-line bg-white flex items-center justify-between text-xs text-muted">
          <div>
            Showing <span className="font-bold text-ink">{filteredWorkOrders.length}</span> of{' '}
            <span className="font-bold text-ink">{archivedWorkOrders.length}</span> archived repair tickets
          </div>
          <Button
            type="button"
            onClick={onClose}
            variant="secondary"
          >
            Close
          </Button>
        </div>

        {/* Confirm Empty Recycle Bin Modal Popup */}
        {confirmEmptyOpen && (
          <div className="fixed inset-0 bg-slate-900/60 z-60 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl border border-line shadow-2xl p-6 max-w-md w-full space-y-4">
              <div className="flex items-center space-x-3 text-rose-600">
                <ShieldAlert className="w-7 h-7" />
                <h3 className="font-extrabold text-base text-ink">Empty Recycle Bin?</h3>
              </div>
              <p className="text-xs text-muted leading-relaxed">
                This will permanently remove all <span className="font-bold text-rose-600">{archivedWorkOrders.length}</span> archived repair tickets from the database. This action cannot be undone.
              </p>
              <div className="flex items-center justify-end space-x-2 pt-2">
                <Button
                  type="button"
                  onClick={() => setConfirmEmptyOpen(false)}
                  variant="secondary"
                  size="sm"
                >
                  Cancel
                </Button>
                <button
                  type="button"
                  onClick={() => {
                    onEmptyRecycleBin();
                    setConfirmEmptyOpen(false);
                  }}
                  className="px-4 py-2 rounded-xl bg-rose-600 text-white font-bold text-xs hover:bg-rose-700 transition-all shadow-2xs cursor-pointer"
                >
                  Yes, Empty Everything
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Single Item Permanent Delete Confirmation Modal */}
        <ConfirmDeleteModal
          isOpen={!!singleToDelete}
          title="Permanently Delete Ticket?"
          itemName={singleToDelete ? `${singleToDelete.orderNumber || singleToDelete.id} - ${singleToDelete.customerName}` : ''}
          description="This ticket will be permanently purged from the database. THIS ACTION CANNOT BE UNDONE."
          confirmLabel="Permanently Purge Ticket"
          onConfirm={() => {
            if (singleToDelete) {
              onPermanentDeleteWorkOrder(singleToDelete.id);
            }
          }}
          onClose={() => setSingleToDelete(null)}
        />
      </div>
    </div>
  );
};
