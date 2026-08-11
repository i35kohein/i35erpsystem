import React from 'react';
import { Button, DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '../ui';
import {
  FileText,
  Hash,
  History,
  Lock,
  MoreHorizontal,
  PencilLine,
  Printer,
  Ticket,
  Trash2,
  X,
} from 'lucide-react';
import { AppUser, WorkOrder } from '../../types';
import { get21AfterDiagnostics, get21Diagnostics } from '../../utils/diagnosticUtils';
import { getRealisticColorStyle } from '../intake/deviceData';
import { confirmDialog } from './ConfirmDialog';

interface TicketDetailInspectorModalProps {
  workOrder: WorkOrder;
  currentUser?: AppUser;
  onClose: () => void;
  onPrint?: (workOrder: WorkOrder) => void;
  onEdit?: (workOrder: WorkOrder) => void;
  onDelete?: (id: string) => void;
  /** Add a manual log entry to the ticket (Ko Hein 2026-08-11). */
  onAddLog?: (workOrder: WorkOrder, note: string) => void;
}

export const TicketDetailInspectorModal: React.FC<TicketDetailInspectorModalProps> = ({
  workOrder,
  currentUser,
  onClose,
  onPrint,
  onEdit,
  onDelete,
  onAddLog,
}) => {
  const [activeTab, setActiveTab] = React.useState<'details' | 'log'>('details');
  const [logDraft, setLogDraft] = React.useState('');
  const [isSavingLog, setIsSavingLog] = React.useState(false);
  const rawNotes = workOrder.symptomsReported || '';
  const cleanNotes = rawNotes
    .split('\n')
    .filter((line) => {
      const text = line.trim();
      if (!text || text.startsWith('Requested Repairs:')) return false;
      if (text.toLowerCase().startsWith('town / city:')) return false;
      if (text.toLowerCase().startsWith('town/city:')) return false;
      return true;
    })
    .map((line) => line.replace(/^Notes:\s*/i, '').trim())
    .filter(Boolean)
    .join('\n')
    .trim();

  const beforeList = get21Diagnostics(
    workOrder.beforeDiagnostics,
    workOrder.symptomsReported,
    workOrder.intakeChecklist
  );
  const afterList = get21AfterDiagnostics(
    workOrder.afterDiagnostics,
    workOrder.beforeDiagnostics,
    workOrder.symptomsReported,
    workOrder.intakeChecklist
  );
  const diagnosticRows = beforeList.map((beforeItem, index) => ({
    beforeItem,
    afterItem: afterList[index] || beforeItem,
  }));
  const deviceColor = getRealisticColorStyle(workOrder.deviceColor || 'Standard');

  // Simple Ticket style 3-state circle (Pass ✓ / Fail ✕ / N/A empty).
  const StatusDot = ({ status, label }: { status: string; label: string }) => (
    <span
      title={label}
      aria-label={label}
      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border text-[10px] font-black leading-none ${
        status === 'Pass'
          ? 'border-success bg-success text-white'
          : status === 'Fail'
          ? 'border-danger bg-danger text-white'
          : 'border-line bg-white text-muted'
      }`}
    >
      {status === 'Pass' ? '✓' : status === 'Fail' ? '✕' : ''}
    </span>
  );
  const repairSummary = workOrder.selectedRepairs?.length
    ? Array.from(new Set(workOrder.selectedRepairs.map((repair) => repair.name.trim()).filter(Boolean))).join(' • ')
    : (workOrder.lineItems || [])
        .filter((item) => !item.isLabor)
        .map((item) => item.partName || item.description)
        .filter(Boolean)
        .join(' • ');
  const repairCategoryLabel = repairSummary || 'Not specified';
  const savedRepairLogs = workOrder.repairLogs || [];
  const intakeLog = {
    id: `intake-${workOrder.id}`,
    timestamp: new Date(workOrder.createdAt).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }),
    author: 'Intake Desk',
    note: `Ticket created for ${workOrder.deviceModel}.`,
    statusChange: 'Receive',
  };
  const repairLogs = [
    ...savedRepairLogs,
    ...(savedRepairLogs.some((log) => log.statusChange === 'Receive') ? [] : [intakeLog]),
  ].sort((a, b) => {
    const bTime = new Date(b.timestamp).getTime();
    const aTime = new Date(a.timestamp).getTime();
    return (Number.isFinite(bTime) ? bTime : 0) - (Number.isFinite(aTime) ? aTime : 0);
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-3 sm:p-5">
      <div className="flex h-[92vh] max-h-[760px] min-h-0 w-full max-w-5xl flex-col overflow-hidden rounded-xl border border-line bg-white shadow-xl">
        <header className="flex items-center justify-between gap-3 border-b border-line px-4 py-3 sm:px-5">
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand">
              <Ticket className="h-4 w-4" />
            </span>
            <h2 className="whitespace-nowrap text-sm font-black text-ink">Ticket Details</h2>
            <span className="h-4 w-px bg-line" />
            <span className="inline-flex min-w-0 items-center gap-1.5 rounded-md border border-line bg-surface px-2.5 py-1 font-mono text-xs font-black text-brand">
              <Hash className="h-3 w-3 shrink-0" />
              <span className="truncate">{workOrder.orderNumber}</span>
            </span>
            {workOrder.priority === 'Urgent' && (
              <span className="inline-flex h-6 shrink-0 items-center gap-1.5 rounded-md border border-danger/30 bg-danger/10 px-2 text-xs font-extrabold uppercase tracking-[0.08em] text-danger">
                <span className="h-1.5 w-1.5 rounded-full bg-danger/100" />
                Urgent
              </span>
            )}
            <span className="inline-flex h-6 shrink-0 items-center gap-1.5 rounded-md border border-line bg-brand-soft px-2 text-xs font-extrabold uppercase tracking-[0.08em] text-brand">
              <span className="h-1.5 w-1.5 rounded-full bg-brand" />
              {workOrder.status}
            </span>
          </div>

          <div className="flex shrink-0 items-center gap-1">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="iconGhost"
                  size="icon"
                  aria-label="Ticket actions"
                  title="Ticket actions"
                  className="text-muted hover:bg-surface hover:text-ink"
                >
                  <MoreHorizontal className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {onEdit && (
                  <DropdownMenuItem onSelect={() => onEdit(workOrder)}>
                    <PencilLine className="h-4 w-4" /> Edit ticket
                  </DropdownMenuItem>
                )}
                {onPrint && (
                  <DropdownMenuItem onSelect={() => onPrint(workOrder)}>
                    <Printer className="h-4 w-4" /> Print sticker
                  </DropdownMenuItem>
                )}
                {currentUser?.role === 'Admin' && onDelete ? (
                  <DropdownMenuItem
                    destructive
                    onSelect={async () => {
                      const ok = await confirmDialog({ title: 'Delete Ticket', message: `Are you sure you want to delete ticket ${workOrder.orderNumber || workOrder.id}?`, confirmLabel: 'Delete Ticket', danger: true });
                      if (ok) {
                        onDelete(workOrder.id);
                        onClose();
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4" /> Delete ticket
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem disabled>
                    <Lock className="h-4 w-4" /> Delete locked
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
                variant="iconGhost"
              type="button"
              onClick={onClose}
              aria-label="Close ticket details"
              title="Close"
              className="ml-1 flex min-h-10 min-w-10 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface hover:text-ink"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </header>

        <nav className="flex items-center gap-1 border-b border-line bg-surface px-4 py-1.5 sm:px-5" role="tablist" aria-label="Ticket detail sections">
          <Button
            variant="ghost"
            type="button"
            role="tab"
            id="inspector-tab-details"
            aria-selected={activeTab === 'details'}
            aria-controls="inspector-panel-details"
            onClick={() => setActiveTab('details')}
            className={`inline-flex min-h-10 items-center gap-1.5 rounded-md px-3 text-xs font-extrabold transition-colors ${
              activeTab === 'details'
                ? 'bg-white text-brand shadow-sm ring-1 ring-line'
                : 'text-muted hover:text-ink'
            }`}
          >
            <FileText className="h-3.5 w-3.5" />
            Details
          </Button>
          <Button
            variant="ghost"
            type="button"
            role="tab"
            id="inspector-tab-log"
            aria-selected={activeTab === 'log'}
            aria-controls="inspector-panel-log"
            onClick={() => setActiveTab('log')}
            className={`inline-flex min-h-10 items-center gap-1.5 rounded-md px-3 text-xs font-extrabold transition-colors ${
              activeTab === 'log'
                ? 'bg-white text-brand shadow-sm ring-1 ring-line'
                : 'text-muted hover:text-ink'
            }`}
          >
            <History className="h-3.5 w-3.5" />
            Log
            <span className="inline-flex min-w-5 justify-center rounded-full bg-brand-soft px-1.5 py-0.5 text-xs text-brand">
              {repairLogs.length}
            </span>
          </Button>
        </nav>

        {activeTab === 'details' ? (
          <div
            id="inspector-panel-details"
            role="tabpanel"
            aria-labelledby="inspector-tab-details"
            className="min-h-0 flex-1 overflow-y-scroll p-4 sm:p-5"
            style={{ scrollbarGutter: 'stable' }}
            tabIndex={0}
          >
            {/* Simple Ticket style: 2-column grid — Customer Data | Phone Testing & Checking (before + after) (Ko Hein 2026-08-10) */}
            <div className="mx-auto grid max-w-4xl grid-cols-1 gap-5 lg:grid-cols-2 lg:gap-6">
              {/* LEFT — Customer Data (mirrors the Simple Ticket form, read-only) */}
              <div className="flex flex-col divide-y divide-line">
                <div className="flex items-center justify-between border-b border-line pb-2">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-muted">Customer Data</span>
                  <span className="shrink-0 font-mono text-[11px] font-black text-brand">
                    {workOrder.selectedRepairs?.length
                      ? `${workOrder.selectedRepairs.length} repair${workOrder.selectedRepairs.length > 1 ? 's' : ''}`
                      : '—'}
                  </span>
                </div>

                {(
                  [
                    ['Phone', workOrder.customerPhone || '—'],
                    ['Name', workOrder.customerName || 'Walk-in Customer'],
                    ['Model', workOrder.deviceModel || 'Unknown Model'],
                    ['Serial / IMEI', workOrder.serialNumber || workOrder.imei || '—'],
                    ['Received', new Date(workOrder.createdAt).toLocaleDateString()],
                    ['Repairs', repairCategoryLabel],
                    ['Passcode', workOrder.passcode || '—'],
                  ] as Array<[string, string]>
                ).map(([label, value]) => (
                  <div key={label} className="flex items-center gap-3 py-2">
                    <span className="w-32 shrink-0 text-[11px] font-extrabold uppercase tracking-wider text-muted">{label}</span>
                    <span className="min-w-0 flex-1 truncate text-sm font-semibold text-ink" title={value}>
                      {value}
                    </span>
                  </div>
                ))}

                {/* Color — swatch + name (same as Simple Ticket color row) */}
                <div className="flex items-center gap-3 py-2">
                  <span className="w-32 shrink-0 text-[11px] font-extrabold uppercase tracking-wider text-muted">Color</span>
                  <span className="flex min-w-0 items-center gap-2 text-sm font-semibold text-ink">
                    <span
                      className={`h-5 w-5 shrink-0 rounded-full border-2 border-white shadow ${deviceColor.border}`}
                      style={{ background: deviceColor.gradient }}
                    />
                    <span className="truncate">{workOrder.deviceColor || 'Standard'}</span>
                  </span>
                </div>

                {/* Intake note — multi-line like the form's textarea */}
                <div className="flex items-start gap-3 py-2">
                  <span className="w-32 shrink-0 pt-2.5 text-[11px] font-extrabold uppercase tracking-wider text-muted">Intake Note</span>
                  <p className={`min-w-0 flex-1 whitespace-pre-wrap text-sm leading-snug ${cleanNotes ? 'font-semibold text-ink' : 'font-normal text-muted/70'}`}>
                    {cleanNotes || 'No intake note'}
                  </p>
                </div>

                {/* Total estimate */}
                <div className="flex items-center gap-3 py-2.5">
                  <span className="w-32 shrink-0 text-[11px] font-extrabold uppercase tracking-wider text-muted">Total Estimate</span>
                  <span className="font-mono text-base font-black text-brand">
                    {(workOrder.totalAmount || workOrder.subtotal || 0).toLocaleString()} MMK
                  </span>
                </div>
              </div>

              {/* RIGHT — Phone Testing & Checking (before and after) */}
              <div className="lg:mt-0">
                <div className="flex items-center justify-between border-b border-line pb-2">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-muted">Phone Testing &amp; Checking</span>
                  <span className="flex shrink-0 items-center gap-1.5">
                    <span className="rounded-md border border-line bg-surface px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wide text-muted">Before · After</span>
                    <span className="font-mono text-[11px] font-black text-brand">{diagnosticRows.length} checks</span>
                  </span>
                </div>
                <div className="mt-0 grid grid-cols-1 gap-x-4 sm:grid-cols-2 sm:gap-x-8">
                  {diagnosticRows.map(({ beforeItem, afterItem }, index) => {
                    const hasFail = beforeItem.status === 'Fail' || afterItem.status === 'Fail';
                    const note = afterItem.note || beforeItem.note;
                    const anyChecked = beforeItem.status !== 'N/A' || afterItem.status !== 'N/A';
                    return (
                      <div
                        key={beforeItem.id || `${beforeItem.name}-${index}`}
                        className={`flex min-h-7 items-center gap-1.5 border-b border-line/60 py-1.5 ${hasFail ? 'bg-danger/10' : ''}`}
                      >
                        <StatusDot status={beforeItem.status} label={`Before: ${beforeItem.status}`} />
                        <StatusDot status={afterItem.status} label={`After: ${afterItem.status}`} />
                        <span
                          className={`min-w-0 flex-1 truncate text-xs font-semibold sm:text-sm ${anyChecked ? 'text-ink' : 'text-muted'}`}
                          title={beforeItem.name}
                        >
                          {beforeItem.name}
                        </span>
                        {note && (
                          <span className="max-w-[45%] shrink-0 truncate text-xs italic text-muted" title={note}>
                            {note}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <section
            id="inspector-panel-log"
            role="tabpanel"
            aria-labelledby="inspector-tab-log"
            className="min-h-0 flex-1 overflow-y-scroll bg-surface p-4 sm:p-5"
            style={{ scrollbarGutter: 'stable' }}
            tabIndex={0}
          >
            <section className="mx-auto max-w-3xl rounded-lg border border-line bg-white">
              <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
                <div>
                  <h3 className="text-sm font-black text-ink">Repair Activity Log</h3>
                  <p className="mt-0.5 text-xs font-medium text-muted">
                    Status changes and updates recorded from the repair pipeline.
                  </p>
                </div>
                <span className="shrink-0 text-xs font-extrabold text-muted">
                  {repairLogs.length} {repairLogs.length === 1 ? 'event' : 'events'}
                </span>
              </div>

              {/* Add log entry (Ko Hein 2026-08-11) */}
              {onAddLog && (
                <div className="border-b border-line bg-surface/60 px-4 py-3">
                  <div className="flex items-end gap-2">
                    <div className="min-w-0 flex-1">
                      <label htmlFor="inspector-log-note" className="mb-1 block text-[10px] font-black uppercase tracking-wider text-muted">
                        Add Log Entry
                      </label>
                      <textarea
                        id="inspector-log-note"
                        value={logDraft}
                        onChange={(e) => setLogDraft(e.target.value)}
                        placeholder="e.g. Replaced battery, waiting on customer approval…"
                        rows={2}
                        className="w-full resize-none rounded-lg border border-line bg-white px-3 py-2 text-xs font-medium text-ink outline-none placeholder:text-muted/60 focus:border-brand focus:ring-2 focus:ring-brand/20"
                      />
                    </div>
                    <Button
                      type="button"
                      disabled={!logDraft.trim() || isSavingLog}
                      onClick={() => {
                        if (!logDraft.trim() || !onAddLog) return;
                        setIsSavingLog(true);
                        onAddLog(workOrder, logDraft.trim());
                        setLogDraft('');
                        // Parent re-opens modal with updated wo via its own state;
                        // reset the flag on the next tick so the input stays usable.
                        setTimeout(() => setIsSavingLog(false), 300);
                      }}
                      className="shrink-0 rounded-lg bg-brand px-4 py-2 text-xs font-extrabold text-white transition-colors hover:bg-brand-deep disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Add Log
                    </Button>
                  </div>
                </div>
              )}

              {repairLogs.length > 0 ? (
                <ol className="divide-y divide-line">
                  {repairLogs.map((log, index) => (
                    <li key={log.id} className="relative flex gap-3 px-4 py-3.5">
                      <div className="relative flex shrink-0 flex-col items-center">
                        <span className="z-10 flex h-8 w-8 items-center justify-center rounded-lg bg-brand-soft text-brand">
                          <History className="h-4 w-4" />
                        </span>
                        {index < repairLogs.length - 1 && (
                          <span className="absolute top-8 h-[calc(100%+14px)] w-px bg-line" aria-hidden="true" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <span className="text-xs font-black text-ink">{log.author || 'System'}</span>
                          {log.statusChange && (
                            <span className="inline-flex rounded-md border border-line bg-brand-soft px-2 py-0.5 text-xs font-extrabold uppercase tracking-wide text-brand">
                              {log.statusChange}
                            </span>
                          )}
                          <time className="ml-auto text-xs font-semibold text-muted">{log.timestamp}</time>
                        </div>
                        <p className="mt-1.5 whitespace-pre-wrap text-xs font-medium leading-relaxed text-muted">
                          {log.note}
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>
              ) : (
                <div className="flex min-h-56 flex-col items-center justify-center px-6 py-10 text-center">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-soft text-brand">
                    <History className="h-5 w-5" />
                  </span>
                  <p className="mt-3 text-sm font-black text-ink">No repair logs yet</p>
                  <p className="mt-1 max-w-sm text-xs leading-relaxed text-muted">
                    Pipeline status changes and technician updates will appear here.
                  </p>
                </div>
              )}
            </section>
          </section>
        )}

        <footer className="flex items-center justify-between border-t border-line px-4 py-3 sm:px-5">
          <span className="text-xs font-bold text-muted">Repair ticket record</span>
          <Button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-brand px-4 py-2 text-xs font-extrabold text-white transition-colors hover:bg-brand-deep"
          >
            Close
          </Button>
        </footer>
      </div>
    </div>
  );
};
