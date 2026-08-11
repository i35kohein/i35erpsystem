import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useIsIpad } from '../../hooks/useIsIpad';
import {CheckCircle2, 
  X,
  Stethoscope,
  Camera,
  UserCheck,
  StickyNote,
  DollarSign, RotateCcw } from 'lucide-react';
import { WorkOrder, PostRepairChecklist, Technician, DiagnosticItemResult, DiagnosticStatus, AppUser, SystemSettings } from '../../types';
import { Button, Input } from '../ui';
import { DIAGNOSTIC_NAMES } from '../intake/deviceData';
import { CustomDropdownMenu } from '../common/CustomDropdownMenu';
import { compressImageFile } from '../../lib/utils';
import { confirmDialog } from '../common/ConfirmDialog';
import { PriorityBadge } from '../common/PriorityBadge';

interface QualityAssuranceModuleProps {
  workOrders: WorkOrder[];
  technicians: Technician[];
  currentUser?: AppUser;
  systemSettings?: SystemSettings;
  onSavePostRepairChecklist: (
    workOrderId: string, 
    checklist: PostRepairChecklist, 
    afterDiagnostics?: DiagnosticItemResult[],
    photos?: { before: string[]; after: string[] }
  ) => void;
  searchQuery?: string;
  setSearchQuery?: (q: string) => void;
  statusFilter?: string;
  setStatusFilter?: (s: string) => void;
  onNavigateToTab?: (tab: string) => void;
  /** Roster view mode — controlled from the navbar (Ko Hein 2026-08-10) */
  viewMode?: 'table' | 'cards';
  setViewMode?: (v: 'table' | 'cards') => void;
  /** Move a Taken Out ticket back for an Error Return (Ko Hein) */
  onErrorReturn?: (workOrderId: string) => void;
  /** System Users & Role Access Control list — Inspector dropdown source (Ko Hein 2026-08-10) */
  users?: AppUser[];
}

export const QualityAssuranceModule: React.FC<QualityAssuranceModuleProps> = ({
  workOrders,
  technicians,
  currentUser,
  systemSettings,
  onSavePostRepairChecklist,
  searchQuery = '',
  statusFilter = 'ALL',
  viewMode: propViewMode,
  onNavigateToTab,
  onErrorReturn,
  users = [],
}) => {
  // Only finished tasks are shown in QA & Warranty Inspection module
  const finishedWorkOrders = workOrders.filter(
    (w) =>
      (w.status === 'Finished' || w.status === 'Taken Out') &&
      !w.postRepairChecklist
  );

  const isTechnicianUser = currentUser?.role === 'Technician';

  // Inspector list comes from System Users & Role Access Control (users collection),
  // falling back to the technician roster when no system users exist (Ko Hein 2026-08-10).
  const inspectorOptions = useMemo(() => {
    const userOpts = users
      .filter((u) => u.status !== 'Inactive')
      .map((u) => ({ value: u.technicianId || u.id, label: u.name || u.email || u.id }));
    if (userOpts.length > 0) return userOpts;
    return technicians.map((t) => ({ value: t.id, label: t.name }));
  }, [users, technicians]);
  const myTechName = currentUser?.technicianName || currentUser?.name || '';
  const myTechId = currentUser?.technicianId || '';

  const filteredWorkOrders = finishedWorkOrders.filter((w) => {
    if (isTechnicianUser) {
      const isAssignedToMe =
        (myTechId && w.assignedTechId === myTechId) ||
        (myTechName && w.assignedTechName?.toLowerCase() === myTechName.toLowerCase()) ||
        (myTechName && (w as any).assignedTechnician?.toLowerCase() === myTechName.toLowerCase());
      if (!isAssignedToMe) return false;
    }
    const q = searchQuery.toLowerCase();
    const matchesSearch = !q ||
      w.orderNumber.toLowerCase().includes(q) ||
      w.customerName.toLowerCase().includes(q) ||
      w.deviceModel.toLowerCase().includes(q) ||
      w.serialNumber.toLowerCase().includes(q);

    // Dashboard-shared statusFilter must never empty the QA roster: apply it
    // only when it names a roster status (Finished / Taken Out); 'Pending QA'
    // and unrelated filters (e.g. Paid, In Progress) show the full queue.
    const matchesStatus =
      statusFilter === 'ALL' ||
      statusFilter === 'Pending QA' ||
      !['Finished', 'Taken Out'].includes(statusFilter) ||
      w.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const [selectedWoId, setSelectedWoId] = useState<string>(
    filteredWorkOrders[0]?.id || finishedWorkOrders[0]?.id || ''
  );
  const [isQaModalOpen, setIsQaModalOpen] = useState(false);
  const isIpad = useIsIpad();
  const selectedWo = filteredWorkOrders.find((w) => w.id === selectedWoId);
  const [qaSavedNotice, setQaSavedNotice] = useState<boolean>(false);
  const repairCategorySummary = selectedWo?.selectedRepairs?.length
    ? Array.from(new Set(selectedWo.selectedRepairs.map((repair) => repair.name.trim()).filter(Boolean))).join(' • ')
    : (selectedWo?.lineItems || [])
        .filter((item) => !item.isLabor)
        .map((item) => item.partName || item.description)
        .filter(Boolean)
        .join(' • ');

  // Re-anchor guard: only re-target the open ticket when the ROSTER changes
  // (not while the modal is open). Typing a search query in the navbar filters
  // filteredWorkOrders; without this gate the effect would silently switch the
  // inspector to the first remaining ticket mid-inspection (audit D-P2).
  const skipRetargetRef = useRef(false);

  useEffect(() => {
    if (isQaModalOpen) return; // never retarget while inspecting (audit D-P2)
    if (skipRetargetRef.current) {
      skipRetargetRef.current = false;
      return;
    }
    if (selectedWoId && !filteredWorkOrders.some((workOrder) => workOrder.id === selectedWoId)) {
      setSelectedWoId(filteredWorkOrders[0]?.id || '');
    }
  }, [filteredWorkOrders, selectedWoId, isQaModalOpen]);

  // Form State for Post Repair QA Checklist
  const [qaData, setQaData] = useState<PostRepairChecklist>(
    selectedWo?.postRepairChecklist || {
      trueToneTransferred: true,
      displayNoMessageWarning: true,
      batteryHealthVerified: true,
      cameraOisFunctional: true,
      proximitySensorWorking: true,
      speakerClarityPass: true,
      enclosureAlignmentPass: true,
      cleanAndSanitized: true,
      qaTechnicianId: inspectorOptions[0]?.value || 'tech-1',
      notes: '',
    }
  );

  // 21-Point Post-Repair Diagnostic Checklist State
  const [qaDiagnostics, setQaDiagnostics] = useState<DiagnosticItemResult[]>([]);
  // Roster view mode — controlled from the navbar (falls back to local)
  const [localQaViewMode] = useState<'table' | 'cards'>('table');
  const qaViewMode = propViewMode !== undefined ? propViewMode : localQaViewMode;
  // Before / After repair photos (uploaded in QA modal)
  const [qaBeforePhotos, setQaBeforePhotos] = useState<string[]>([]);
  const [qaAfterPhotos, setQaAfterPhotos] = useState<string[]>([]);
  const beforePhotoInputRef = React.useRef<HTMLInputElement>(null);
  const afterPhotoInputRef = React.useRef<HTMLInputElement>(null);
  // Photo count cap per set (before/after) — keeps JSONB writes well under
  // Supabase request-size limits (bug #7).
  const MAX_PHOTOS_PER_SET = 4;
  const [photoLimitNotice, setPhotoLimitNotice] = useState('');
  const handlePhotoFiles = (files: FileList | null, setter: React.Dispatch<React.SetStateAction<string[]>>, setterName: 'before' | 'after') => {
    const current = setterName === 'before' ? qaBeforePhotos : qaAfterPhotos;
    const room = MAX_PHOTOS_PER_SET - current.length;
    if (room <= 0) {
      setPhotoLimitNotice(`Max ${MAX_PHOTOS_PER_SET} ${setterName}-repair photos. Remove one to add another.`);
      setTimeout(() => setPhotoLimitNotice(''), 4000);
      return;
    }
    Array.from(files || []).slice(0, room).forEach((file) => {
      if (file.size > 8_000_000) return;
      void compressImageFile(file).then((dataUrl) => {
        if (dataUrl) setter((prev) => [...prev, dataUrl]);
      });
    });
  };
  // Cycle status: Pass -> Fail -> Cant Test -> N/A -> Pass (Ko Hein)
  const cycleStatus = (id: string, current: string) => {
    const order: DiagnosticStatus[] = ['Pass', 'Fail', 'Cant Test', 'N/A'];
    const idx = order.indexOf(current as DiagnosticStatus);
    const next = order[(idx + 1) % order.length];
    handleDiagnosticStatusChange(id, next);
  };
  // Update QA form & 21-point checklist whenever the SELECTED TICKET changes.
  // Deps are [selectedWoId] only (audit D-P2): selectedWo is re-derived each
  // render so any unrelated workOrders update (realtime, another tab) produced
  // a new object reference and wiped the inspector's in-progress verdicts.
  // `technicians` was pure churn and is gone. The ticket is read fresh below.
  useEffect(() => {
    const wo = filteredWorkOrders.find((w) => w.id === selectedWoId) || null;
    if (!wo) return;

    if (wo.postRepairChecklist) {
      setQaData(wo.postRepairChecklist);
    } else {
      setQaData({
        trueToneTransferred: true,
        displayNoMessageWarning: true,
        batteryHealthVerified: true,
        cameraOisFunctional: true,
        proximitySensorWorking: true,
        speakerClarityPass: true,
        enclosureAlignmentPass: true,
        cleanAndSanitized: true,
        qaTechnicianId: inspectorOptions[0]?.value || 'tech-1',
        notes: '',
      });
    }

    if (
      wo.postRepairChecklist &&
      wo.afterDiagnostics &&
      wo.afterDiagnostics.length > 0
    ) {
      setQaDiagnostics(
        wo.afterDiagnostics.map((diagnostic) => ({
          ...diagnostic,
          note: diagnostic.note?.trim().toLowerCase() === 'qa verified ok' ? '' : diagnostic.note,
        })),
      );
    } else if (
      (wo.afterDiagnostics && wo.afterDiagnostics.length > 0) ||
      (wo.beforeDiagnostics && wo.beforeDiagnostics.length > 0)
    ) {
      const untestedDiagnostics =
        wo.afterDiagnostics && wo.afterDiagnostics.length > 0
          ? wo.afterDiagnostics
          : wo.beforeDiagnostics;

      setQaDiagnostics(
        untestedDiagnostics.map((diagnostic) => ({
          ...diagnostic,
          status: 'N/A',
          note: '',
        })),
      );
    } else {
      setQaDiagnostics(
        DIAGNOSTIC_NAMES.map((name, i) => ({
          id: `qa-diag-${i + 1}`,
          name,
          status: 'N/A' as const,
          note: '',
        }))
      );
    }
    setQaBeforePhotos(wo.intakePhotos || []);
    setQaAfterPhotos(wo.afterRepairPhotos || []);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedWoId]);

  

  const handleDiagnosticStatusChange = (id: string, status: DiagnosticStatus) => {
    setQaDiagnostics((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status } : item))
    );
  };

  const handleDiagnosticNoteChange = (id: string, note: string) => {
    setQaDiagnostics((prev) =>
      prev.map((item) => (item.id === id ? { ...item, note } : item))
    );
  };

  const handleMarkAllPass = () => {
    setQaDiagnostics((prev) =>
      prev.map((item) => ({
        ...item,
        status: 'Pass',
        note: item.note?.trim() || '',
      }))
    );
  };

  // Confirm disabled until at least one diagnostic has an explicit verdict (Pass/Fail)
  const hasExplicitVerdict = qaDiagnostics.some((d) => d.status === 'Pass' || d.status === 'Fail');
  // Optional gate: require a before/after photo before confirming (per Settings)
  const hasAnyPhoto = qaBeforePhotos.length > 0 || qaAfterPhotos.length > 0;
  const photoGateBlocked = !!systemSettings?.requireQaPhotoBeforeConfirm && !hasAnyPhoto;
  // Settings-driven gates (Ko Hein 2026-08-11): mandatoryQaChecklist requires
  // an explicit Pass/Fail verdict; requireMicroSolderingLog requires the
  // micro-soldering log for board-level repairs.
  const checklistGateBlocked =
    !!systemSettings?.mandatoryQaChecklist && qaDiagnostics.every((d) => d.status !== 'Pass' && d.status !== 'Fail');
  const microSolderingGateBlocked =
    !!systemSettings?.requireMicroSolderingLog &&
    (selectedWo?.serviceType === 'Micro-Soldering' ||
      selectedWo?.repairTypeAI === 'hardware') &&
    !selectedWo?.microSolderingLog?.icReplaced?.length;
  const canConfirm = hasExplicitVerdict && !photoGateBlocked && !checklistGateBlocked && !microSolderingGateBlocked;

  const handleSaveQaPass = () => {
    if (!selectedWo) return;
    if (!canConfirm) return; // guard: verdict + photo gate must pass (button can be bypassed programmatically)
    skipRetargetRef.current = true; // keep the detail pane on this ticket after it leaves the roster
    onSavePostRepairChecklist(selectedWo.id, qaData, qaDiagnostics, {
      before: qaBeforePhotos,
      after: qaAfterPhotos,
    });
    setQaSavedNotice(true);
    setTimeout(() => setQaSavedNotice(false), 4000);
  };

  return (
    <div className={`space-y-3 text-xs ${isIpad ? 'flex min-h-0 flex-1 flex-col' : ''}`}>
      {/* Header removed 2026-08-10 (Ko Hein) — view toggle lives in the navbar,
          'QA Control' badge dropped */}

      {/* QA Roster — click a row/card to run the 21-Point Diagnostic */}
      <div className="bg-white border border-line rounded-2xl shadow-2xs overflow-hidden">
        {filteredWorkOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-10 text-center text-muted space-y-2">
            <CheckCircle2 className="w-8 h-8 text-success mx-auto opacity-50" />
            <p className="font-semibold text-xs">No Finished Devices Pending QA Control</p>
            <p className="text-xs">Devices moved to 'Finished' status in the repair pipeline automatically flow into QA Control for final inspection.</p>
          </div>
        ) : qaViewMode === 'cards' ? (
          /* CARDS GRID VIEW (Ko Hein 2026-08-10) */
          <div className="grid grid-cols-1 gap-3 p-3 sm:grid-cols-2 xl:grid-cols-3">
            {filteredWorkOrders.map((wo) => {
              const createdDate = new Date(wo.createdAt || Date.now()).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              });
              const openQaCard = () => {
                setSelectedWoId(wo.id);
                setIsQaModalOpen(true);
              };
              const repairs = (wo.selectedRepairs || []).map((r) => r.name).filter(Boolean).join(', ') || wo.symptomsReported || wo.serviceType || 'General Repair';
              return (
                <div
                  key={wo.id}
                  role="button"
                  tabIndex={0}
                  onClick={openQaCard}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openQaCard(); } }}
                  className="group flex cursor-pointer flex-col gap-2 rounded-2xl border border-line bg-white p-3 shadow-2xs transition-colors hover:border-brand/40 focus:outline-none"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono font-black text-brand text-xs">{wo.orderNumber || wo.id}</span>
                    <span className="text-[10px] font-bold text-muted">{createdDate}</span>
                  </div>
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-extrabold text-ink">{wo.deviceModel || 'Unknown Device'}</h3>
                    <p className="truncate text-xs text-muted">{wo.customerName}{wo.customerPhone ? ` · ${wo.customerPhone}` : ''}</p>
                  </div>
                  <p className="line-clamp-1 text-[11px] font-medium text-ink/80">{repairs}</p>
                  <div className="mt-auto flex items-center justify-between gap-2 border-t border-line pt-2">
                    <span className="rounded-md border border-warning/20 bg-warning/10 px-1.5 py-0.5 text-xs font-bold uppercase text-warning">QA Pending</span>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono font-extrabold text-xs text-ink">{wo.totalAmount.toLocaleString()} MMK</span>
                      {(wo as WorkOrder).status === 'Taken Out' && onErrorReturn ? (
                        <Button
                          variant="ghost"
                          type="button"
                          onClick={async (e) => {
                            e.stopPropagation();
                            const ok = await confirmDialog({ title: 'Error Return', message: `Error Return ${wo.orderNumber}? The ticket reopens for repair.`, confirmLabel: 'Error Return', danger: false });
                            if (ok) onErrorReturn(wo.id);
                          }}
                          className="!h-6 !min-h-6 w-6 px-0 rounded-full border border-warning/40 bg-warning/10 text-warning hover:bg-warning/20"
                          title="Error Return — customer brought the device back"
                          aria-label={`Error Return ${wo.orderNumber}`}
                        >
                          <RotateCcw className="w-3 h-3" />
                        </Button>
                      ) : ((wo as WorkOrder).status === 'Finished' || (wo as WorkOrder).status === 'Taken Out') && wo.postRepairChecklist ? (
                        <Button
                          variant="ghost"
                          type="button"
                          onClick={(e) => { e.stopPropagation(); onNavigateToTab?.('pos'); }}
                          className="!h-6 !min-h-6 w-6 px-0 rounded-full bg-success text-white hover:bg-success/90 border border-success"
                          title="Go to POS checkout"
                          aria-label={`Checkout ${wo.orderNumber}`}
                        >
                          <DollarSign className="w-3 h-3" />
                        </Button>
                      ) : wo.status === 'Finished' ? (
                        <Button
                          variant="ghost"
                          type="button"
                          onClick={(e) => { e.stopPropagation(); openQaCard(); }}
                          className="!h-6 !min-h-6 w-6 px-0 rounded-full border border-line bg-brand-soft text-brand hover:bg-white"
                          title="Run 21-Point Diagnostic"
                          aria-label={`Run 21-point diagnostic for ${wo.orderNumber}`}
                        >
                          <Stethoscope className="w-3 h-3" />
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
                  <div className="overflow-x-auto">
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
                {filteredWorkOrders.map((wo) => {
                  const createdDate = new Date(wo.createdAt || Date.now()).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  });
                  const openQa = () => {
                    setSelectedWoId(wo.id);
                    setIsQaModalOpen(true);
                  };
                  return (
                    <tr
                      key={wo.id}
                      onClick={openQa}
                      className="hover:bg-surface transition-colors cursor-pointer"
                    >
                      {/* Ticket # & Date */}
                      <td className="py-3 px-3">
                        <p className="font-mono font-black text-brand text-xs">{wo.orderNumber || wo.id}</p>
                        <span className="text-xs text-muted">{createdDate}</span>
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
                          {wo.deviceColor ? ` · ${wo.deviceColor}` : ''}
                        </p>
                      </td>

                      {/* Symptoms / Service */}
                      <td className="py-3 px-3 hidden lg:table-cell">
                        <p className="text-xs text-ink line-clamp-1 max-w-[180px]" title={wo.symptomsReported || (wo.selectedRepairs || []).map((r) => r.name).join(', ') || wo.serviceType}>
                          {wo.symptomsReported || (wo.selectedRepairs || []).map((r) => r.name).join(', ') || wo.serviceType || 'General Repair'}
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
                        {wo.priority && wo.priority !== 'Normal' ? (
                          <PriorityBadge priority={wo.priority} />
                        ) : (
                          <span className="text-xs text-muted">-</span>
                        )}
                      </td>

                      {/* Stage & Status */}
                      <td className="py-3 px-3">
                        <span className="text-xs font-bold px-1.5 py-0.5 rounded-md border bg-warning/10 text-warning border-warning/20 uppercase">
                          QA Pending
                        </span>
                      </td>

                      {/* Amount */}
                      <td className="py-3 px-3">
                        <p className="font-mono font-extrabold text-xs text-ink">{wo.totalAmount.toLocaleString()} MMK</p>
                      </td>

                      {/* Actions — Diagnose before Checkout; Taken Out is final except Error Return (Ko Hein) */}
                      <td className="py-3 px-3 text-right">
                        <div className="inline-flex items-center justify-end gap-1">
                          {(wo as WorkOrder).status === 'Taken Out' ? (
                            /* Checked out — only Error Return can bring it back */
                            onErrorReturn ? (
                              <Button
                                variant="ghost"
                                type="button"
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  const ok = await confirmDialog({ title: 'Error Return', message: `Error Return ${wo.orderNumber}? The ticket reopens for repair.`, confirmLabel: 'Error Return', danger: false });
                                  if (ok && onErrorReturn) onErrorReturn(wo.id);
                                }}
                                className="!h-7 !min-h-7 px-2 rounded-full border border-warning/40 bg-warning/10 text-warning hover:bg-warning/20"
                                title="Error Return — customer brought the device back"
                                aria-label={`Error Return ${wo.orderNumber}`}
                              >
                                <RotateCcw className="w-3 h-3" />
                                <span className="text-[10px] font-black">Return</span>
                              </Button>
                            ) : null
                          ) : ((wo as WorkOrder).status === 'Finished' || (wo as WorkOrder).status === 'Taken Out') && wo.postRepairChecklist ? (
                            <Button
                              variant="ghost"
                              type="button"
                              onClick={(e) => { e.stopPropagation(); onNavigateToTab?.('pos'); }}
                              className="!h-7 !min-h-7 w-7 px-0 rounded-full bg-success text-white hover:bg-success/90 border border-success"
                              title="Go to POS checkout"
                              aria-label={`Checkout ${wo.orderNumber}`}
                            >
                              <DollarSign className="w-3.5 h-3.5" />
                            </Button>
                          ) : wo.status === 'Finished' ? (
                            <Button
                              variant="ghost"
                              type="button"
                              onClick={(e) => { e.stopPropagation(); openQa(); }}
                              className="!h-7 !min-h-7 w-7 px-0 rounded-full border border-line bg-brand-soft text-brand hover:bg-white"
                              title="Run 21-Point Diagnostic"
                              aria-label={`Run 21-point diagnostic for ${wo.orderNumber}`}
                            >
                              <Stethoscope className="h-3.5 w-3.5" />
                            </Button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 21-Point Diagnostic Modal */}
      {isQaModalOpen && selectedWo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-3 sm:p-5" onClick={() => setIsQaModalOpen(false)}>
          <div
            className="flex h-[92vh] max-h-[760px] min-h-0 w-full max-w-5xl flex-col overflow-hidden rounded-xl border border-line bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3 shrink-0">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-brand font-bold shrink-0">{selectedWo.orderNumber}</span>
                  <h2 className="text-sm font-bold text-ink truncate">{selectedWo.deviceModel} — 21-Point Post-Repair Inspection</h2>
                </div>
                {repairCategorySummary && (
                  <p className="mt-0.5 text-xs font-semibold text-muted truncate">
                    Repair: <span className="text-ink">{repairCategorySummary}</span>
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {qaSavedNotice && (
                  <span className="text-xs font-bold text-success-deep bg-success/10 border border-success/30 px-2 py-1 rounded-lg">
                    ✓ QA Confirmed
                  </span>
                )}
                <Button
                  type="button"
                  onClick={handleSaveQaPass}
                  disabled={!canConfirm}
                  title={
                    !hasExplicitVerdict
                      ? 'Set at least one diagnostic (Pass/Fail) to confirm'
                      : photoGateBlocked
                      ? 'Attach a before/after photo to confirm (required by Settings)'
                      : 'Confirm QA pass and mark device ready'
                  }
                  className={`flex items-center space-x-1.5 transition-colors ${
                    canConfirm
                      ? 'bg-success hover:bg-success/90 text-white'
                      : 'bg-line text-muted cursor-not-allowed'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Confirm QA Pass</span>
                </Button>
                <Button
                  type="button"
                  onClick={() => setIsQaModalOpen(false)}
                  variant="ghost"
                  className="!h-8 !min-h-8 w-8 px-0 text-muted hover:bg-surface hover:text-ink rounded-lg"
                  aria-label="Close QA inspection"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Modal body: photos + 21-point checklist + inspector */}
            <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3">
              {/* Before / After repair photos */}
              <div className="space-y-2 rounded-xl border border-line bg-surface p-3">
                <div className="flex flex-wrap gap-4">
                  {/* Before */}
                  <div className="flex-1 min-w-[200px] space-y-1.5">
                    <h4 className="text-[11px] font-extrabold text-ink flex items-center gap-1.5">
                      <Camera className="w-3.5 h-3.5 text-brand" />
                      <span>Before-Repair Photos</span>
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {qaBeforePhotos.map((photo, idx) => (
                        <div key={idx} className="relative w-16 h-16 rounded-lg overflow-hidden border border-line group">
                          <img src={photo} alt={`Before photo ${idx + 1}`} className="w-full h-full object-cover" />
                          <Button
                            type="button"
                            onClick={() => setQaBeforePhotos((prev) => prev.filter((_, i) => i !== idx))}
                            className="absolute top-0.5 right-0.5 bg-black/70 text-white p-0.5 rounded-full"
                            aria-label={`Remove before photo ${idx + 1}`}
                          >
                            <X className="w-2.5 h-2.5" />
                          </Button>
                        </div>
                      ))}
                      <Input
                        ref={beforePhotoInputRef}
                        type="file"
                        accept="image/*"
                        capture="environment"
                        multiple
                        className="hidden"
                        onChange={(e) => { handlePhotoFiles(e.target.files, setQaBeforePhotos, 'before'); e.target.value = ''; }}
                      />
                      <Button
                        type="button"
                        onClick={() => beforePhotoInputRef.current?.click()}
                        className="w-16 h-16 rounded-lg border-2 border-dashed border-line hover:border-brand flex flex-col items-center justify-center text-muted hover:text-brand text-[9px] gap-0.5 bg-white transition-all"
                        title="Add before photo"
                      >
                        <Camera className="w-4 h-4" />
                        <span>Add</span>
                      </Button>
                    </div>
                  </div>
                  {/* After */}
                  <div className="flex-1 min-w-[200px] space-y-1.5">
                    <h4 className="text-[11px] font-extrabold text-ink flex items-center gap-1.5">
                      <Camera className="w-3.5 h-3.5 text-success-deep" />
                      <span>After-Repair Photos</span>
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {qaAfterPhotos.map((photo, idx) => (
                        <div key={idx} className="relative w-16 h-16 rounded-lg overflow-hidden border border-line group">
                          <img src={photo} alt={`After photo ${idx + 1}`} className="w-full h-full object-cover" />
                          <Button
                            type="button"
                            onClick={() => setQaAfterPhotos((prev) => prev.filter((_, i) => i !== idx))}
                            className="absolute top-0.5 right-0.5 bg-black/70 text-white p-0.5 rounded-full"
                            aria-label={`Remove after photo ${idx + 1}`}
                          >
                            <X className="w-2.5 h-2.5" />
                          </Button>
                        </div>
                      ))}
                      <Input
                        ref={afterPhotoInputRef}
                        type="file"
                        accept="image/*"
                        capture="environment"
                        multiple
                        className="hidden"
                        onChange={(e) => { handlePhotoFiles(e.target.files, setQaAfterPhotos, 'after'); e.target.value = ''; }}
                      />
                      <Button
                        type="button"
                        onClick={() => afterPhotoInputRef.current?.click()}
                        className="w-16 h-16 rounded-lg border-2 border-dashed border-line hover:border-success flex flex-col items-center justify-center text-muted hover:text-success-deep text-[9px] gap-0.5 bg-white transition-all"
                        title="Add after photo"
                      >
                        <Camera className="w-4 h-4" />
                        <span>Add</span>
                      </Button>
                    </div>
                  </div>
                </div>
                {photoLimitNotice && (
                  <p role="status" className="mt-2 rounded-lg bg-warning/10 px-3 py-1.5 text-[11px] font-bold text-warning">
                    {photoLimitNotice}
                  </p>
                )}
              </div>

              {/* 21-Point checklist — PHONE TESTING & CHECKING style (Ko Hein) */}
              <div>
                <div className="flex items-center justify-between border-b border-line pb-2">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-muted">Post-Repair Inspection</span>
                  <div className="flex items-center gap-2">
                    <span className="shrink-0 font-mono text-[11px] font-black text-brand">
                      {qaDiagnostics.filter((d) => d.status !== 'N/A').length}/{qaDiagnostics.length || 21}
                    </span>
                    <Button
                      type="button"
                      onClick={handleMarkAllPass}
                      className="!h-7 !min-h-7 rounded-lg bg-success px-2.5 text-[11px] font-bold text-white transition-colors hover:bg-success/90"
                    >
                      All Pass
                    </Button>
                    <Button
                      type="button"
                      onClick={() => setQaDiagnostics((prev) => prev.map((d) => ({ ...d, status: 'N/A' as const })))}
                      className="!h-7 !min-h-7 rounded-lg border border-line-strong bg-surface px-2.5 text-[11px] font-bold text-ink transition-colors hover:bg-line-strong"
                    >
                      All N/A
                    </Button>
                  </div>
                </div>
                <div className="mt-0 grid grid-cols-1 gap-x-4 sm:grid-cols-2 sm:gap-x-8">
                  {qaDiagnostics.map((item, idx) => {
                    const isPass = item.status === 'Pass';
                    const isFail = item.status === 'Fail';
                    const isCantTest = item.status === 'Cant Test';
                    return (
                      <div key={item.id} className="flex min-h-7 items-center gap-2 border-b border-line/60 py-1.5">
                        <Button
                          type="button"
                          onClick={() => cycleStatus(item.id, item.status)}
                          title={isPass ? 'Pass — tap for Fail' : isFail ? 'Fail — tap for N/A' : isCantTest ? 'Cant Test — tap for N/A' : 'Not checked — tap for Pass'}
                          aria-label={`Change status for ${item.name}`}
                          className={`flex !h-4 !w-4 !min-h-4 !min-w-4 shrink-0 items-center justify-center rounded-full border text-[10px] font-black leading-none transition-colors cursor-pointer ${
                            isPass
                              ? 'border-success bg-success text-white'
                              : isFail
                              ? 'border-danger bg-danger text-white'
                              : isCantTest
                              ? 'border-warning bg-warning text-white'
                              : 'border-line bg-white text-muted hover:border-brand'
                          }`}
                        >
                          {isPass ? '\u2713' : isFail ? '\u2715' : isCantTest ? '?' : ''}
                        </Button>
                        <button
                          type="button"
                          onClick={() => handleDiagnosticStatusChange(item.id, 'Pass')}
                          className={`min-w-0 truncate text-left text-xs font-semibold transition-colors cursor-pointer hover:underline ${isPass ? 'text-success-deep' : isFail ? 'text-danger' : isCantTest ? 'text-warning' : 'text-muted hover:text-success-deep'}`}
                          title={`Mark ${item.name} as Pass`}
                          aria-label={`Mark ${item.name} as Pass`}
                        >
                          {idx + 1}. {item.name}
                        </button>
                        <input
                          aria-label={`${item.name} note`}
                          value={item.note || ''}
                          onChange={(e) => handleDiagnosticNoteChange(item.id, e.target.value)}
                          placeholder={isPass ? 'ok' : isFail ? 'issue…' : isCantTest ? 'note' : 'n/a'}
                          className="ml-auto h-6 min-w-0 flex-1 rounded-md bg-transparent px-1.5 text-xs outline-none transition-colors placeholder:text-muted/60 focus:bg-[#d9f99d]/40"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
              {/* Inspector — technician + notes in one compact row */}
              <div className="flex flex-col sm:flex-row gap-2 rounded-xl border border-line bg-surface/80 p-2.5">
                <div className="flex items-center gap-2 sm:w-56 shrink-0">
                  <span className="w-7 h-7 rounded-full bg-brand/10 text-brand flex items-center justify-center shrink-0">
                    <UserCheck className="w-3.5 h-3.5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-bold text-muted uppercase tracking-wider">Inspector</p>
                    <CustomDropdownMenu
                      value={qaData.qaTechnicianId}
                      onChange={(value) => setQaData({ ...qaData, qaTechnicianId: value })}
                      options={inspectorOptions}
                      placeholder="Select inspector"
                      className="w-full"
                      buttonClassName="!h-6 !min-h-6 w-full text-[11px]"
                      menuAlign="left"
                      menuPlacement="bottom"
                      size="sm"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className="w-7 h-7 rounded-full bg-surface border border-line text-muted flex items-center justify-center shrink-0">
                    <StickyNote className="w-3.5 h-3.5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-bold text-muted uppercase tracking-wider">Notes</p>
                    <Input
                      type="text"
                      value={qaData.notes}
                      onChange={(e) => setQaData({ ...qaData, notes: e.target.value })}
                      placeholder="Final QA notes…"
                      className="!h-6 !min-h-6 w-full rounded-md bg-white border border-line px-2 text-[11px] text-ink focus:outline-none "
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
