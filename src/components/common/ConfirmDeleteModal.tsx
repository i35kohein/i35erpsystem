import React from 'react';
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
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div 
        className="bg-white border border-slate-200 rounded-3xl shadow-2xl max-w-md w-full p-6 space-y-5 animate-in zoom-in-95 duration-150"
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
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3">
          {itemName && (
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl">
              <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Selected Item</span>
              <span className="block font-black text-sm text-slate-800 break-words">{itemName}</span>
            </div>
          )}
          <p className="text-xs text-slate-600 leading-relaxed font-medium">{description}</p>
        </div>

        <div className="flex items-center justify-end space-x-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={`px-5 py-2.5 text-white text-xs font-black rounded-xl shadow-md transition-all flex items-center space-x-2 cursor-pointer active:scale-98 ${
              isDanger ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-200' : 'bg-amber-600 hover:bg-amber-700'
            }`}
          >
            <Trash2 className="w-4 h-4" />
            <span>{confirmLabel}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
