import React, { useEffect } from 'react';
import { Button } from '../ui';
import { AlertTriangle, Trash2, X } from 'lucide-react';

interface ConfirmDeleteModalProps {
  isOpen: boolean;
  title?: string;
  itemName?: string;
  description?: string;
  confirmLabel?: string;
  isDanger?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export const ConfirmDeleteModal: React.FC<ConfirmDeleteModalProps> = ({
  isOpen,
  title = 'Confirm Deletion',
  itemName,
  description = 'Are you sure you want to delete this item? This action will move it to the Recycle Bin.',
  confirmLabel = 'Delete Item',
  isDanger = true,
  onConfirm,
  onClose,
}) => {
  // ESC closes the modal; focus moves into the dialog on open (basic focus trap)
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    const panel = document.getElementById('confirm-delete-panel');
    panel?.focus();
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div
        id="confirm-delete-panel"
        tabIndex={-1}
        className="bg-white border border-slate-200 rounded-3xl shadow-2xl max-w-md w-full p-6 space-y-5 animate-in zoom-in-95 duration-150 outline-none"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center space-x-3">
            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
              isDanger ? 'bg-rose-100 text-rose-600' : 'bg-amber-100 text-amber-600'
            }`}>
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-slate-900">{title}</h3>
              <p className="text-xs text-slate-500 font-medium">Action Requires Confirmation</p>
            </div>
          </div>
          <Button
            type="button"
            onClick={onClose}
            variant="iconGhost"
            size="iconSm"
            className="text-slate-400 hover:text-slate-600 hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="space-y-3">
          {itemName && (
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl">
              <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-0.5">Selected Item</span>
              <span className="block font-black text-sm text-slate-800 break-words">{itemName}</span>
            </div>
          )}
          <p className="text-xs text-slate-600 leading-relaxed font-medium">{description}</p>
        </div>

        <div className="flex items-center justify-end space-x-3 pt-2">
          <Button
            type="button"
            onClick={onClose}
            variant="secondary"
            className="bg-slate-100 hover:bg-slate-200 text-slate-700"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={`px-5 py-2.5 text-white text-xs font-black rounded-xl shadow-md transition-all flex items-center space-x-2 cursor-pointer active:scale-95 ${
              isDanger ? 'bg-danger hover:bg-danger-deep shadow-rose-200' : 'bg-warning hover:bg-warning'
            }`}
          >
            <Trash2 className="w-4 h-4" />
            <span>{confirmLabel}</span>
          </Button>
        </div>
      </div>
    </div>
  );
};
