import React, { useEffect, useState } from 'react';
import { Button } from '../ui';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Destructive action → red confirm button + red icon (deletes). Default: brand. */
  danger?: boolean;
}

type ActiveState = (ConfirmOptions & { resolve: (v: boolean) => void }) | null;

let setActive: React.Dispatch<React.SetStateAction<ActiveState>> | null = null;

/**
 * App-styled replacement for window.confirm() — resolves true/false from the
 * modal rendered by <ConfirmDialogHost /> (mounted once in App.tsx).
 * Usage: if (await confirmDialog({ title, message, danger })) { … }
 */
export function confirmDialog(opts: ConfirmOptions): Promise<boolean> {
  return new Promise((resolve) => {
    if (!setActive) {
      resolve(false);
      return;
    }
    setActive({ ...opts, resolve });
  });
}

export const ConfirmDialogHost: React.FC = () => {
  const [active, setActiveState] = useState<ActiveState>(null);

  useEffect(() => {
    setActive = setActiveState;
    return () => {
      setActive = null;
    };
  }, []);

  const close = (result: boolean) => {
    active?.resolve(result);
    setActiveState(null);
  };

  // ESC cancels, Enter confirms.
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close(false);
      else if (e.key === 'Enter') close(true);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  if (!active) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={() => close(false)}
      role="dialog"
      aria-modal="true"
      aria-label={active.title}
    >
      <div
        className="w-full max-w-md space-y-5 rounded-3xl border border-line bg-white p-6 shadow-2xl outline-none animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-line pb-4">
          <div className="flex items-center space-x-3">
            <div
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${
                active.danger ? 'bg-danger/15 text-danger' : 'bg-warning/15 text-warning'
              }`}
            >
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-ink">{active.title}</h3>
              <p className="text-xs font-medium text-muted">Action Requires Confirmation</p>
            </div>
          </div>
          <Button
            type="button"
            onClick={() => close(false)}
            variant="iconGhost"
            size="iconSm"
            className="text-muted hover:bg-surface hover:text-muted"
            aria-label="Cancel"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <p className="text-xs font-medium leading-relaxed text-muted">{active.message}</p>

        <div className="flex items-center justify-end space-x-3 pt-2">
          <Button type="button" variant="outline" onClick={() => close(false)}>
            {active.cancelLabel || 'Cancel'}
          </Button>
          <Button
            type="button"
            onClick={() => close(true)}
            className={
              active.danger ? 'bg-danger text-white hover:bg-danger/90' : 'bg-brand text-white hover:bg-brand-deep'
            }
          >
            {active.confirmLabel || 'Confirm'}
          </Button>
        </div>
      </div>
    </div>
  );
};
