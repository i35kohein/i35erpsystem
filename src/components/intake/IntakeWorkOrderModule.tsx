import React, { useEffect, useState, useMemo, lazy, Suspense } from 'react';
import { createPortal } from 'react-dom';
import { DateFilterState, filterByDateRange } from '../common/DateFilterSelector';

import { StatusBadge } from '../common/StatusBadge';
import { PriorityBadge } from '../common/PriorityBadge';

// Camera/barcode scanner is code-split: html5-qrcode (~340KB) only downloads
// when the scanner is actually opened, not when the intake module loads.
const CameraQrScannerModal = lazy(() => import('../common/CameraQrScannerModal').then((m) => ({ default: m.CameraQrScannerModal })));
import { ConfirmDeleteModal } from '../common/ConfirmDeleteModal';
import { Button } from '../ui';
import { TicketDetailInspectorModal } from '../common/TicketDetailInspectorModal';
import { confirmDialog } from '../common/ConfirmDialog';
import type { TicketPrefillData } from './CreateTicketSoloPage';
import {ClipboardList, Stethoscope, 
  Inbox,
  Ticket,
  LayoutGrid,
  Table as TableIcon,
  UserCheck,
  Wrench,
  Clock,
  CheckCircle2,
  MoveDiagonal2,
  Printer,
  Flame,
  DollarSign,
  RotateCcw,
  Ban,
  UserX,
  PackageCheck,
  Plus } from 'lucide-react';
import {WorkOrder, 
  PartItem, 
  Customer, 
  Technician,
  AppUser,
  RepairLogEntry,
  WorkOrderStatus,
  SystemSettings} from '../../types';
import { getRealisticColorStyle } from './deviceData';

export { APPLE_MODEL_SERIES, WARRANTY_OPTIONS, AVAILABLE_REPAIRS, DIAGNOSTIC_NAMES, getAvailableColorsForModel } from './deviceData';

interface IntakeWorkOrderModuleProps {
  workOrders: WorkOrder[];
  parts: PartItem[];
  customers: Customer[];
  technicians: Technician[];
  currentUser?: AppUser;
  onSaveWorkOrder: (wo: WorkOrder) => void;
  onSelectPrintTag: (wo: WorkOrder) => void;
  onOpenAiAssistant: () => void;
  onOpenNewWorkOrder?: (prefill?: any) => void;
  onDeleteWorkOrder?: (id: string) => void;
  searchQuery: string;
  setSearchQuery?: (q: string) => void;
  filterStatus?: string;
  setFilterStatus?: (s: string) => void;
  dateFilter?: DateFilterState;
  setDateFilter?: (d: DateFilterState) => void;
  onNavigateToCreateTicket?: (prefill?: TicketPrefillData) => void;
  onNavigateToTab?: (tab: string) => void;
  /** Controlled from the App filter drawer (mobile): view mode + priority sort + scan trigger */
  viewMode?: 'table' | 'cards';
  setViewMode?: (v: 'table' | 'cards') => void;
  sortByPriority?: boolean;
  setSortByPriority?: (v: boolean) => void;
  /** Increment to open the barcode/QR scanner from outside (drawer) */
  scanRequested?: number;
  /** Reopen QA: clear the passed checklist so the ticket flows back into QA (bug #12) */
  onReopenQa?: (id: string) => void;
  /** Direct status change from the roster (Ko Hein 2026-08-10) */
  onUpdateWorkOrderStatus?: (id: string, status: WorkOrderStatus) => void;
  /** Currency symbol from Settings (audit area-B) — falls back to MMK. */
  systemSettings?: SystemSettings;
}

export const IntakeWorkOrderModule: React.FC<IntakeWorkOrderModuleProps> = ({
  workOrders,
  systemSettings,
  technicians,
  currentUser,
  onSelectPrintTag,
  onOpenNewWorkOrder,
  onDeleteWorkOrder,
  onSaveWorkOrder,
  searchQuery,
  filterStatus: propFilterStatus,
  setFilterStatus: propSetFilterStatus,
  dateFilter: propDateFilter,
  onNavigateToCreateTicket,
  onNavigateToTab,
  viewMode: propViewMode,
  setViewMode: propSetViewMode,
  sortByPriority: propSortByPriority,
  setSortByPriority: propSetSortByPriority,
  scanRequested = 0,
  onReopenQa,
  onUpdateWorkOrderStatus,
}) => {
  const [selectedWorkOrder, setSelectedWorkOrder] = useState<WorkOrder | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState<boolean>(false);
  const [isCameraScannerOpen, setIsCameraScannerOpen] = useState<boolean>(false);
  const [ticketToDelete, setTicketToDelete] = useState<WorkOrder | null>(null);
  const [techAssignOpenId, setTechAssignOpenId] = useState<string | null>(null);
  const [statusPicker, setStatusPicker] = useState<{ id: string; left: number; top: number } | null>(null);
  const [localViewMode, setLocalViewMode] = useState<'table' | 'cards'>('cards');
  const viewMode = propViewMode !== undefined ? propViewMode : localViewMode;
  const setViewMode = (v: 'table' | 'cards') => (propSetViewMode ? propSetViewMode(v) : setLocalViewMode(v));
  // Currency token (audit area-B): matches POS/intake; MMK when Settings unavailable.
  const currency = systemSettings?.currencySymbol || 'MMK';

  // Phones default to the card grid — the 9-column table is unusable below md.
  // (User can still switch back to Table; manual choice is preserved.)
  useEffect(() => {
    if (window.innerWidth < 768) setViewMode('cards');
  }, []);
  const [localFilterStatus, setLocalFilterStatus] = useState<string>('Receive');
  const localDateFilter: DateFilterState = useMemo(() => ({ preset: 'all' }), []);

  const filterStatus = propFilterStatus !== undefined ? propFilterStatus : localFilterStatus;
  const setFilterStatus = propSetFilterStatus || setLocalFilterStatus;

  const dateFilter = propDateFilter !== undefined ? propDateFilter : localDateFilter;

  // Roster State (no pagination — all matching tickets shown, like Parts Inventory)
  const [localSortByPriority, setLocalSortByPriority] = useState<boolean>(false);
  const sortByPriority = propSortByPriority !== undefined ? propSortByPriority : localSortByPriority;
  const setSortByPriority = (v: boolean) => (propSetSortByPriority ? propSetSortByPriority(v) : setLocalSortByPriority(v));
  // Date sort for the roster — Latest (newest first, default) / Oldest (Ko Hein 2026-08-11).
  const [dateSort, setDateSort] = useState<'latest' | 'oldest'>('latest');

  // External scan trigger (mobile filter drawer → open scanner)
  useEffect(() => {
    if (scanRequested > 0) setIsCameraScannerOpen(true);
  }, [scanRequested]);

  // Esc closes the roster popovers (status picker / tech assign) — file-local
  // keydown handler (audit area-B).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      setStatusPicker(null);
      setTechAssignOpenId(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Tech assignment from the roster (Ko Hein 2026-08-10)
  const handleAssignTech = (wo: WorkOrder, techId: string) => {
    if (!onSaveWorkOrder) return;
    const isUnassign = techId === 'unassigned';
    const tech = isUnassign ? null : technicians?.find((t) => t.id === techId) || null;
    onSaveWorkOrder({
      ...wo,
      assignedTechId: isUnassign ? '' : techId,
      assignedTechName: isUnassign ? '' : tech?.name || '',
      updatedAt: new Date().toISOString(),
    });
    setTechAssignOpenId(null);
  };

  const getPriorityWeight = (priority: string) => {
    switch (priority) {
      case 'Urgent': return 4;
      case 'Warranty Redo': return 3;
      case 'B2B Priority': return 2;
      default: return 1;
    }
  };


  // Filter list by status, search query, and date range
  const dateFilteredOrders = filterByDateRange<WorkOrder>(workOrders, dateFilter);
  const filteredOrders = dateFilteredOrders.filter((wo) => {
    if (currentUser?.role === 'Technician') {
      const techName = currentUser.technicianName || currentUser.name || '';
      const techId = currentUser.technicianId || '';
      const isAssignedToMe =
        (techId && wo.assignedTechId === techId) ||
        (techName && wo.assignedTechName?.toLowerCase() === techName.toLowerCase()) ||
        (techName && (wo as any).assignedTechnician?.toLowerCase() === techName.toLowerCase());
      if (!isAssignedToMe) return false;
    }
    const matchesFilter = filterStatus === 'ALL' || wo.status === filterStatus;
    const query = searchQuery.toLowerCase();
    // Guard against legacy/partial records missing optional fields (audit B-P2).
    const matchesSearch =
      !query ||
      (wo.orderNumber || '').toLowerCase().includes(query) ||
      (wo.customerName || '').toLowerCase().includes(query) ||
      (wo.deviceModel || '').toLowerCase().includes(query) ||
      (wo.serialNumber || '').toLowerCase().includes(query) ||
      (wo.imei && wo.imei.toLowerCase().includes(query));
    return matchesFilter && matchesSearch;
  }).sort((a, b) => {
    if (sortByPriority) {
      const weightDiff = getPriorityWeight(b.priority) - getPriorityWeight(a.priority);
      if (weightDiff !== 0) return weightDiff;
    }
    // Date sort (Ko Hein 2026-08-11): Latest = newest first, Oldest = oldest first.
    const tA = new Date(a.createdAt).getTime();
    const tB = new Date(b.createdAt).getTime();
    return dateSort === 'oldest' ? tA - tB : tB - tA;
  });

  // Technician users see only their own tickets — stat chips must match the
  // roster list, not the global pool (audit P2).
  const techScopedOrders =
    currentUser?.role === 'Technician'
      ? dateFilteredOrders.filter((wo) => {
          const techName = currentUser.technicianName || currentUser.name || '';
          const techId = currentUser.technicianId || '';
          return (
            (techId && wo.assignedTechId === techId) ||
            (techName && wo.assignedTechName?.toLowerCase() === techName.toLowerCase()) ||
            (techName && (wo as any).assignedTechnician?.toLowerCase() === techName.toLowerCase())
          );
        })
      : dateFilteredOrders;

  // Summary Counts for Stats Bar
  const counts = {
    total: techScopedOrders.length,
    receive: techScopedOrders.filter(w => w.status === 'Receive').length,
    inProgress: techScopedOrders.filter(w => w.status === 'In Progress').length,
    pending: techScopedOrders.filter(w => w.status === 'Pending').length,
    finished: techScopedOrders.filter(w => w.status === 'Finished').length,
    takenOut: techScopedOrders.filter(w => w.status === 'Taken Out').length,
    rush: techScopedOrders.filter(w => w.priority === 'Urgent' || w.priority === 'Warranty Redo').length,
  };

  const rosterStatusActions: {
    value: WorkOrderStatus;
    label: string;
    shortLabel: string;
    icon: React.ElementType;
    color: string;
  }[] = [
    { value: 'Receive', label: 'Receive', shortLabel: 'In', icon: Inbox, color: '!bg-brand !text-white border-brand shadow-brand/20' },
    { value: 'In Progress', label: 'In Progress', shortLabel: 'Fix', icon: Wrench, color: '!bg-purple !text-white border-purple shadow-purple/20' },
    { value: 'Pending', label: 'Pending', shortLabel: 'Wait', icon: Clock, color: '!bg-warning !text-white border-warning shadow-warning/20' },
    { value: 'Finished', label: 'Finished', shortLabel: 'Done', icon: CheckCircle2, color: '!bg-success !text-white border-success shadow-success/20' },
    { value: 'Cant Repair', label: 'Cant Repair', shortLabel: 'No', icon: Ban, color: '!bg-danger !text-white border-danger shadow-danger/20' },
    { value: 'Customer Not Repair', label: 'Customer Not Repair', shortLabel: 'Skip', icon: UserX, color: '!bg-muted !text-white border-muted shadow-muted/20' },
    { value: 'Taken Out', label: 'Takeout', shortLabel: 'Out', icon: PackageCheck, color: '!bg-ink !text-white border-ink shadow-ink/20' },
  ];

  const renderStatusCirclePicker = (wo: WorkOrder) => {
    if (!onUpdateWorkOrderStatus) return <StatusBadge status={wo.status} size="xs" />;
    const currentStatus = rosterStatusActions.find((statusAction) => statusAction.value === wo.status) || rosterStatusActions[0];
    const CurrentIcon = currentStatus.icon;
    const isOpen = statusPicker?.id === wo.id;

    return (
      <div className="inline-flex items-center gap-1" aria-label={`Change status for ${wo.orderNumber || wo.id}`}>
        <Button
          variant="ghost"
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setTechAssignOpenId(null);
            if (isOpen) {
              setStatusPicker(null);
              return;
            }
            const rect = e.currentTarget.getBoundingClientRect();
            const menuWidth = 192;
            const menuHeight = 278;
            const gap = 8;
            const viewportPadding = 8;
            const left = Math.min(
              Math.max(viewportPadding, rect.right - menuWidth),
              window.innerWidth - menuWidth - viewportPadding
            );
            const opensDown = rect.bottom + gap + menuHeight <= window.innerHeight;
            const top = opensDown
              ? rect.bottom + gap
              : Math.max(viewportPadding, rect.top - menuHeight - gap);
            setStatusPicker({ id: wo.id, left, top });
          }}
          aria-expanded={isOpen}
          aria-label={`Current status ${currentStatus.label}. Change status.`}
          title={`Current: ${currentStatus.label}`}
          className={`!h-6 !min-h-6 w-6 shrink-0 px-0 flex items-center justify-center rounded-full border shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-brand/30 ${currentStatus.color}`}
        >
          <CurrentIcon className="h-3 w-3" />
        </Button>
        {/* Visible text anchor for the icon-only status circle (Ko Hein 2026-08-24 UX audit) */}
        <span className="text-[9px] font-black uppercase leading-none text-muted max-w-[52px] truncate">{currentStatus.shortLabel}</span>
        {isOpen && createPortal(
          <>
            <div className="fixed inset-0 z-40" onClick={() => setStatusPicker(null)} role="presentation" aria-hidden="true" />
            <div
              className="fixed z-50 w-48 rounded-xl border border-line bg-white p-1.5 shadow-xl"
              style={{ left: statusPicker.left, top: statusPicker.top }}
            >
              {rosterStatusActions.map((statusAction) => {
                const Icon = statusAction.icon;
                const isCurrent = wo.status === statusAction.value;
                return (
                  <Button
                    key={statusAction.value}
                    variant="ghost"
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setStatusPicker(null);
                      if (!isCurrent) onUpdateWorkOrderStatus(wo.id, statusAction.value);
                    }}
                    aria-pressed={isCurrent}
                    className={`flex w-full items-center justify-start gap-2 rounded-lg px-2.5 py-1.5 text-xs font-bold ${
                      isCurrent ? 'bg-surface text-ink' : 'text-muted hover:bg-surface hover:text-ink'
                    }`}
                  >
                    <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${statusAction.color}`}>
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                    <span className="truncate">{statusAction.label}</span>
                  </Button>
                );
              })}
            </div>
          </>,
          document.body
        )}
      </div>
    );
  };

  const renderCheckoutButton = (wo: WorkOrder) => {
    if (!(wo.status === 'Finished' || wo.status === 'Taken Out') || !wo.postRepairChecklist) return null;

    return (
      <Button
        variant="ghost"
        type="button"
        onClick={(e) => { e.stopPropagation(); onNavigateToTab?.('pos'); }}
        className="!h-6 !min-h-6 w-6 shrink-0 px-0 flex items-center justify-center rounded-full !text-success-deep hover:!text-success hover:!bg-success/10 transition-colors"
        title="Go to POS checkout"
        aria-label={`Checkout ${wo.orderNumber || wo.id}`}
      >
        <DollarSign className="w-3.5 h-3.5" />
      </Button>
    );
  };

  const handleOpenTicketDetail = (wo: WorkOrder) => {
    setSelectedWorkOrder(wo);
    setIsDetailModalOpen(true);
  };

  return (
    <div className="space-y-3 flex min-h-0 flex-1 flex-col">
      {/* Top Header Banner & Actions */}
      <div className="bg-white border border-line rounded-2xl p-3 sm:p-4 shadow-xs space-y-3">
        {/* Title header removed 2026-08-10 (Ko Hein) — navbar already shows 'Work Intake';
            this removes the dead space above the chips row */}

        {/* Quick Stats Filter Chips + compact Table/Grid controls (right-aligned) */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-1.5">
          {[
            { id: 'ALL', label: 'All Active', count: counts.total, icon: ClipboardList },
            { id: 'Receive', label: 'Intake', count: counts.receive, icon: Inbox },
            { id: 'In Progress', label: 'In Progress', count: counts.inProgress, icon: Wrench },
            { id: 'Pending', label: 'Pending', count: counts.pending, icon: Clock },
            { id: 'Finished', label: 'Ready', count: counts.finished, icon: CheckCircle2 },
            { id: 'Taken Out', label: 'Takeout', count: counts.takenOut, icon: PackageCheck },
            { id: 'RUSH', label: 'Urgent', count: counts.rush, icon: Flame },
          ].map((st) => {
            const Icon = st.icon;
            const isSelected = st.id === 'RUSH' ? sortByPriority : filterStatus === st.id;
            return (
              <Button
                key={st.id}
                variant="ghost"
                type="button"
                onClick={() => {
                  if (st.id === 'RUSH') {
                    setSortByPriority(!sortByPriority);
                  } else {
                    setFilterStatus(st.id);
                  }
                }}
                aria-pressed={isSelected}
                title={st.id === 'RUSH' ? 'Sort urgent/rush tickets to top' : `Filter: ${st.label}`}
                className={`inline-flex h-9 items-center gap-1.5 rounded-full border px-2.5 text-xs font-bold transition-colors cursor-pointer focus:outline-none ${
                  isSelected
                    ? 'bg-ink text-white border-ink'
                    : 'bg-white text-ink border-line hover:border-brand/40 hover:text-brand'
                }`}
              >
                <Icon className={`w-3 h-3 ${isSelected ? 'text-white' : 'text-brand'}`} />
                {st.label}
                <span className={`font-mono font-black ${isSelected ? 'text-white/90' : 'text-brand'}`}>{st.count}</span>
              </Button>
            );
          })}
          </div>

          {/* Compact Table|Grid toggle — far right of the chips row (Ko Hein) */}
          <div className="flex items-center gap-1">
            <div className="bg-surface p-0.5 rounded-lg border border-line flex items-center gap-0.5">
              <Button
                variant="ghost"
                type="button"
                onClick={() => setViewMode('table')}
                className={`!h-7 !min-h-7 w-7 px-0 rounded-md flex items-center justify-center cursor-pointer ${viewMode === 'table' ? 'bg-brand text-white shadow-2xs' : 'text-muted hover:text-ink'}`}
                title="Table View"
                aria-label="Table View"
              >
                <TableIcon className="w-3.5 h-3.5" />
              </Button>
              <Button
                variant="ghost"
                type="button"
                onClick={() => setViewMode('cards')}
                className={`!h-7 !min-h-7 w-7 px-0 rounded-md flex items-center justify-center cursor-pointer ${viewMode === 'cards' ? 'bg-brand text-white shadow-2xs' : 'text-muted hover:text-ink'}`}
                title="Cards Grid View"
                aria-label="Cards Grid View"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Full-Width Section: Controls Bar & Ticket List */}
      <div className="workspace-panel workspace-panel--with-toolbar flex-1 min-h-0 bg-white border border-line rounded-2xl shadow-xs">
        {/* Controls Bar: Items Count, Filters, Clear All, Sort */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 px-5 pt-4 pb-3 border-b border-line">
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2 font-extrabold text-ink text-sm">
              <Ticket className="w-4 h-4 text-brand" />
              <span>Repair Ticket Roster</span>
              <span className="px-2.5 py-0.5 bg-brand/10 text-brand rounded-full text-xs font-mono font-bold">
                {filteredOrders.length}
              </span>
            </div>

            {filterStatus !== 'ALL' && (
              /* Active-filter indicator only — no Clear button (Ko Hein 2026-08-10) */
              <div className="flex items-center space-x-1.5 text-xs bg-brand-soft text-brand px-3 py-1 rounded-lg border border-brand/20">
                <span className="h-1.5 w-1.5 rounded-full bg-brand animate-pulse" aria-hidden="true" />
                <span>Filter: <strong>{filterStatus}</strong></span>
              </div>
            )}
          </div>

          <div className="flex items-center space-x-2 flex-wrap">
            {/* Primary create action — lives in the roster header too, not just the
                sidebar (Ko Hein 2026-08-24 UX audit) */}
            <Button
              type="button"
              onClick={() => onOpenNewWorkOrder?.()}
              className="bg-brand hover:bg-brand-deep text-white h-9 px-3 rounded-lg text-xs font-extrabold flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all shadow-2xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Intake Ticket</span>
            </Button>
            {/* Date sort — visible in both table & card views (Ko Hein 2026-08-11) */}
            <div className="flex items-center rounded-lg border border-line bg-white overflow-hidden">
              <span className="pl-2.5 pr-1 text-[10px] font-black uppercase tracking-wider text-muted">Sort</span>
              {(['latest', 'oldest'] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setDateSort(s)}
                  aria-pressed={dateSort === s}
                  className={`px-2.5 py-1.5 text-[11px] font-extrabold transition-colors cursor-pointer ${
                    dateSort === s ? 'bg-ink text-white' : 'text-muted hover:text-ink hover:bg-surface'
                  }`}
                >
                  {s === 'latest' ? 'Latest' : 'Oldest'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* View Content: Table or Grid Cards */}
        {filteredOrders.length === 0 ? (
          <div className="flex flex-1 min-h-[320px] flex-col items-center justify-center p-10 text-center text-xs space-y-4 bg-surface/60 rounded-2xl border border-dashed border-line">
            <div className="w-16 h-16 bg-brand/10 text-brand rounded-2xl flex items-center justify-center mx-auto shadow-2xs">
              <Inbox className="w-8 h-8" />
            </div>
            <div className="space-y-1.5 max-w-sm mx-auto">
              <p className="font-extrabold text-base text-ink">No Repair Tickets Found</p>
              <p className="text-xs text-muted leading-relaxed">
                {workOrders.length === 0 
                  ? "There are currently no active repair tickets in the database."
                  : "No tickets match your active status filter or search query."}
              </p>
            </div>
          </div>
        ) : viewMode === 'table' ? (
          /* TABLE VIEW */
          <div className="workspace-panel__scroll scroll-shadow-right rounded-xl pb-6">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 z-10 shadow-[0_1px_0_0_var(--line)]">
                <tr className="border-b border-line text-muted font-bold text-xs uppercase tracking-wider bg-surface">
                  <th className="py-2.5 px-3">
                    <span className="inline-flex items-center gap-1">
                      Ticket # & Date
                    </span>
                  </th>
                  <th className="py-2.5 px-3">Customer & Contact</th>
                  <th className="py-2.5 px-3">Device & Serial/IMEI</th>
                  <th className="py-2.5 px-3 hidden lg:table-cell">Symptoms / Service</th>
                  <th className="py-2.5 px-3 hidden lg:table-cell">Assigned Tech</th>
                  <th className="py-2.5 px-3 hidden xl:table-cell">Priority</th>
                  <th className="py-2.5 px-3">Stage & Status</th>
                  <th className="py-2.5 px-3">Amount</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {filteredOrders.map((wo) => {
                  const createdDateFull = new Date(wo.createdAt || Date.now()).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  });
                  const createdDateTime = new Date(wo.createdAt || Date.now()).toLocaleString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                  });
                  const totalAmount = wo.totalAmount || wo.subtotal || 0;

                  return (
                    <tr key={wo.id} className="hover:bg-surface transition-colors">
                      {/* Ticket # & Date — real date, not relative (Ko Hein 2026-08-11) */}
                      <td className="py-3 px-3">
                        <p className="font-mono font-black text-brand text-xs">{wo.orderNumber || wo.id}</p>
                        <span className="text-xs text-muted" title={createdDateTime}>{createdDateFull}</span>
                      </td>

                      {/* Customer */}
                      <td className="py-3 px-3">
                        <p className="font-bold text-ink truncate max-w-[140px]">{wo.customerName}</p>
                        <p className="text-xs text-muted font-mono truncate max-w-[140px]">{wo.customerPhone}</p>
                      </td>

                      {/* Device & Serial */}
                      <td className="py-3 px-3">
                        <p className="font-semibold text-ink truncate max-w-[150px]">{wo.deviceModel}</p>
                        <p className="text-xs font-mono text-muted truncate max-w-[150px]">
                          {wo.serialNumber ? `SN: ${wo.serialNumber}` : wo.imei ? `IMEI: ${wo.imei}` : 'No Serial'}
                        </p>
                      </td>

                      {/* Symptoms / Service — repairs only, no intake note (Ko Hein 2026-08-11) */}
                      <td className="py-3 px-3 hidden lg:table-cell">
                        <p className="text-xs text-ink line-clamp-1 max-w-[180px]" title={(wo.selectedRepairs || []).map((r) => r.name).join(', ') || wo.serviceType}>
                          {(wo.selectedRepairs || []).map((r) => r.name).join(', ') || wo.serviceType || 'General Repair'}
                        </p>
                      </td>

                      {/* Assigned Tech — clickable dropdown (Ko Hein 2026-08-10) */}
                      <td className="py-3 px-3 hidden lg:table-cell" onClick={(e) => e.stopPropagation()}>
                        <div className="relative">
                          <Button
                            variant="ghost"
                            type="button"
                            onClick={() => setTechAssignOpenId(techAssignOpenId === wo.id ? null : wo.id)}
                            className="flex items-center space-x-1.5 text-left hover:opacity-80 transition-opacity"
                            title="Assign technician"
                          >
                            <div className="w-5 h-5 rounded-full bg-line text-muted font-bold text-xs flex items-center justify-center shrink-0">
                              {(wo.assignedTechName || 'U').charAt(0)}
                            </div>
                            <span className="text-xs text-ink font-medium truncate max-w-[100px]">
                              {wo.assignedTechName || 'Unassigned'}
                            </span>
                          </Button>
                          {techAssignOpenId === wo.id && (
                            <>
                              <div className="fixed inset-0 z-40" onClick={() => setTechAssignOpenId(null)} role="presentation" aria-hidden="true" />
                              <div className="absolute left-0 top-full z-50 mt-1 w-44 rounded-xl border border-line bg-white p-1 shadow-xl">
                                <Button
                                  variant="ghost"
                                  type="button"
                                  onClick={() => handleAssignTech(wo, 'unassigned')}
                                  className={`w-full px-2.5 py-1.5 text-left text-xs font-bold rounded-lg hover:bg-surface ${!wo.assignedTechId ? 'text-brand bg-brand/5' : ''}`}
                                >
                                  Unassigned
                                </Button>
                                {(technicians || []).map((t) => (
                                  <Button
                                    key={t.id}
                                    variant="ghost"
                                    type="button"
                                    onClick={() => handleAssignTech(wo, t.id)}
                                    className={`w-full px-2.5 py-1.5 text-left text-xs font-bold rounded-lg hover:bg-surface ${wo.assignedTechId === t.id ? 'text-brand bg-brand/5' : ''}`}
                                  >
                                    {t.name}
                                  </Button>
                                ))}
                              </div>
                            </>
                          )}
                        </div>
                      </td>

                      {/* Priority */}
                      <td className="py-3 px-3 hidden xl:table-cell">
                        {wo.priority && wo.priority !== 'Normal' ? (
                          <PriorityBadge priority={wo.priority} />
                        ) : (
                          <span className="text-xs text-muted">-</span>
                        )}
                      </td>

                      {/* Stage & Status — changeable dropdown (Ko Hein 2026-08-10) */}
                      <td className="py-3 px-3" onClick={(e) => e.stopPropagation()}>
                        {renderStatusCirclePicker(wo)}
                      </td>

                      {/* Financial Amount */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1.5">
                          <p className="font-mono font-extrabold text-xs text-ink">
                            {totalAmount.toLocaleString()} {currency}
                          </p>
                        </div>
                        <span className={`text-xs font-bold px-2 py-1 rounded ${
                          wo.isPaid ? 'bg-success/15 text-success-deep' : 'bg-warning/15 text-warning'
                        }`}>
                          {wo.isPaid ? 'Paid' : 'Unpaid'}
                        </span>
                      </td>

                      {/* Ticket status inspector and label export — icon-only actions */}
                      <td className="py-3 px-3 text-right">
                        <div className="inline-flex items-center justify-end gap-1.5">
                          {renderCheckoutButton(wo)}
                          {(wo.status === 'Finished' || wo.status === 'Taken Out') &&
                            (!wo.postRepairChecklist && wo.status === 'Finished' ? (
                            /* Not diagnosed yet → Diagnose (Ko Hein) */
                            <Button
                              variant="ghost"
                              type="button"
                              onClick={(e) => { e.stopPropagation(); onNavigateToTab?.('qa'); }}
                              className="!h-8 !min-h-8 w-8 px-0 rounded-full bg-brand text-white hover:bg-brand-deep border border-brand focus-visible:ring-2 focus-visible:ring-brand/40"
                              title="Run 21-point diagnosis first"
                              aria-label={`Diagnose ${wo.orderNumber || wo.id}`}
                            >
                              <Stethoscope className="w-3.5 h-3.5" />
                            </Button>
                            ) : null)}
                          {wo.status === 'Finished' && wo.postRepairChecklist && onReopenQa && (
                            <Button
                              variant="ghost"
                              type="button"
                              onClick={async (e) => {
                                e.stopPropagation();
                                const ok = await confirmDialog({ title: 'Reopen QA', message: `Reopen QA for ${wo.orderNumber || wo.id}? It goes back to the QA queue for re-inspection.`, confirmLabel: 'Reopen QA' });
                                if (ok) onReopenQa(wo.id);
                              }}
                              className="!h-8 !min-h-8 w-8 px-0 rounded-full border border-warning/40 bg-warning/10 text-warning hover:bg-warning/20 focus-visible:ring-2 focus-visible:ring-warning/40"
                              title="Reopen QA — re-run the 21-point check"
                              aria-label={`Reopen QA for ${wo.orderNumber || wo.id}`}
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            type="button"
                            onClick={() => handleOpenTicketDetail(wo)}
                            className="!h-8 !min-h-8 w-8 px-0 border border-line bg-brand-soft text-brand hover:bg-white rounded-lg focus-visible:ring-2 focus-visible:ring-brand/40"
                            title="View Ticket Status"
                            aria-label={`View status for ${wo.orderNumber || wo.id}`}
                          >
                            <MoveDiagonal2 className="h-3.5 w-3.5" />
                          </Button>
                          {onSelectPrintTag && (
                          <Button
                            variant="ghost"
                            type="button"
                            onClick={() => onSelectPrintTag(wo)}
                            className="!h-8 !min-h-8 w-8 px-0 hover:bg-line border border-line rounded-lg focus-visible:ring-2 focus-visible:ring-brand/40"
                            title="Print Device Label Tag"
                            aria-label={`Print label for ${wo.orderNumber || wo.id}`}
                          >
                            <Printer className="w-3.5 h-3.5 text-brand" />
                          </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          /* GRID CARDS VIEW — POS Ready-to-Checkout style */
          <div className="workspace-panel__scroll grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-3 content-start rounded-xl p-2 sm:p-3 pb-8">
            {filteredOrders.map((wo) => {
              const woColorStyle = getRealisticColorStyle(wo.deviceColor);
              const summary = (wo.selectedRepairs || []).map((r) => r.name).join(', ') || wo.serviceType || 'General Repair';

              return (
                <div
                  key={wo.id}
                  onClick={() => handleOpenTicketDetail(wo)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleOpenTicketDetail(wo); }
                  }}
                  className={`group cursor-pointer rounded-xl border bg-white p-3 shadow-2xs transition-all hover:shadow-md hover:border-brand/50 select-none !min-h-[auto] ${
                    sortByPriority && getPriorityWeight(wo.priority) >= 4 ? 'border-danger/30 ring-1 ring-danger/20' : 'border-line'
                  }`}
                >
                  {/* Top row: order # + priority + status */}
                  <div className="flex items-center justify-between gap-1.5">
                    <div className="flex items-center gap-1 min-w-0">
                      <span className="font-mono text-[11px] font-extrabold text-brand truncate">{wo.orderNumber}</span>
                      <span
                        className="text-[10px] font-mono text-muted shrink-0"
                        title={`Voucher opened: ${new Date(wo.createdAt || Date.now()).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}`}
                      >
                        {new Date(wo.createdAt || Date.now()).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                      {wo.priority && wo.priority !== 'Normal' ? (
                        <PriorityBadge priority={wo.priority} size="xs" />
                      ) : null}
                      {onUpdateWorkOrderStatus ? (
                        renderStatusCirclePicker(wo)
                      ) : (
                        <StatusBadge status={wo.status} size="xs" />
                      )}
                    </div>
                  </div>

                  {/* Device + color + customer */}
                  <p className="mt-1.5 flex items-center gap-1.5 text-xs font-extrabold text-ink truncate">
                    <span className="truncate">{wo.deviceModel}</span>
                    <span
                      className={`w-2.5 h-2.5 shrink-0 rounded-full border border-white shadow-2xs ${woColorStyle.border}`}
                      style={{ background: woColorStyle.gradient }}
                    />
                  </p>
                  <p className="text-[11px] text-muted truncate">
                    {wo.customerName} · {wo.customerPhone}
                  </p>

                  {/* Repair summary */}
                  <p className="mt-1 line-clamp-2 text-[11px] font-medium text-muted leading-snug">
                    {summary}
                  </p>

                  {/* Footer: tech + amount */}
                  <div className="mt-2 flex items-center justify-between border-t border-line/60 pt-1.5">
                    <div className="relative min-w-0" onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        type="button"
                        onClick={() => setTechAssignOpenId(techAssignOpenId === wo.id ? null : wo.id)}
                        className="flex items-center space-x-1 text-[11px] font-bold text-brand min-w-0 truncate hover:opacity-80 transition-opacity"
                        title="Assign technician"
                      >
                        <UserCheck className="w-3 h-3 shrink-0" />
                        <span className="truncate max-w-[80px]">{wo.assignedTechName || 'Unassigned'}</span>
                      </Button>
                      {techAssignOpenId === wo.id && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={() => setTechAssignOpenId(null)} role="presentation" aria-hidden="true" />
                          <div className="absolute left-0 bottom-full z-50 mb-1 w-40 rounded-xl border border-line bg-white p-1 shadow-xl">
                            <Button
                              variant="ghost"
                              type="button"
                              onClick={() => handleAssignTech(wo, 'unassigned')}
                              className={`w-full px-2 py-1.5 text-left text-xs font-bold rounded-lg hover:bg-surface ${!wo.assignedTechId ? 'text-brand bg-brand/5' : ''}`}
                            >
                              Unassigned
                            </Button>
                            {(technicians || []).map((t) => (
                              <Button
                                key={t.id}
                                variant="ghost"
                                type="button"
                                onClick={() => handleAssignTech(wo, t.id)}
                                className={`w-full px-2 py-1.5 text-left text-xs font-bold rounded-lg hover:bg-surface ${wo.assignedTechId === t.id ? 'text-brand bg-brand/5' : ''}`}
                              >
                                {t.name}
                              </Button>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      {renderCheckoutButton(wo)}
                      <span className="font-mono text-[11px] font-black text-success-deep">
                        {(wo.totalAmount || wo.subtotal || 0).toLocaleString()} {currency}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Full list footer — always visible with full count (like Inventory) */}
        {filteredOrders.length > 0 && (
          <div className="p-3.5 bg-surface/70 border-t-2 border-line flex items-center justify-between text-xs text-muted shrink-0">
            <span className="font-bold">
              Showing all <strong className="text-ink">{filteredOrders.length}</strong> tickets
            </span>
          </div>
        )}
      </div>

      {isDetailModalOpen && selectedWorkOrder && (
        <TicketDetailInspectorModal
          workOrder={selectedWorkOrder}
          currentUser={currentUser}
          onClose={() => setIsDetailModalOpen(false)}
          onPrint={onSelectPrintTag}
          onEdit={onOpenNewWorkOrder ? (wo) => onOpenNewWorkOrder({ editWorkOrder: wo }) : undefined}
          onDelete={onDeleteWorkOrder}
          onAddLog={(wo, note) => {
            const formattedDate = new Date().toLocaleString('en-US', {
              month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true
            });
            const newLog: RepairLogEntry = {
              id: `log-${Date.now()}`,
              timestamp: formattedDate,
              author: currentUser?.name || 'Technician Update',
              note,
              statusChange: wo.status,
            };
            onSaveWorkOrder({
              ...wo,
              repairLogs: [newLog, ...(wo.repairLogs || [])],
              updatedAt: new Date().toISOString(),
            });
          }}
        />
      )}
      {/* Confirm Delete Modal */}
      <ConfirmDeleteModal
        isOpen={!!ticketToDelete}
        title="Move Ticket to Recycle Bin?"
        itemName={ticketToDelete ? `${ticketToDelete.orderNumber || ticketToDelete.id} - ${ticketToDelete.customerName} (${ticketToDelete.deviceModel})` : ''}
        description="This ticket will be removed from the active repair intake roster and moved to the Recycle Bin. You can restore it anytime from the Recycle Bin."
        confirmLabel="Move to Recycle Bin"
        onConfirm={() => {
          if (ticketToDelete && onDeleteWorkOrder) {
            onDeleteWorkOrder(ticketToDelete.id);
          }
        }}
        onClose={() => setTicketToDelete(null)}
      />

      {/* Camera QR & Barcode Scanner Modal — mounted only while scanning */}
      {isCameraScannerOpen && (
        <Suspense fallback={null}>
          <CameraQrScannerModal
            isOpen={isCameraScannerOpen}
            onClose={() => setIsCameraScannerOpen(false)}
            onScanSuccess={(scannedText) => {
              // Pass the scan through to the intake form instead of dropping it
              // (15 digits = IMEI, anything else = serial, same rule as the form).
              const clean = scannedText.trim();
              if (onNavigateToCreateTicket) {
                onNavigateToCreateTicket(
                  /^\d{15}$/.test(clean)
                    ? { imei: clean }
                    : { serialNumber: clean.toUpperCase() }
                );
              }
            }}
          />
        </Suspense>
      )}
    </div>
  );
};
