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
  Maximize2,
  User} from 'lucide-react';
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
  const [localDateFilter] = useState<DateFilterState>({ preset: 'all' });

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
      case 'Rush': return 'border-rose-300 bg-rose-50/40 hover:border-rose-400';
      case 'Warranty Redo': return 'border-purple-300 bg-purple-50/40 hover:border-purple-400';
      case 'B2B Priority': return 'border-amber-300 bg-amber-50/40 hover:border-amber-400';
      default: return 'border-line bg-white hover:border-slate-300';
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

        {/* Quick Stats Filter Chips */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 3xl:grid-cols-8 4xl:grid-cols-10 gap-3.5">
          {[
            { id: 'ALL', label: 'All Active Tickets', count: counts.total, color: 'text-brand', bg: 'bg-blue-50/60', border: 'border-blue-200' },
            { id: 'Receive', label: 'Intake (Receive)', count: counts.receive, color: 'text-brand', bg: 'bg-blue-50/60', border: 'border-blue-200' },
            { id: 'In Progress', label: 'In Progress', count: counts.inProgress, color: 'text-teal', bg: 'bg-teal-50/60', border: 'border-teal-200' },
            { id: 'Pending', label: 'Pending Approval', count: counts.pending, color: 'text-warning', bg: 'bg-orange-50/60', border: 'border-orange-200' },
            { id: 'Finished', label: 'Ready (Finished)', count: counts.finished, color: 'text-emerald-700', bg: 'bg-emerald-50/60', border: 'border-emerald-200' },
            { id: 'RUSH', label: 'Urgent Priority', count: counts.rush, color: 'text-rose-600', bg: 'bg-rose-50/60', border: 'border-rose-200' },
          ].map((st) => {
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
                className={`min-h-[84px] px-4 py-3.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? `${st.bg} ${st.border} ring-1 ring-brand/20`
                    : `${st.bg} ${st.border} hover:border-brand/45`
                }`}
              >
                <span className="text-xs font-bold text-muted uppercase tracking-[0.06em] block leading-4">
                  {st.label}
                </span>
                <span className={`text-xl font-extrabold mt-2 leading-none ${st.color}`}>
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
                className="h-8 px-3 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold rounded-lg transition-all inline-flex items-center space-x-1.5 cursor-pointer shadow-2xs"
                title="Remove all tickets"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-600 shrink-0" />
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
                  : 'bg-surface text-ink border-line hover:bg-slate-100'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5 shrink-0" />
              <span>Priority First</span>
            </Button>
          </div>
        </div>

        {/* View Content: Table or Grid Cards */}
        {filteredOrders.length === 0 ? (
          <div className="flex min-h-0 flex-1 flex-col items-center justify-center p-12 text-center text-xs space-y-4 bg-surface rounded-2xl border border-dashed border-line my-4">
            <div className="w-14 h-14 bg-brand/10 text-brand rounded-2xl flex items-center justify-center mx-auto shadow-2xs">
              <Inbox className="w-7 h-7" />
            </div>
            <div className="space-y-1 max-w-sm mx-auto">
              <p className="font-extrabold text-base text-ink">No Repair Tickets Found</p>
              <p className="text-xs text-muted">
                {workOrders.length === 0 
                  ? "There are currently no active repair tickets in the database."
                  : "No tickets match your active status filter or search query."}
              </p>
            </div>
          </div>
        ) : viewMode === 'table' ? (
          /* TABLE VIEW */
          <div className="workspace-panel__scroll scroll-shadow-right scroll-shadow-bottom rounded-xl pb-3">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 z-20 border-b border-line bg-surface font-mono text-xs uppercase text-muted shadow-2xs">
                <tr>
                  <th className="w-[92px] xl:w-[132px] px-2 py-2 bg-surface">Ticket # & Date</th>
                  <th className="w-[148px] px-2 py-2 bg-surface">Customer & Contact</th>
                  <th className="w-[158px] px-2 py-2 bg-surface">Device & Serial/IMEI</th>
                  <th className="px-2 py-2 bg-surface hidden lg:table-cell">Symptoms / Service</th>
                  <th className="w-[112px] px-2 py-2 bg-surface hidden lg:table-cell">Assigned Tech</th>
                  <th className="w-[92px] px-2 py-2 bg-surface hidden lg:table-cell">Priority</th>
                  <th className="w-[114px] px-2 py-2 bg-surface">Stage & Status</th>
                  <th className="w-[112px] px-2 py-2 bg-surface text-right">Amount</th>
                  <th className="w-[44px] px-2 py-2 text-right bg-surface hidden xl:table-cell">Detail</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line text-xs">
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
                {filteredOrders.map((wo) => {
                  const createdDate = timeAgoShort(wo.createdAt);
                  const createdDateFull = new Date(wo.createdAt || Date.now()).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                  });
                  const totalAmount = wo.totalAmount || wo.subtotal || 0;

                  return (
                    <tr
                      key={wo.id}
                      onClick={() => handleOpenTicketDetail(wo)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          handleOpenTicketDetail(wo);
                        }
                      }}
                      tabIndex={0}
                      role="link"
                      aria-label={`Open ticket ${wo.orderNumber || wo.id}`}
                      className="hover:bg-slate-50/80 transition-colors cursor-pointer group focus:outline-none focus-visible:bg-brand-soft"
                    >
                      {/* Ticket # & Date */}
                      <td className="px-2 py-2">
                        <div className="flex items-center space-x-2">
                          <div className="shrink-0 rounded-md bg-brand/10 p-1 text-brand-deep">
                            <Ticket className="h-3 w-3" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-mono text-xs font-extrabold leading-snug text-brand">{wo.orderNumber || wo.id}</p>
                            <p className="mt-0.5 text-xs font-medium text-muted hidden xl:block" title={createdDateFull}>{createdDate}</p>
                          </div>
                        </div>
                      </td>

                      {/* Customer & Contact */}
                      <td className="px-2 py-2 text-ink">
                        <div className="space-y-0.5">
                          <span className="block max-w-[140px] truncate text-xs font-extrabold leading-snug">{wo.customerName}</span>
                          <span className="block font-mono text-xs font-medium text-muted">{wo.customerPhone}</span>
                        </div>
                      </td>

                      {/* Device & Serial */}
                      <td className="px-2 py-2 text-ink">
                        <div className="space-y-0.5">
                          <span className="block max-w-[150px] truncate text-xs font-extrabold leading-snug">{wo.deviceModel}</span>
                          <span className="block max-w-[150px] truncate font-mono text-xs font-medium text-muted">
                            {wo.serialNumber || wo.imei ? `SN: ${wo.serialNumber || wo.imei}` : 'No Serial'}
                          </span>
                        </div>
                      </td>

                      {/* Symptoms / Service */}
                      <td className="px-2 py-2 text-ink hidden lg:table-cell">
                        <p className="line-clamp-2 max-w-[190px] text-xs font-semibold leading-snug" title={wo.symptomsReported || wo.serviceType}>
                          {wo.symptomsReported || wo.serviceType || 'General Repair'}
                        </p>
                      </td>

                      {/* Assigned Tech */}
                      <td className="px-2 py-2 text-ink hidden lg:table-cell">
                        <div className="flex items-center space-x-1.5">
                          <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-200 text-xs font-bold text-slate-700">
                            {(wo.assignedTechName || 'U').charAt(0)}
                          </div>
                          <span className="max-w-[100px] truncate text-xs font-semibold">{wo.assignedTechName || 'Unassigned'}</span>
                        </div>
                      </td>

                      <td className="px-2 py-2 hidden lg:table-cell">
                        <PriorityBadge priority={wo.priority} size="xs" showNormal />
                      </td>

                      <td className="px-2 py-2">
                        <StatusBadge status={wo.status} size="xs" />
                      </td>

                      {/* Amount & payment */}
                      <td className="px-2 py-2">
                        <p className="whitespace-nowrap font-sans text-xs font-semibold text-success-deep">{totalAmount.toLocaleString()} MMK</p>
                        <span className={`mt-0.5 inline-flex rounded-md border px-1.5 py-0.5 text-xs font-extrabold ${
                          wo.isPaid ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-rose-200 bg-rose-50 text-rose-800'
                        }`}>
                          {wo.isPaid ? 'Paid' : 'Unpaid'}
                        </span>
                      </td>

                      {/* Action */}
                      <td className="px-2 py-2 text-right hidden xl:table-cell">
                        <div className="flex items-center justify-end" onClick={(e) => e.stopPropagation()}>
                          <Button
                            type="button"
                            onClick={() => handleOpenTicketDetail(wo)}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-line bg-surface text-ink transition-colors hover:border-brand hover:bg-blue-50 hover:text-brand"
                            title="View Ticket Status"
                            aria-label={`View status for ${wo.orderNumber || wo.id}`}
                          >
                            <Maximize2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
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
                  className={`p-4 rounded-2xl border text-xs cursor-pointer transition-all space-y-3 hover:shadow-md ${getPriorityStyle(wo.priority)}`}
                >
                  <div className="flex justify-between items-center pb-2 border-b border-line">
                    <span className="font-mono font-black text-brand bg-brand/10 px-2.5 py-1 rounded-md text-xs">
                      {wo.orderNumber}
                    </span>

                    <div className="flex items-center space-x-1.5">
                      <PriorityBadge priority={wo.priority} size="xs" />
                      <StatusBadge status={wo.status} size="xs" />
                    </div>
                  </div>

                  <div className="space-y-1">
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
                      Customer: <strong className="text-ink">{wo.customerName}</strong> ({wo.customerPhone})
                    </p>
                  </div>

                  <div className="p-2.5 bg-surface border border-line rounded-xl flex items-center justify-between text-xs">
                    <span className="font-bold text-ink flex items-center space-x-1.5">
                      <User className="w-4 h-4 text-brand" />
                      <span>Assigned Tech</span>
                    </span>
                    <span className="font-bold text-xs text-ink bg-white border border-line px-2.5 py-0.5 rounded-lg shadow-2xs">
                      {wo.assignedTechName || 'Unassigned'}
                    </span>
                  </div>

                  <div className="flex justify-between items-center pt-2 border-t border-line">
                    <div>
                      <span className="block text-xs text-muted uppercase font-bold">Total Estimate</span>
                      <span className="font-mono font-black text-sm text-brand">
                        {(wo.totalAmount || wo.subtotal || 0).toLocaleString()} MMK
                      </span>
                    </div>

                    <div className="flex items-center space-x-1.5" onClick={(e) => e.stopPropagation()}>
                      <Button
                        type="button"
                        onClick={() => handleOpenTicketDetail(wo)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--blue-tint)] text-[var(--primary)] transition-colors hover:bg-brand hover:text-white"
                        title="View Ticket Status"
                        aria-label={`View status for ${wo.orderNumber || wo.id}`}
                      >
                        <Maximize2 className="h-4 w-4" />
                      </Button>
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
