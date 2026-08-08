import React, { useState, useEffect } from 'react';
import { useIsIpad } from '../../hooks/useIsIpad';
import {ShieldCheck, 
  CheckCircle2, 
  X,
  ClipboardCheck,
  MoreHorizontal,
  Camera,
  UserCheck,
  StickyNote} from 'lucide-react';
import { WorkOrder, PostRepairChecklist, Technician, DiagnosticItemResult, DiagnosticStatus, AppUser, SystemSettings } from '../../types';
import { Button , Input } from '../ui';
import { DIAGNOSTIC_NAMES, getDiagnosticIcon } from '../intake/deviceData';
import { CustomDropdownMenu } from '../common/CustomDropdownMenu';
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
}

export const QualityAssuranceModule: React.FC<QualityAssuranceModuleProps> = ({
  workOrders,
  technicians,
  currentUser,
  systemSettings,
  onSavePostRepairChecklist,
  searchQuery = '',
  statusFilter = 'ALL',
}) => {
  // Only finished tasks are shown in QA & Warranty Inspection module
  const finishedWorkOrders = workOrders.filter(
    (w) =>
      (w.status === 'Finished' || w.status === 'Taken Out') &&
      !w.postRepairChecklist
  );

  const isTechnicianUser = currentUser?.role === 'Technician';
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

    const matchesStatus = statusFilter === 'ALL' || statusFilter === 'Pending QA';

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

  useEffect(() => {
    if (!filteredWorkOrders.some((workOrder) => workOrder.id === selectedWoId)) {
      setSelectedWoId(filteredWorkOrders[0]?.id || '');
    }
  }, [filteredWorkOrders, selectedWoId]);

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
      qaTechnicianId: technicians[0]?.id || 'tech-1',
      notes: '',
    }
  );

  // 21-Point Post-Repair Diagnostic Checklist State
  const [qaDiagnostics, setQaDiagnostics] = useState<DiagnosticItemResult[]>([]);
  // Which checklist rows have the note input open (comment icon toggle)
  // Which card's ⋮ menu popup is open
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  // Before / After repair photos (uploaded in QA modal)
  const [qaBeforePhotos, setQaBeforePhotos] = useState<string[]>([]);
  const [qaAfterPhotos, setQaAfterPhotos] = useState<string[]>([]);
  const beforePhotoInputRef = React.useRef<HTMLInputElement>(null);
  const afterPhotoInputRef = React.useRef<HTMLInputElement>(null);
  const handlePhotoFiles = (files: FileList | null, setter: React.Dispatch<React.SetStateAction<string[]>>) => {
    Array.from(files || []).forEach((file) => {
      if (file.size > 4_000_000) return;
      const reader = new FileReader();
      reader.onload = () => setter((prev) => [...prev, String(reader.result || '')]);
      reader.readAsDataURL(file);
    });
  };
  // Cycle status: Pass -> Fail -> N/A -> Pass
  const cycleStatus = (id: string, current: string) => {
    const order: DiagnosticStatus[] = ['Pass', 'Fail', 'N/A', 'Cant Test'];
    const idx = order.indexOf(current as DiagnosticStatus);
    const next = order[(idx + 1) % order.length];
    handleDiagnosticStatusChange(id, next);
    // Auto-open the comment popup to capture the reason for 'Cant Test'
    if (next === 'Cant Test') setMenuOpenId(id);
  };
  // Long-press on a card opens its note input (no comment icon)
  const pressTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const startNotePress = (id: string) => {
    pressTimer.current = setTimeout(() => {
      setMenuOpenId(id);
    }, 450);
  };
  const cancelNotePress = () => {
    if (pressTimer.current) { clearTimeout(pressTimer.current); pressTimer.current = null; }
  };
  // Update QA form & 21-point checklist whenever selectedWoId changes
  useEffect(() => {
    if (!selectedWo) return;

    if (selectedWo.postRepairChecklist) {
      setQaData(selectedWo.postRepairChecklist);
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
        qaTechnicianId: technicians[0]?.id || 'tech-1',
        notes: '',
      });
    }

    if (
      selectedWo.postRepairChecklist &&
      selectedWo.afterDiagnostics &&
      selectedWo.afterDiagnostics.length > 0
    ) {
      setQaDiagnostics(
        selectedWo.afterDiagnostics.map((diagnostic) => ({
          ...diagnostic,
          note: diagnostic.note?.trim().toLowerCase() === 'qa verified ok' ? '' : diagnostic.note,
        })),
      );
    } else if (
      (selectedWo.afterDiagnostics && selectedWo.afterDiagnostics.length > 0) ||
      (selectedWo.beforeDiagnostics && selectedWo.beforeDiagnostics.length > 0)
    ) {
      const untestedDiagnostics =
        selectedWo.afterDiagnostics && selectedWo.afterDiagnostics.length > 0
          ? selectedWo.afterDiagnostics
          : selectedWo.beforeDiagnostics;

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
    setQaBeforePhotos(selectedWo.intakePhotos || []);
    setQaAfterPhotos(selectedWo.afterRepairPhotos || []);
  }, [selectedWoId, selectedWo, technicians]);

  

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
  const canConfirm = hasExplicitVerdict && !photoGateBlocked;

  const handleSaveQaPass = () => {
    if (!selectedWo) return;
    onSavePostRepairChecklist(selectedWo.id, qaData, qaDiagnostics, {
      before: qaBeforePhotos,
      after: qaAfterPhotos,
    });
    setQaSavedNotice(true);
    setTimeout(() => setQaSavedNotice(false), 4000);
  };

  return (
    <div className={`space-y-3 text-xs ${isIpad ? 'flex min-h-0 flex-1 flex-col' : ''}`}>
      {/* Header */}
      <div className="module-subheader flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-line shadow-xs">
        <div>
          <h1 className="text-lg font-bold text-ink flex items-center space-x-2">
            <ShieldCheck className="w-5 h-5 text-success" />
            <span className="hidden sm:inline">Quality Assurance (QA) & Warranty 21-Point Inspection</span>
            <span className="sm:hidden">QA & Warranty Inspection</span>
          </h1>
          <p className="text-xs text-muted">Mandatory 21-point re-inspection before pickup.</p>
        </div>

        <div className="bg-success/10 text-success-deep font-mono font-bold px-3 py-1 rounded-full border border-success/20">
          QA Control • Zero Defect Standard
        </div>
      </div>

      {/* QA Roster Table — click a row to run the 21-Point Diagnostic */}
      <div className="bg-white border border-line rounded-2xl shadow-2xs overflow-hidden">
        {filteredWorkOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-10 text-center text-muted space-y-2">
            <CheckCircle2 className="w-8 h-8 text-success mx-auto opacity-50" />
            <p className="font-semibold text-xs">No Finished Devices Pending QA Control</p>
            <p className="text-xs">Devices moved to 'Finished' status in the repair pipeline automatically flow into QA Control for final inspection.</p>
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
                  });
                  const isQaPassed = !!wo.postRepairChecklist;
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
                        {wo.priority && wo.priority !== 'Normal' ? (
                          <PriorityBadge priority={wo.priority} />
                        ) : (
                          <span className="text-xs text-muted">-</span>
                        )}
                      </td>

                      {/* Stage & Status */}
                      <td className="py-3 px-3">
                        {isQaPassed ? (
                          <span className="text-xs font-extrabold px-1.5 py-0.5 rounded-md border bg-success/10 text-success-deep border-success/20 uppercase">
                            Ready
                          </span>
                        ) : (
                          <span className="text-xs font-bold px-1.5 py-0.5 rounded-md border bg-warning/10 text-warning border-warning/20 uppercase">
                            QA Pending
                          </span>
                        )}
                      </td>

                      {/* Amount */}
                      <td className="py-3 px-3">
                        <p className="font-mono font-extrabold text-xs text-ink">{wo.totalAmount.toLocaleString()} MMK</p>
                      </td>

                      {/* Actions — Inspect only */}
                      <td className="py-3 px-3 text-right">
                        <div className="inline-flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            type="button"
                            onClick={(e) => { e.stopPropagation(); openQa(); }}
                            className="!h-7 !min-h-7 w-7 px-0 border border-line bg-brand-soft text-brand hover:bg-white rounded-lg"
                            title="Run 21-Point Diagnostic"
                            aria-label={`Run 21-point diagnostic for ${wo.orderNumber}`}
                          >
                            <ClipboardCheck className="h-3.5 w-3.5" />
                          </Button>
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
                      : 'bg-slate-300 text-slate-500 cursor-not-allowed'
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
                          <button
                            type="button"
                            onClick={() => setQaBeforePhotos((prev) => prev.filter((_, i) => i !== idx))}
                            className="absolute top-0.5 right-0.5 bg-black/70 text-white p-0.5 rounded-full"
                            aria-label={`Remove before photo ${idx + 1}`}
                          >
                            <X className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      ))}
                      <input
                        ref={beforePhotoInputRef}
                        type="file"
                        accept="image/*"
                        capture="environment"
                        multiple
                        className="hidden"
                        onChange={(e) => { handlePhotoFiles(e.target.files, setQaBeforePhotos); e.target.value = ''; }}
                      />
                      <button
                        type="button"
                        onClick={() => beforePhotoInputRef.current?.click()}
                        className="w-16 h-16 rounded-lg border-2 border-dashed border-line hover:border-brand flex flex-col items-center justify-center text-muted hover:text-brand text-[9px] gap-0.5 bg-white transition-all"
                        title="Add before photo"
                      >
                        <Camera className="w-4 h-4" />
                        <span>Add</span>
                      </button>
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
                          <button
                            type="button"
                            onClick={() => setQaAfterPhotos((prev) => prev.filter((_, i) => i !== idx))}
                            className="absolute top-0.5 right-0.5 bg-black/70 text-white p-0.5 rounded-full"
                            aria-label={`Remove after photo ${idx + 1}`}
                          >
                            <X className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      ))}
                      <input
                        ref={afterPhotoInputRef}
                        type="file"
                        accept="image/*"
                        capture="environment"
                        multiple
                        className="hidden"
                        onChange={(e) => { handlePhotoFiles(e.target.files, setQaAfterPhotos); e.target.value = ''; }}
                      />
                      <button
                        type="button"
                        onClick={() => afterPhotoInputRef.current?.click()}
                        className="w-16 h-16 rounded-lg border-2 border-dashed border-line hover:border-success flex flex-col items-center justify-center text-muted hover:text-success-deep text-[9px] gap-0.5 bg-white transition-all"
                        title="Add after photo"
                      >
                        <Camera className="w-4 h-4" />
                        <span>Add</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-2.5 rounded-xl border border-line bg-surface p-3">
                <div className="flex items-center justify-between border-b border-line pb-2">
                  <h3 className="text-[11px] font-bold text-ink flex items-center space-x-1.5">
                    <ClipboardCheck className="h-3.5 w-3.5 text-brand" />
                    <span>21-Point Post-Repair Inspection</span>
                  </h3>
                  <div className="flex space-x-1.5">
                    <Button
                      type="button"
                      onClick={handleMarkAllPass}
                      className="!h-7 !min-h-7 rounded-lg bg-success px-2.5 text-[11px] font-bold text-white shadow-2xs transition-colors hover:bg-success/90"
                    >
                      Mark All Pass
                    </Button>
                    <Button
                      type="button"
                      onClick={() => setQaDiagnostics((prev) => prev.map((diagnostic) => ({ ...diagnostic, status: 'N/A' })))}
                      className="!h-7 !min-h-7 rounded-lg border border-line-strong bg-surface px-2.5 text-[11px] font-bold text-ink shadow-2xs transition-colors hover:bg-line-strong"
                    >
                      Mark All N/A
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-1.5">
                  {qaDiagnostics.map((item, idx) => {
                    const IconComp = getDiagnosticIcon(item.name);
                    const isPass = item.status === 'Pass';
                    const isFail = item.status === 'Fail';
                    const isCantTest = item.status === 'Cant Test';

                    return (
                      <div
                        key={item.id}
                        onMouseDown={() => startNotePress(item.id)}
                        onMouseUp={cancelNotePress}
                        onMouseLeave={cancelNotePress}
                        onTouchStart={() => startNotePress(item.id)}
                        onTouchEnd={cancelNotePress}
                        onContextMenu={(e) => e.preventDefault()}
                        className={`rounded-xl border p-2.5 transition-colors select-none ${
                          isFail ? 'bg-danger/5 border-danger/20' : isPass ? 'bg-success/5 border-success/20' : isCantTest ? 'bg-warning/5 border-warning/30' : 'bg-white border-line hover:border-brand/30'
                        }`}
                        title="Hold to add note"
                      >
                        {/* Icon — click to cycle status (no border box) */}
                        <button
                          type="button"
                          onClick={() => cycleStatus(item.id, item.status)}
                          className={`mx-auto flex items-center justify-center transition-colors ${
                            isFail
                              ? 'text-danger'
                              : isPass
                              ? 'text-success-deep'
                              : isCantTest
                              ? 'text-warning'
                              : 'text-brand'
                          }`}
                          title={`Status: ${item.status} — click to change`}
                          aria-label={`Change status for ${item.name}`}
                        >
                          <IconComp className="w-8 h-8" />
                        </button>

                        {/* Name + ⋮ — same row */}
                        <div className="flex items-center gap-1 mt-1">
                          {/* Name — click to mark Pass */}
                          <button
                            type="button"
                            onClick={() => handleDiagnosticStatusChange(item.id, 'Pass')}
                            className={`flex-1 min-w-0 text-[11px] font-bold truncate text-left transition-colors ${
                              isPass ? 'text-success-deep' : isCantTest ? 'text-warning' : 'text-ink hover:text-success-deep'
                            }`}
                            title={`Mark ${item.name} as Pass`}
                            aria-label={`Mark ${item.name} as Pass`}
                          >
                            {idx + 1}. {item.name}
                          </button>
                          {/* ⋮ menu (Comment) */}
                          {isCantTest && (item.note || '').trim() && (
                            <p className="text-[9px] font-semibold text-warning truncate mt-0.5" title={item.note}>
                              ⚠ {item.note}
                            </p>
                          )}
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setMenuOpenId(menuOpenId === item.id ? null : item.id); }}
                            className={`!h-5 !min-h-5 w-5 px-0 rounded shrink-0 flex items-center justify-center transition-colors ${
                              menuOpenId === item.id ? 'bg-line text-ink' : 'text-muted hover:bg-line/60 hover:text-ink'
                            }`}
                            title="More options"
                            aria-label={`More options for ${item.name}`}
                          >
                            <MoreHorizontal className="w-3.5 h-3.5" />
                          </button>
                        </div>

                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Comment modal — fixed, never overflows the QA modal */}
              {menuOpenId && (() => {
                const item = qaDiagnostics.find((d) => d.id === menuOpenId);
                if (!item) return null;
                return (
                  <div
                    className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/40 p-4"
                    onClick={() => setMenuOpenId(null)}
                  >
                    <div
                      className="w-full max-w-xs bg-white border border-line rounded-2xl shadow-2xl p-3 space-y-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-between">
                        <p className="text-[11px] font-extrabold text-ink truncate">Comment — {item.name}</p>
                        <button
                          type="button"
                          onClick={() => setMenuOpenId(null)}
                          className="!h-6 !min-h-6 w-6 px-0 rounded flex items-center justify-center text-muted hover:bg-surface hover:text-ink"
                          aria-label="Close comment"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <Input
                        type="text"
                        value={item.note || ''}
                        onChange={(e) => handleDiagnosticNoteChange(item.id, e.target.value)}
                        placeholder="Type a note..."
                        autoFocus
                        className="!h-8 !min-h-8 w-full rounded-lg bg-surface border border-line px-2.5 text-xs text-ink focus:bg-white focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand/20"
                      />
                      <Button
                        type="button"
                        onClick={() => setMenuOpenId(null)}
                        className="!h-7 !min-h-7 w-full rounded-lg bg-brand text-white text-[11px] font-bold hover:bg-brand-deep"
                      >
                        Done
                      </Button>
                    </div>
                  </div>
                );
              })()}

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
                      options={technicians.map((technician) => ({
                        value: technician.id,
                        label: technician.name,
                        badge: technician.level,
                      }))}
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
                    <input
                      type="text"
                      value={qaData.notes}
                      onChange={(e) => setQaData({ ...qaData, notes: e.target.value })}
                      placeholder="Final QA notes…"
                      className="!h-6 !min-h-6 w-full rounded-md bg-white border border-line px-2 text-[11px] text-ink focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand/20"
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
