import React, { useState, useEffect } from 'react';
import { useIsIpad } from '../../hooks/useIsIpad';
import {ShieldCheck, 
  CheckCircle2, 
  X,
  ClipboardCheck} from 'lucide-react';
import { WorkOrder, PostRepairChecklist, Technician, DiagnosticItemResult, AppUser } from '../../types';
import { Button , Input } from '../ui';
import { DIAGNOSTIC_NAMES, getDiagnosticIcon } from '../intake/deviceData';
import { CustomDropdownMenu } from '../common/CustomDropdownMenu';
import { PriorityBadge } from '../common/PriorityBadge';

interface QualityAssuranceModuleProps {
  workOrders: WorkOrder[];
  technicians: Technician[];
  currentUser?: AppUser;
  onSavePostRepairChecklist: (
    workOrderId: string, 
    checklist: PostRepairChecklist, 
    afterDiagnostics?: DiagnosticItemResult[]
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
  }, [selectedWoId, selectedWo, technicians]);

  

  const handleDiagnosticStatusChange = (id: string, status: 'Pass' | 'Fail' | 'N/A') => {
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

  const handleSaveQaPass = () => {
    if (!selectedWo) return;
    onSavePostRepairChecklist(selectedWo.id, qaData, qaDiagnostics);
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
                  title="Confirm QA pass and mark device ready"
                  className="bg-success hover:bg-success/90 text-white flex items-center space-x-1.5"
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

            {/* Modal body: 21-point checklist + inspector */}
            <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3">
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
                  {qaDiagnostics.map((item, idx) => {
                    const IconComp = getDiagnosticIcon(item.name);
                    const isPass = item.status === 'Pass';
                    const isFail = item.status === 'Fail';
                    const isNa = item.status === 'N/A';

                    return (
                      <div key={item.id} className={`flex items-center gap-1.5 px-2 py-1 text-[11px] rounded-lg border transition-colors ${
                        isFail ? 'bg-danger/5 border-danger/15' : isPass ? 'bg-success/5 border-success/15' : 'bg-white border-line hover:border-brand/30'
                      }`}>
                        {/* Number + icon + name */}
                        <div className="flex items-center gap-1 min-w-0 flex-1">
                          <span className={`w-3.5 h-3.5 rounded flex items-center justify-center shrink-0 ${
                            isFail ? 'bg-danger/10 text-danger' : isPass ? 'bg-success/10 text-success-deep' : 'bg-surface text-muted'
                          }`}>
                            <IconComp className="w-2 h-2" />
                          </span>
                          <span className="text-[10px] font-bold text-ink truncate">{idx + 1}. {item.name}</span>
                        </div>

                        {/* Comment */}
                        <Input
                          type="text"
                          value={item.note || ''}
                          onChange={(e) => handleDiagnosticNoteChange(item.id, e.target.value)}
                          placeholder="Note"
                          className="!h-5 !min-h-5 w-16 shrink-0 rounded bg-surface border border-line px-1 text-[10px] text-ink focus:bg-white focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand/20"
                        />

                        {/* Status segmented — pill group */}
                        <div className="flex items-center gap-0.5 shrink-0 bg-surface border border-line rounded-md p-0.5">
                          <Button
                            type="button"
                            onClick={() => handleDiagnosticStatusChange(item.id, 'Pass')}
                            className={`!h-4 !min-h-4 px-1 rounded text-[9px] font-black leading-none transition-all ${
                              isPass
                                ? 'bg-success text-white shadow-2xs'
                                : 'text-muted hover:text-success hover:bg-success/10'
                            }`}
                          >
                            ✓
                          </Button>
                          <Button
                            type="button"
                            onClick={() => handleDiagnosticStatusChange(item.id, 'Fail')}
                            className={`!h-4 !min-h-4 px-1 rounded text-[9px] font-black leading-none transition-all ${
                              isFail
                                ? 'bg-danger text-white shadow-2xs'
                                : 'text-muted hover:text-danger hover:bg-danger/10'
                            }`}
                          >
                            ✕
                          </Button>
                          <Button
                            type="button"
                            onClick={() => handleDiagnosticStatusChange(item.id, 'N/A')}
                            className={`!h-4 !min-h-4 px-1 rounded text-[8px] font-black leading-none transition-all ${
                              isNa
                                ? 'bg-slate-500 text-white shadow-2xs'
                                : 'text-muted hover:text-ink hover:bg-slate-200/60'
                            }`}
                          >
                            NA
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Inspector Technician & Notes */}
              <div className="grid grid-cols-1 gap-3 rounded-xl border border-line bg-surface/80 p-3 sm:grid-cols-[minmax(220px,0.8fr)_minmax(0,1.2fr)]">
                <div>
                  <label className="block text-muted font-bold mb-1">QA Inspector Technician</label>
                  <CustomDropdownMenu
                    value={qaData.qaTechnicianId}
                    onChange={(value) => setQaData({ ...qaData, qaTechnicianId: value })}
                    options={technicians.map((technician) => ({
                      value: technician.id,
                      label: technician.name,
                      badge: technician.level,
                    }))}
                    placeholder="Select QA inspector"
                    className="w-full"
                    buttonClassName="w-full"
                    menuAlign="left"
                    menuPlacement="top"
                    size="sm"
                  />
                </div>

                <div>
                  <label className="block text-muted font-bold mb-1">QA Inspector Verification Notes</label>
                  <textarea
                    rows={1}
                    value={qaData.notes}
                    onChange={(e) => setQaData({ ...qaData, notes: e.target.value })}
                    placeholder="Add final QA notes…"
                    className="min-h-8 w-full resize-y rounded-lg border border-line bg-white px-2.5 py-1.5 text-ink focus:border-brand focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
