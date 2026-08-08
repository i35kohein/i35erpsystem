import React from 'react';
import { Button, DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '../ui';
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
  PencilLine,
  ScanLine,
  Smartphone,
  Ticket,
  Trash2,
  UserRound,
  X,
  MoreHorizontal,
} from 'lucide-react';
import { AppUser, WorkOrder } from '../../types';
import { get21AfterDiagnostics, get21Diagnostics } from '../../utils/diagnosticUtils';
import { getRealisticColorStyle } from '../intake/deviceData';

interface TicketDetailInspectorModalProps {
  workOrder: WorkOrder;
  currentUser?: AppUser;
  onClose: () => void;
  onPrint?: (workOrder: WorkOrder) => void;
  onEdit?: (workOrder: WorkOrder) => void;
  onDelete?: (id: string) => void;
}

export const TicketDetailInspectorModal: React.FC<TicketDetailInspectorModalProps> = ({
  workOrder,
  currentUser,
  onClose,
  onPrint,
  onEdit,
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
                    onSelect={() => {
                      if (window.confirm(`Are you sure you want to delete ticket ${workOrder.orderNumber || workOrder.id}?`)) {
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
            className="grid min-h-0 flex-1 grid-cols-1 overflow-y-scroll md:grid-cols-[250px_minmax(0,1fr)]" tabIndex={0}
            style={{ scrollbarGutter: 'stable' }}
          >
          <aside aria-label="Ticket summary" className="border-b border-line bg-surface p-4 md:border-b-0 md:border-r md:p-5">
            <div className="space-y-5">
              <div>
                <div className="flex items-start gap-2">
                  <Smartphone className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
                  <h3 className="text-lg font-black leading-6 text-ink">{workOrder.deviceModel}</h3>
                </div>
                <div className="mt-2 rounded-md border border-line bg-white px-2.5 py-2">
                  <p className="text-xs font-black uppercase tracking-wider text-muted">Repair Category</p>
                  <p className="mt-0.5 text-xs font-bold leading-snug text-ink">
                    {repairCategoryLabel}
                  </p>
                </div>
                <div
                  className={`mt-2 h-2.5 w-full overflow-hidden rounded-sm border border-white shadow-sm ${deviceColor.border}`}
                  style={{ background: deviceColor.gradient }}
                  aria-hidden="true"
                />
                <div className="mt-1.5 flex items-center gap-1.5 text-xs font-bold text-muted">
                  <span
                    className={`h-2 w-2 shrink-0 rounded-sm border border-white shadow-sm ${deviceColor.border}`}
                    style={{ background: deviceColor.gradient }}
                    aria-hidden="true"
                  />
                  <span className="truncate">{workOrder.deviceColor || 'Standard'}</span>
                </div>
              </div>

              <div className="divide-y divide-line border-y border-line text-xs">
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
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-brand-soft text-brand">
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                    <div className="min-w-0">
                      <div className="text-xs font-extrabold uppercase tracking-wider text-muted">{typeof label === 'string' ? label : null}</div>
                      <p className="mt-0.5 truncate font-bold text-ink">{typeof value === 'string' ? value : null}</p>
                    </div>
                  </div>
                ))}
                <div className="flex items-center gap-2.5 py-2.5">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-brand-soft text-brand">
                    <Banknote className="h-3.5 w-3.5" />
                  </span>
                  <div className="min-w-0">
                    <div className="text-xs font-extrabold uppercase tracking-wider text-muted">Total Estimate</div>
                    <p className="mt-0.5 font-mono text-base font-black text-brand">
                      {(workOrder.totalAmount || workOrder.subtotal || 0).toLocaleString()} MMK
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </aside>

          <section className="min-w-0 space-y-4 p-4 sm:p-5">
            {cleanNotes && (
              <div className="rounded-lg border border-warning/30 bg-warning/10/80 p-3 text-xs shadow-sm">
                <div className="flex items-start gap-2.5">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-warning/15 text-warning">
                    <MessageSquareWarning className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <span className="block text-xs font-black uppercase tracking-wide text-warning">Reported issue / Comment</span>
                    <p className="mt-1 whitespace-pre-wrap font-semibold leading-relaxed text-warning">{cleanNotes}</p>
                  </div>
                </div>
              </div>
            )}

            <section className="rounded-lg border border-line bg-surface p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-line pb-2.5">
                <span className="text-xs font-black text-ink">21-Point Hardware Diagnostic Comparison</span>
                <span className="rounded-md border border-line bg-white px-2 py-0.5 text-xs font-extrabold text-muted">
                  {diagnosticRows.length} checks
                </span>
              </div>

              <div className="overflow-hidden rounded-lg border border-line">
                {/* Mini table header */}
                <div className="sticky top-0 z-10 grid grid-cols-[24px_minmax(0,1fr)_auto_auto] items-center gap-x-3 border-b border-line bg-surface px-3 py-1.5 text-xs font-extrabold uppercase tracking-wider text-muted">
                  <span>#</span>
                  <span>Check item</span>
                  <span className="w-14 text-right">Before</span>
                  <span className="w-14 text-right">After</span>
                </div>
                <div className="divide-y divide-line">
                  {diagnosticRows.map(({ beforeItem, afterItem }, index) => {
                    const hasFail = beforeItem.status === 'Fail' || afterItem.status === 'Fail';
                    const statusText = (status: string) =>
                      status === 'Pass' ? 'text-success'
                      : status === 'Fail' ? 'text-danger font-extrabold'
                      : 'text-muted';
                    return (
                      <div
                        key={beforeItem.id || beforeItem.name}
                        className={`grid grid-cols-[24px_minmax(0,1fr)_auto_auto] items-baseline gap-x-3 px-3 py-1.5 ${hasFail ? 'bg-danger/10/50' : ''}`}
                      >
                        <span className="font-mono text-xs text-muted">{index + 1}</span>
                        <span className="min-w-0 text-xs font-semibold text-ink">
                          {beforeItem.name}
                          {(afterItem.note || beforeItem.note) && (
                            <span className="ml-1.5 text-xs font-normal italic text-muted">
                              — {afterItem.note || beforeItem.note}
                            </span>
                          )}
                        </span>
                        <span className={`w-14 text-right text-xs font-bold uppercase ${statusText(beforeItem.status)}`}>
                          {beforeItem.status}
                        </span>
                        <span className={`w-14 text-right text-xs font-bold uppercase ${statusText(afterItem.status)}`}>
                          {afterItem.status}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>
          </section>
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
