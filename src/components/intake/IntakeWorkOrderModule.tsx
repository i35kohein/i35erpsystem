import React, { useEffect, useState, lazy, Suspense } from 'react';
import { DateFilterState, filterByDateRange } from '../common/DateFilterSelector';

import { timeAgoShort } from '../../utils/timeAgo';
import { StatusBadge } from '../common/StatusBadge';
import { PriorityBadge } from '../common/PriorityBadge';
import { useIsIpad } from '../../hooks/useIsIpad';

// Camera/barcode scanner is code-split: html5-qrcode (~340KB) only downloads
// when the scanner is actually opened, not when the intake module loads.
const CameraQrScannerModal = lazy(() => import('../common/CameraQrScannerModal').then((m) => ({ default: m.CameraQrScannerModal })));
import { ConfirmDeleteModal } from '../common/ConfirmDeleteModal';
import { Button } from '../ui';
import { TicketDetailInspectorModal } from '../common/TicketDetailInspectorModal';
import type { TicketPrefillData } from './CreateTicketSoloPage';
import {ClipboardList, 
  Camera,
  Trash2,
  Inbox,
  Ticket,
  SlidersHorizontal,
  LayoutGrid,
  Table as TableIcon,
  ChevronLeft,
  ChevronRight,
  User,
  Wrench,
  Clock,
  CheckCircle2,
  Eye,
  Printer,
  Flame} from 'lucide-react';
import {WorkOrder, 
  PartItem, 
  Customer, 
  Technician,
  AppUser} from '../../types';
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
  onClearAllWorkOrders?: () => void;
  searchQuery: string;
  setSearchQuery?: (q: string) => void;
  filterStatus?: string;
  setFilterStatus?: (s: string) => void;
  dateFilter?: DateFilterState;
  setDateFilter?: (d: DateFilterState) => void;
  onNavigateToCreateTicket?: (prefill?: TicketPrefillData) => void;
}



export const IntakeWorkOrderModule: React.FC<IntakeWorkOrderModuleProps> = ({
  workOrders,
  currentUser,
  onSelectPrintTag,
  onOpenNewWorkOrder,
  onDeleteWorkOrder,
  onClearAllWorkOrders,
  searchQuery,
  filterStatus: propFilterStatus,
  setFilterStatus: propSetFilterStatus,
  dateFilter: propDateFilter,
  onNavigateToCreateTicket,
}) => {
  const [selectedWorkOrder, setSelectedWorkOrder] = useState<WorkOrder | null>(null);
  const isIpad = useIsIpad();
  const [isDetailModalOpen, setIsDetailModalOpen] = useState<boolean>(false);
  const [isCameraScannerOpen, setIsCameraScannerOpen] = useState<boolean>(false);
  const [ticketToDelete, setTicketToDelete] = useState<WorkOrder | null>(null);
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');

  // Phones default to the card grid — the 9-column table is unusable below md.
  // (User can still switch back to Table; manual choice is preserved.)
  useEffect(() => {
    if (window.innerWidth < 768) setViewMode('cards');
  }, []);
  const [localFilterStatus, setLocalFilterStatus] = useState<string>('ALL');
  const localDateFilter: DateFilterState = { preset: 'all' };

  const filterStatus = propFilterStatus !== undefined ? propFilterStatus : localFilterStatus;
  const setFilterStatus = propSetFilterStatus || setLocalFilterStatus;

  const dateFilter = propDateFilter !== undefined ? propDateFilter : localDateFilter;

  // Roster State (no pagination — all matching tickets shown, like Parts Inventory)
  const [sortByPriority, setSortByPriority] = useState<boolean>(false);

  const getPriorityWeight = (priority: string) => {
    switch (priority) {
      case 'Urgent':
      case 'Rush': return 4;
      case 'Warranty Redo': return 3;
      case 'B2B Priority': return 2;
      default: return 1;
    }
  };

  const getPriorityStyle = (priority: string) => {
    switch (priority) {
      case 'Urgent':
      case 'Rush': return 'border-danger/30 bg-danger/10 hover:border-danger/50';
      case 'Warranty Redo': return 'border-purple/30 bg-purple/10 hover:border-purple/50';
      case 'B2B Priority': return 'border-warning/30 bg-warning/10 hover:border-warning/50';
      default: return 'border-line bg-white hover:border-line';
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
    const matchesSearch =
      !query ||
      wo.orderNumber.toLowerCase().includes(query) ||
      wo.customerName.toLowerCase().includes(query) ||
      wo.deviceModel.toLowerCase().includes(query) ||
      wo.serialNumber.toLowerCase().includes(query) ||
      (wo.imei && wo.imei.toLowerCase().includes(query));
    return matchesFilter && matchesSearch;
  }).sort((a, b) => {
    if (sortByPriority) {
      const weightDiff = getPriorityWeight(b.priority) - getPriorityWeight(a.priority);
      if (weightDiff !== 0) return weightDiff;
    }
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  // Summary Counts for Stats Bar
  const counts = {
    total: dateFilteredOrders.length,
    receive: dateFilteredOrders.filter(w => w.status === 'Receive').length,
    inProgress: dateFilteredOrders.filter(w => w.status === 'In Progress').length,
    pending: dateFilteredOrders.filter(w => w.status === 'Pending').length,
    finished: dateFilteredOrders.filter(w => w.status === 'Finished').length,
    rush: dateFilteredOrders.filter(w => w.priority === 'Urgent' || w.priority === 'Warranty Redo').length,
  };

  // Roster pagination (same pattern as Inventory table)
  const ROSTER_PAGE_SIZE = 50;
  const [rosterPage, setRosterPage] = useState(1);
  const rosterTotalPages = Math.max(1, Math.ceil(filteredOrders.length / ROSTER_PAGE_SIZE));
  const rosterPageSafe = Math.min(rosterPage, rosterTotalPages);
  const rosterPageOrders = filteredOrders.slice((rosterPageSafe - 1) * ROSTER_PAGE_SIZE, rosterPageSafe * ROSTER_PAGE_SIZE);
  // Reset to page 1 when filters change the result set
  useEffect(() => {
    setRosterPage(1);
  }, [filterStatus, searchQuery, dateFilter, sortByPriority]);

  const handleOpenTicketDetail = (wo: WorkOrder) => {
    setSelectedWorkOrder(wo);
    setIsDetailModalOpen(true);
  };

  return (
    <div className={`space-y-3 ${isIpad ? 'flex min-h-0 flex-1 flex-col' : ''}`}>
      {/* Top Header Banner & Actions */}
      <div className="bg-white border border-line rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-line">
          <div className="module-subheader space-y-1">
            <div className="flex items-center space-x-2.5">
              <span className="p-2.5 bg-brand/10 text-brand rounded-xl">
                <ClipboardList className="w-5 h-5" />
              </span>
              <div>
                <h1 className="text-lg font-black text-ink">
                  Work Intake & Active Tickets
                </h1>
                <p className="text-xs text-muted">
                  Spacious full-width roster for device intake, hardware diagnostics, and repair progress tracking
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto md:shrink-0 sm:items-stretch md:items-center">
            {/* View Mode Switcher — full-width segmented control on mobile */}
            <div className="bg-surface p-1 rounded-xl border border-line flex items-center gap-1 w-full md:w-auto">
              <Button
                variant="ghost"
                type="button"
                onClick={() => setViewMode('table')}
                className={`flex-1 md:flex-none px-2.5 sm:px-3 h-9 rounded-lg text-xs font-extrabold transition-all flex items-center justify-center md:justify-start space-x-1.5 cursor-pointer ${
                  viewMode === 'table'
                    ? 'bg-brand text-white shadow-2xs'
                    : 'text-muted hover:text-ink'
                }`}
                title="Table View"
                aria-label="Table View"
              >
                <TableIcon className="w-3.5 h-3.5 shrink-0" />
                <span>Table</span>
              </Button>
              <Button
                variant="ghost"
                type="button"
                onClick={() => setViewMode('cards')}
                className={`flex-1 md:flex-none px-2.5 sm:px-3 h-9 rounded-lg text-xs font-extrabold transition-all flex items-center justify-center md:justify-start space-x-1.5 cursor-pointer ${
                  viewMode === 'cards'
                    ? 'bg-brand text-white shadow-2xs'
                    : 'text-muted hover:text-ink'
                }`}
                title="Cards Grid View"
                aria-label="Cards Grid View"
              >
                <LayoutGrid className="w-3.5 h-3.5 shrink-0" />
                <span>Grid Cards</span>
              </Button>
            </div>

            <Button
              type="button"
              onClick={() => setIsCameraScannerOpen(true)}
              className="w-full md:w-auto bg-brand hover:bg-brand-deep text-white flex items-center justify-center md:justify-start space-x-1.5"
              title="Scan Device Barcode or QR Code"
            >
              <Camera className="w-3.5 h-3.5 text-white shrink-0" />
              <span className="hidden sm:inline">Scan Barcode / QR</span>
              <span className="sm:hidden">Scan</span>
            </Button>
          </div>
        </div>

        {/* Quick Stats Filter Chips — full-width responsive: 2 cols mobile → 3 tablet → 6 desktop */}
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
          {[
            { id: 'ALL', label: 'All Active Tickets', count: counts.total, color: 'text-brand', bg: 'bg-brand-soft/60', border: 'border-brand/30', icon: ClipboardList, chipBg: 'bg-brand/10 text-brand' },
            { id: 'Receive', label: 'Intake (Receive)', count: counts.receive, color: 'text-brand', bg: 'bg-brand-soft/60', border: 'border-brand/30', icon: Inbox, chipBg: 'bg-brand/10 text-brand' },
            { id: 'In Progress', label: 'In Progress', count: counts.inProgress, color: 'text-teal', bg: 'bg-teal/10', border: 'border-teal/30', icon: Wrench, chipBg: 'bg-teal/10 text-teal' },
            { id: 'Pending', label: 'Pending Approval', count: counts.pending, color: 'text-warning', bg: 'bg-warning/10', border: 'border-warning/30', icon: Clock, chipBg: 'bg-warning/10 text-warning' },
            { id: 'Finished', label: 'Ready (Finished)', count: counts.finished, color: 'text-success-deep', bg: 'bg-success/10', border: 'border-success/30', icon: CheckCircle2, chipBg: 'bg-success/10 text-success-deep' },
            { id: 'RUSH', label: 'Urgent Priority', count: counts.rush, color: 'text-danger', bg: 'bg-danger/10', border: 'border-danger/30', icon: Flame, chipBg: 'bg-danger/10 text-danger' },
          ].map((st) => {
            const Icon = st.icon;
            const isSelected = st.id === 'RUSH' ? sortByPriority : filterStatus === st.id;
            return (
              <Button
                key={st.id}
                type="button"
                onClick={() => {
                  if (st.id === 'RUSH') {
                    setSortByPriority(!sortByPriority);
                  } else {
                    setFilterStatus(st.id);
                  }
                }}
                aria-pressed={isSelected}
                className={`group relative !min-h-[96px] w-full overflow-hidden rounded-xl border p-3.5 text-left transition-all cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? `${st.bg} ${st.border} ring-2 ring-brand/25 shadow-xs`
                    : `${st.bg} ${st.border} hover:border-brand/45 hover:shadow-xs`
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="text-xs font-bold text-muted uppercase tracking-[0.06em] leading-4 pr-1 line-clamp-2">
                    {st.label}
                  </span>
                  <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${st.chipBg} transition-transform group-hover:scale-105`}>
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                </div>
                <span className={`text-2xl font-extrabold leading-none mt-2 ${st.color}`}>
                  {st.count}
                </span>
              </Button>
            );
          })}
        </div>
      </div>

      {/* Main Full-Width Section: Controls Bar & Ticket List */}
      <div className={`workspace-panel workspace-panel--with-toolbar bg-white border border-line rounded-2xl p-5 space-y-4 shadow-xs ${isIpad ? '!h-auto flex-1 min-h-0' : ''}`}>
        {/* Controls Bar: Items Count, Filters, Clear All, Sort */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-line">
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2 font-extrabold text-ink text-sm">
              <Ticket className="w-4 h-4 text-brand" />
              <span>Repair Ticket Roster</span>
              <span className="px-2.5 py-0.5 bg-brand/10 text-brand rounded-full text-xs font-mono font-bold">
                {filteredOrders.length}
              </span>
            </div>

            {filterStatus !== 'ALL' && (
              <div className="flex items-center space-x-1.5 text-xs bg-brand-soft text-brand px-3 py-1 rounded-lg border border-brand/20">
                <span>Filter: <strong>{filterStatus}</strong></span>
                <Button
                  type="button"
                  onClick={() => setFilterStatus('ALL')}
                  className="text-xs font-bold underline hover:opacity-80 cursor-pointer ml-1"
                >
                  Clear
                </Button>
              </div>
            )}
          </div>

          <div className="flex items-center space-x-2 flex-wrap">
            {/* Clear All — desktop only (iPad: removed for declutter) */}
            {!isIpad && workOrders.length > 0 && (
              <Button
                type="button"
                onClick={() => {
                  if (window.confirm(`Are you sure you want to remove all ${workOrders.length} tickets?`)) {
                    onClearAllWorkOrders?.();
                    setSelectedWorkOrder(null);
                  }
                }}
                className="h-8 px-3 bg-danger/10 hover:bg-danger/15 text-danger border border-danger/30 text-xs font-bold rounded-lg transition-all inline-flex items-center space-x-1.5 cursor-pointer shadow-2xs"
                title="Remove all tickets"
              >
                <Trash2 className="w-3.5 h-3.5 text-danger shrink-0" />
                <span>Clear All ({workOrders.length})</span>
              </Button>
            )}

            {/* Sort By Urgency Toggle */}
            <Button
              type="button"
              onClick={() => setSortByPriority(!sortByPriority)}
              className={`h-8 px-3 border text-xs font-bold rounded-lg transition-all inline-flex items-center space-x-1.5 cursor-pointer ${
                sortByPriority 
                  ? 'bg-brand text-white border-brand shadow-2xs' 
                  : 'bg-surface text-ink border-line hover:bg-surface'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5 shrink-0" />
              <span>Priority First</span>
            </Button>
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
          <div className="workspace-panel__scroll scroll-shadow-right scroll-shadow-bottom rounded-xl pb-3">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 z-10">
                <tr className="border-b border-line text-muted font-bold text-xs uppercase tracking-wider bg-surface">
                  <th className="py-2.5 px-3">Ticket # & Date</th>
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
                {filteredOrders.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-4 py-14 text-center">
                      <div className="mx-auto max-w-sm space-y-2">
                        <Inbox className="mx-auto h-8 w-8 text-line-strong" />
                        <p className="font-extrabold text-sm text-ink">No Repair Tickets Found</p>
                        <p className="text-xs text-muted">
                          {workOrders.length === 0
                            ? 'There are currently no active repair tickets in the database.'
                            : 'No tickets match your active status filter or search query.'}
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
                {rosterPageOrders.map((wo) => {
                  const createdDate = timeAgoShort(wo.createdAt);
                  const createdDateFull = new Date(wo.createdAt || Date.now()).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                  });
                  const totalAmount = wo.totalAmount || wo.subtotal || 0;

                  return (
                    <tr key={wo.id} className="hover:bg-surface transition-colors">
                      {/* Ticket # & Date */}
                      <td className="py-3 px-3">
                        <p className="font-mono font-black text-brand text-xs">{wo.orderNumber || wo.id}</p>
                        <span className="text-xs text-muted" title={createdDateFull}>{createdDate}</span>
                      </td>

                      {/* Customer */}
                      <td className="py-3 px-3">
                        <p className="font-bold text-ink truncate max-w-[140px]">{wo.customerName}</p>
                        <p className="text-xs text-muted font-mono">{wo.customerPhone}</p>
                      </td>

                      {/* Device & Serial */}
                      <td className="py-3 px-3">
                        <p className="font-semibold text-ink truncate max-w-[150px]">{wo.deviceModel}</p>
                        <p className="text-xs font-mono text-muted truncate max-w-[150px]">
                          {wo.serialNumber || wo.imei ? `SN: ${wo.serialNumber || wo.imei}` : 'No Serial'}
                        </p>
                      </td>

                      {/* Symptoms / Service */}
                      <td className="py-3 px-3 hidden lg:table-cell">
                        <p className="text-xs text-ink line-clamp-1 max-w-[180px]" title={wo.symptomsReported || wo.serviceType}>
                          {wo.symptomsReported || wo.serviceType || 'General Repair'}
                        </p>
                      </td>

                      {/* Assigned Tech */}
                      <td className="py-3 px-3 hidden lg:table-cell">
                        <div className="flex items-center space-x-1.5">
                          <div className="w-5 h-5 rounded-full bg-line text-muted font-bold text-xs flex items-center justify-center shrink-0">
                            {(wo.assignedTechName || 'U').charAt(0)}
                          </div>
                          <span className="text-xs text-ink font-medium truncate max-w-[100px]">
                            {wo.assignedTechName || 'Unassigned'}
                          </span>
                        </div>
                      </td>

                      {/* Priority */}
                      <td className="py-3 px-3 hidden xl:table-cell">
                        <PriorityBadge priority={wo.priority} />
                      </td>

                      {/* Stage & Status (Read-Only Badge) */}
                      <td className="py-3 px-3">
                        <StatusBadge status={wo.status} />
                      </td>

                      {/* Financial Amount */}
                      <td className="py-3 px-3">
                        <p className="font-mono font-extrabold text-xs text-ink">
                          {totalAmount.toLocaleString()} MMK
                        </p>
                        <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${
                          wo.isPaid ? 'bg-success/15 text-success-deep' : 'bg-danger/15 text-danger'
                        }`}>
                          {wo.isPaid ? 'Paid' : 'Unpaid'}
                        </span>
                      </td>

                      {/* Ticket status inspector and label export */}
                      <td className="py-3 px-3 text-right">
                        <div className="inline-flex items-center justify-end gap-1.5">
                          <Button
  variant="secondary" size="sm"
  
                            type="button"
                            onClick={() => handleOpenTicketDetail(wo)}
                            className="border border-line bg-brand-soft px-2.5 text-brand hover:bg-white"
                            title="View Ticket Status"
                            aria-label={`View status for ${wo.orderNumber || wo.id}`}
                          >
                            <Eye className="h-3.5 w-3.5" />
                            <span>View</span>
                          </Button>
                          {onSelectPrintTag && (
                          <Button
  variant="secondary" size="sm"
  
                            type="button"
                            onClick={() => onSelectPrintTag(wo)}
                            className="px-2.5 hover:bg-line border border-line"
                            title="Print Device Label Tag"
                          >
                            <Printer className="w-3.5 h-3.5 text-brand" />
                            <span>Tag</span>
                          </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {/* Roster pagination — same pattern as Inventory table */}
            {rosterTotalPages > 1 && (
              <div className="sticky bottom-0 flex items-center justify-between gap-2 border-t border-line bg-white px-3 py-2">
                <span className="text-xs font-mono font-bold text-muted">
                  {filteredOrders.length} tickets · Page {rosterPageSafe}/{rosterTotalPages}
                </span>
                <div className="flex items-center gap-1.5">
                  <Button
                    type="button"
                    onClick={() => setRosterPage((p) => Math.max(1, p - 1))}
                    disabled={rosterPageSafe <= 1}
                    className="flex h-10 lg:h-8 items-center gap-1 rounded-lg border border-line bg-white px-2.5 text-xs font-bold text-ink hover:border-brand hover:text-brand disabled:opacity-40 disabled:hover:border-line disabled:hover:text-ink transition-colors cursor-pointer"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    Prev
                  </Button>
                  <Button
                    type="button"
                    onClick={() => setRosterPage((p) => Math.min(rosterTotalPages, p + 1))}
                    disabled={rosterPageSafe >= rosterTotalPages}
                    className="flex h-10 lg:h-8 items-center gap-1 rounded-lg border border-line bg-white px-2.5 text-xs font-bold text-ink hover:border-brand hover:text-brand disabled:opacity-40 disabled:hover:border-line disabled:hover:text-ink transition-colors cursor-pointer"
                  >
                    Next
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            )}
            {/* Full list footer — same pattern as Inventory */}
            {filteredOrders.length > 0 && (
              <div className="p-3.5 bg-white border-t border-line flex items-center justify-between text-xs text-muted">
                <span className="font-bold">
                  Showing <strong className="text-ink">{Math.min(filteredOrders.length, (rosterPageSafe - 1) * ROSTER_PAGE_SIZE + 1)}-{Math.min(rosterPageSafe * ROSTER_PAGE_SIZE, filteredOrders.length)}</strong> of <strong className="text-ink">{filteredOrders.length}</strong> tickets
                </span>
                <span className="font-bold text-ink">Page {rosterPageSafe}/{rosterTotalPages}</span>
              </div>
            )}
          </div>
        ) : (
          /* GRID CARDS VIEW */
          <div className="workspace-panel__scroll grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 content-start rounded-xl">
            {filteredOrders.map((wo) => {
              const woColorStyle = getRealisticColorStyle(wo.deviceColor);

              return (
                <div
                  key={wo.id}
                  onClick={() => handleOpenTicketDetail(wo)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleOpenTicketDetail(wo); }
                  }}
                  className={`relative p-4 rounded-2xl border text-xs cursor-pointer transition-all space-y-3 hover:shadow-md ${getPriorityStyle(wo.priority)}`}
                >
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-2xl bg-brand/10 text-brand flex items-center justify-center group-hover:scale-110 group-hover:bg-brand group-hover:text-white transition-all">
                    <Ticket className="w-5 h-5" />
                  </div>
                  <div className="pr-12">
                    <div className="flex justify-between items-center pb-2 border-b border-line">
                      <span className="font-mono font-black text-brand bg-brand/10 px-2.5 py-1 rounded-md text-xs">
                        {wo.orderNumber}
                      </span>

                      <div className="flex items-center space-x-1.5">
                        <PriorityBadge priority={wo.priority} size="xs" />
                        <StatusBadge status={wo.status} size="xs" />
                      </div>
                    </div>

                    <div className="space-y-1 pt-2">
                      <div className="flex justify-between items-center font-extrabold text-sm text-ink">
                        <span>{wo.deviceModel}</span>
                        <div className="flex items-center space-x-1.5">
                          <span className="text-xs text-muted font-medium">{wo.deviceColor || 'Standard'}</span>
                          <span 
                            className={`w-3.5 h-3.5 rounded-full border border-white shadow-2xs ${woColorStyle.border}`}
                            style={{ background: woColorStyle.gradient }}
                          />
                        </div>
                      </div>
                      <p className="text-xs text-muted">
                        <strong className="text-ink">{wo.customerName}</strong> · {wo.customerPhone}
                      </p>
                    </div>

                    <div className="flex items-center justify-between text-xs pt-2">
                      <span className="font-bold text-ink flex items-center space-x-1.5">
                        <User className="w-3.5 h-3.5 text-brand" />
                        {wo.assignedTechName || 'Unassigned'}
                      </span>
                      <span className="font-mono font-black text-sm text-brand">
                        {(wo.totalAmount || wo.subtotal || 0).toLocaleString()} MMK
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
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
