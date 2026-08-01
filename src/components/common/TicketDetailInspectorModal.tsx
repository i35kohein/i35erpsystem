import React from 'react';
import {
  Banknote,
  CalendarDays,
  Clock3,
  Contact,
  FileText,
  Hash,
  History,
  Lock,
  MapPin,
  MessageSquareWarning,
  Phone,
  Printer,
  ScanLine,
  Smartphone,
  Ticket,
  Trash2,
  UserRound,
  X,
} from 'lucide-react';
import { AppUser, WorkOrder } from '../../types';
import { get21AfterDiagnostics, get21Diagnostics } from '../../utils/diagnosticUtils';
import { getRealisticColorStyle } from '../intake/deviceData';

interface TicketDetailInspectorModalProps {
  workOrder: WorkOrder;
  currentUser?: AppUser;
  onClose: () => void;
  onPrint?: (workOrder: WorkOrder) => void;
  onDelete?: (id: string) => void;
}

export const TicketDetailInspectorModal: React.FC<TicketDetailInspectorModalProps> = ({
  workOrder,
  currentUser,
  onClose,
  onPrint,
  onDelete,
}) => {
  const [activeTab, setActiveTab] = React.useState<'details' | 'log'>('details');
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
  const intakeTime = new Date(workOrder.createdAt).getTime();
  const hasLeftShop = ['Taken Out', 'Cant Repair', 'Customer Not Repair'].includes(workOrder.status);
  const shopTimeEnd = hasLeftShop ? new Date(workOrder.updatedAt || workOrder.createdAt).getTime() : Date.now();
  const totalShopHours = Number.isFinite(intakeTime)
    ? Math.max(0, Math.floor((shopTimeEnd - intakeTime) / (1000 * 60 * 60)))
    : 0;
  const shopDays = Math.floor(totalShopHours / 24);
  const shopHours = totalShopHours % 24;
  const timeInShop =
    totalShopHours < 1
      ? 'Less than 1 hour'
      : `${shopDays > 0 ? `${shopDays} ${shopDays === 1 ? 'day' : 'days'} ` : ''}${shopHours} ${
          shopHours === 1 ? 'hour' : 'hours'
        }`.trim();
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

  const statusClass = (status: string) => {
    if (status === 'Pass') return 'border-emerald-200 bg-emerald-50 text-emerald-700';
    if (status === 'Fail') return 'border-rose-200 bg-rose-50 text-rose-700';
    return 'border-[var(--border)] bg-[var(--bg)] text-[var(--text-muted)]';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-3 sm:p-5">
      <div className="flex h-[92vh] max-h-[760px] min-h-0 w-full max-w-5xl flex-col overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card-bg)] shadow-xl">
        <header className="flex items-center justify-between gap-3 border-b border-[var(--border)] px-4 py-3 sm:px-5">
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--blue-tint)] text-[var(--primary)]">
              <Ticket className="h-4 w-4" />
            </span>
            <h2 className="whitespace-nowrap text-sm font-black text-[var(--text-main)]">Ticket Details</h2>
            <span className="h-4 w-px bg-[var(--border)]" />
            <span className="inline-flex min-w-0 items-center gap-1.5 rounded-md border border-[var(--border)] bg-[var(--bg)] px-2.5 py-1 font-mono text-[11px] font-black text-[var(--primary)]">
              <Hash className="h-3 w-3 shrink-0" />
              <span className="truncate">{workOrder.orderNumber}</span>
            </span>
            {workOrder.priority === 'Urgent' && (
              <span className="inline-flex h-6 shrink-0 items-center gap-1.5 rounded-md border border-rose-200 bg-rose-50 px-2 text-[9px] font-extrabold uppercase tracking-[0.08em] text-rose-700">
                <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                Urgent
              </span>
            )}
            <span className="inline-flex h-6 shrink-0 items-center gap-1.5 rounded-md border border-[var(--border)] bg-[var(--blue-tint)] px-2 text-[9px] font-extrabold uppercase tracking-[0.08em] text-[var(--primary)]">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--primary)]" />
              {workOrder.status}
            </span>
          </div>

          <div className="flex shrink-0 items-center gap-1">
            {onPrint && (
              <button
                type="button"
                onClick={() => onPrint(workOrder)}
                aria-label="Print ticket sticker"
                title="Print sticker"
                className="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--text-muted)] transition-colors hover:bg-[var(--bg)] hover:text-[var(--primary)]"
              >
                <Printer className="h-4 w-4" />
              </button>
            )}

            {currentUser?.role === 'Admin' && onDelete ? (
              <button
                type="button"
                aria-label="Delete ticket"
                title="Delete ticket"
                onClick={() => {
                  if (window.confirm(`Are you sure you want to delete ticket ${workOrder.orderNumber || workOrder.id}?`)) {
                    onDelete(workOrder.id);
                    onClose();
                  }
                }}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--text-muted)] transition-colors hover:bg-rose-50 hover:text-rose-600"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            ) : (
              <span
                aria-label="Delete locked"
                title="Delete locked"
                className="flex h-9 w-9 cursor-not-allowed items-center justify-center rounded-lg text-[var(--text-muted)] opacity-40"
              >
                <Lock className="h-4 w-4" />
              </span>
            )}

            <button
              type="button"
              onClick={onClose}
              aria-label="Close ticket details"
              title="Close"
              className="ml-1 flex h-9 w-9 items-center justify-center rounded-lg text-[var(--text-muted)] transition-colors hover:bg-[var(--bg)] hover:text-[var(--text-main)]"
            >
              <X className="h-4.5 w-4.5" />
            </button>
          </div>
        </header>

        <nav className="flex items-center gap-1 border-b border-[var(--border)] bg-[var(--bg)] px-4 py-1.5 sm:px-5" aria-label="Ticket detail sections">
          <button
            type="button"
            onClick={() => setActiveTab('details')}
            className={`inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-[11px] font-extrabold transition-colors ${
              activeTab === 'details'
                ? 'bg-[var(--card-bg)] text-[var(--primary)] shadow-sm ring-1 ring-[var(--border)]'
                : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
            }`}
          >
            <FileText className="h-3.5 w-3.5" />
            Details
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('log')}
            className={`inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-[11px] font-extrabold transition-colors ${
              activeTab === 'log'
                ? 'bg-[var(--card-bg)] text-[var(--primary)] shadow-sm ring-1 ring-[var(--border)]'
                : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
            }`}
          >
            <History className="h-3.5 w-3.5" />
            Log
            <span className="inline-flex min-w-5 justify-center rounded-full bg-[var(--blue-tint)] px-1.5 py-0.5 text-[9px] text-[var(--primary)]">
              {repairLogs.length}
            </span>
          </button>
        </nav>

        {activeTab === 'details' ? (
          <div
            className="grid min-h-0 flex-1 grid-cols-1 overflow-y-scroll md:grid-cols-[250px_minmax(0,1fr)]"
            style={{ scrollbarGutter: 'stable' }}
          >
          <aside className="border-b border-[var(--border)] bg-[var(--bg)] p-4 md:border-b-0 md:border-r md:p-5">
            <div className="space-y-5">
              <div>
                <div className="flex items-start gap-2">
                  <Smartphone className="mt-0.5 h-4 w-4 shrink-0 text-[var(--primary)]" />
                  <h3 className="text-lg font-black leading-6 text-[var(--text-main)]">{workOrder.deviceModel}</h3>
                </div>
                <div
                  className={`mt-2 h-2.5 w-full overflow-hidden rounded-sm border border-white shadow-sm ${deviceColor.border}`}
                  style={{ background: deviceColor.gradient }}
                  aria-label={`${workOrder.deviceColor || 'Standard'} device color`}
                />
                <div className="mt-1.5 flex items-center gap-1.5 text-[10px] font-bold text-[var(--text-muted)]">
                  <span
                    className={`h-2 w-2 shrink-0 rounded-sm border border-white shadow-sm ${deviceColor.border}`}
                    style={{ background: deviceColor.gradient }}
                    aria-hidden="true"
                  />
                  <span className="truncate">{workOrder.deviceColor || 'Standard'}</span>
                </div>
              </div>

              <dl className="divide-y divide-[var(--border)] border-y border-[var(--border)] text-xs">
                {[
                  ['Customer Name', workOrder.customerName || 'Unknown customer', UserRound],
                  ['Address', workOrder.customerAddress || 'No address', MapPin],
                  ['Contact', workOrder.customerPhone || 'No phone', Phone],
                  ['Serial / IMEI', workOrder.serialNumber || workOrder.imei || 'N/A', ScanLine],
                  ['Technician', workOrder.assignedTechName || 'Unassigned', Contact],
                  ['Intake Date', new Date(workOrder.createdAt).toLocaleDateString(), CalendarDays],
                  ['Time in Shop', timeInShop, Clock3],
                ].map(([label, value, Icon]) => (
                  <div key={label as string} className="flex items-center gap-2.5 py-2.5">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[var(--blue-tint)] text-[var(--primary)]">
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                    <div className="min-w-0">
                      <dt className="text-[9px] font-extrabold uppercase tracking-wider text-[var(--text-muted)]">{label}</dt>
                      <dd className="mt-0.5 truncate font-bold text-[var(--text-main)]">{value}</dd>
                    </div>
                  </div>
                ))}
                <div className="flex items-center gap-2.5 py-2.5">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[var(--blue-tint)] text-[var(--primary)]">
                    <Banknote className="h-3.5 w-3.5" />
                  </span>
                  <div className="min-w-0">
                    <dt className="text-[9px] font-extrabold uppercase tracking-wider text-[var(--text-muted)]">Total Estimate</dt>
                    <dd className="mt-0.5 font-mono text-base font-black text-[var(--primary)]">
                      {(workOrder.totalAmount || workOrder.subtotal || 0).toLocaleString()} MMK
                    </dd>
                  </div>
                </div>
              </dl>
            </div>
          </aside>

          <main className="min-w-0 space-y-4 p-4 sm:p-5">
            {cleanNotes && (
              <div className="rounded-lg border border-amber-200 bg-amber-50/80 p-3 text-xs shadow-sm">
                <div className="flex items-start gap-2.5">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
                    <MessageSquareWarning className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <span className="block text-xs font-black uppercase tracking-wide text-amber-900">Reported issue / Comment</span>
                    <p className="mt-1 whitespace-pre-wrap font-semibold leading-relaxed text-amber-950">{cleanNotes}</p>
                  </div>
                </div>
              </div>
            )}

            <section className="rounded-lg border border-[var(--border)] bg-[var(--bg)] p-3">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border)] pb-2.5">
                <span className="text-xs font-black text-[var(--text-main)]">21-Point Hardware Diagnostic Comparison</span>
                <div className="flex items-center gap-3 text-[9px] font-bold text-[var(--text-muted)]">
                  <span className="flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-[var(--primary)]" />
                    Before intake
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-violet-500" />
                    After QA
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {diagnosticRows.map(({ beforeItem, afterItem }, index) => (
                  <div
                    key={beforeItem.id || beforeItem.name}
                    className={`flex min-h-12 items-center justify-between gap-2 rounded-lg border px-2.5 py-2 ${
                      beforeItem.status === 'Fail' || afterItem.status === 'Fail'
                        ? 'border-rose-200 bg-rose-50/70'
                        : 'border-[var(--border)] bg-[var(--card-bg)]'
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-xs font-extrabold text-[var(--text-main)]">
                        <span className="mr-2 font-mono text-[10px] text-[var(--text-muted)]">{index + 1}.</span>
                        {beforeItem.name}
                      </p>
                      {(afterItem.note || beforeItem.note) && (
                        <p className="mt-0.5 max-w-32 truncate pl-5 text-[9px] italic text-[var(--text-muted)]">
                          {afterItem.note || beforeItem.note}
                        </p>
                      )}
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <span className={`inline-flex min-w-14 justify-center rounded-md border px-2 py-1 text-[9px] font-extrabold uppercase ${statusClass(beforeItem.status)}`}>
                        {beforeItem.status}
                      </span>
                      <span className="text-[9px] font-bold text-[var(--text-muted)]">→</span>
                      <span className={`inline-flex min-w-14 justify-center rounded-md border px-2 py-1 text-[9px] font-extrabold uppercase ${statusClass(afterItem.status)}`}>
                        {afterItem.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </main>
          </div>
        ) : (
          <main
            className="min-h-0 flex-1 overflow-y-scroll bg-[var(--bg)] p-4 sm:p-5"
            style={{ scrollbarGutter: 'stable' }}
          >
            <section className="mx-auto max-w-3xl rounded-lg border border-[var(--border)] bg-[var(--card-bg)]">
              <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] px-4 py-3">
                <div>
                  <h3 className="text-sm font-black text-[var(--text-main)]">Repair Activity Log</h3>
                  <p className="mt-0.5 text-[10px] font-medium text-[var(--text-muted)]">
                    Status changes and updates recorded from the repair pipeline.
                  </p>
                </div>
                <span className="shrink-0 text-[10px] font-extrabold text-[var(--text-muted)]">
                  {repairLogs.length} {repairLogs.length === 1 ? 'event' : 'events'}
                </span>
              </div>

              {repairLogs.length > 0 ? (
                <ol className="divide-y divide-[var(--border)]">
                  {repairLogs.map((log, index) => (
                    <li key={log.id} className="relative flex gap-3 px-4 py-3.5">
                      <div className="relative flex shrink-0 flex-col items-center">
                        <span className="z-10 flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--blue-tint)] text-[var(--primary)]">
                          <History className="h-4 w-4" />
                        </span>
                        {index < repairLogs.length - 1 && (
                          <span className="absolute top-8 h-[calc(100%+14px)] w-px bg-[var(--border)]" aria-hidden="true" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <span className="text-xs font-black text-[var(--text-main)]">{log.author || 'System'}</span>
                          {log.statusChange && (
                            <span className="inline-flex rounded-md border border-[var(--border)] bg-[var(--blue-tint)] px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wide text-[var(--primary)]">
                              {log.statusChange}
                            </span>
                          )}
                          <time className="ml-auto text-[10px] font-semibold text-[var(--text-muted)]">{log.timestamp}</time>
                        </div>
                        <p className="mt-1.5 whitespace-pre-wrap text-xs font-medium leading-relaxed text-[var(--text-secondary)]">
                          {log.note}
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>
              ) : (
                <div className="flex min-h-56 flex-col items-center justify-center px-6 py-10 text-center">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--blue-tint)] text-[var(--primary)]">
                    <History className="h-5 w-5" />
                  </span>
                  <p className="mt-3 text-sm font-black text-[var(--text-main)]">No repair logs yet</p>
                  <p className="mt-1 max-w-sm text-xs leading-relaxed text-[var(--text-muted)]">
                    Pipeline status changes and technician updates will appear here.
                  </p>
                </div>
              )}
            </section>
          </main>
        )}

        <footer className="flex items-center justify-between border-t border-[var(--border)] px-4 py-3 sm:px-5">
          <span className="text-xs font-bold text-[var(--text-muted)]">Repair ticket record</span>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-[var(--primary)] px-4 py-2 text-xs font-extrabold text-white transition-colors hover:bg-[var(--primary-hover)]"
          >
            Close
          </button>
        </footer>
      </div>
    </div>
  );
};
