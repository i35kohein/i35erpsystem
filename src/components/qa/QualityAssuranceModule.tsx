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
                        <PriorityBadge priority={wo.priority} showNormal />
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
                  <h3 className="text-xs font-extrabold text-ink flex items-center space-x-2">
                    <ClipboardCheck className="h-4 w-4 text-brand" />
                    <span>21-Point Post-Repair Hardware Inspection</span>
                  </h3>
                  <div className="flex space-x-2">
                    <Button
                      type="button"
                      onClick={handleMarkAllPass}
                      className="rounded-full bg-success px-3 py-2 min-h-10 text-xs font-bold text-white shadow-xs transition-colors hover:bg-success/90"
                    >
                      Mark All Pass
                    </Button>
                    <Button
                      type="button"
                      onClick={() => setQaDiagnostics((prev) => prev.map((diagnostic) => ({ ...diagnostic, status: 'N/A' })))}
                      className="rounded-full border border-line-strong bg-surface px-3 min-h-10 text-xs font-bold text-ink shadow-xs transition-colors hover:bg-line-strong"
                    >
                      Mark All N/A
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-2.5 text-xs sm:grid-cols-2 lg:grid-cols-3 3xl:grid-cols-4">
                  {qaDiagnostics.map((item, idx) => {
                    const IconComp = getDiagnosticIcon(item.name);

                    return (
                      <div key={item.id} className="space-y-1.5 rounded-xl border border-line bg-white p-2.5 text-xs shadow-xs transition-all hover:border-brand/50">
                        <div className="font-bold text-ink flex justify-between items-center">
                          <div className="flex items-center space-x-1.5 truncate">
                            <div className="w-5 h-5 rounded-md bg-surface text-brand flex items-center justify-center shrink-0">
                              <IconComp className="w-3.5 h-3.5" />
                            </div>
                            <span className="text-xs font-extrabold truncate">{idx + 1}. {item.name}</span>
                          </div>

                          <span className={`text-xs font-black px-2 py-0.5 rounded-md tracking-wider uppercase shrink-0 shadow-2xs ${
                            item.status === 'Pass' ? 'bg-success text-white' :
                            item.status === 'Fail' ? 'bg-danger text-white' : 'bg-slate-600 text-white'
                          }`}>
                            {item.status === 'Pass' ? '✓ PASS' : item.status === 'Fail' ? '✕ FAIL' : 'N/A'}
                          </span>
                        </div>

                        {/* Status Toggle Buttons */}
                        <div className="flex space-x-1 text-xs">
                          <Button
                            type="button"
                            onClick={() => handleDiagnosticStatusChange(item.id, 'Pass')}
                            className={`flex-1 min-h-10 py-2 rounded-lg font-black transition-all ${
                              item.status === 'Pass' ? 'bg-success text-white shadow-xs' : 'bg-surface text-ink hover:bg-line'
                            }`}
                          >
                            Pass
                          </Button>
                          <Button
                            type="button"
                            onClick={() => handleDiagnosticStatusChange(item.id, 'Fail')}
                            className={`flex-1 min-h-10 py-2 rounded-lg font-black transition-all ${
                              item.status === 'Fail' ? 'bg-danger text-white shadow-xs' : 'bg-surface text-ink hover:bg-line'
                            }`}
                          >
                            Fail
                          </Button>
                          <Button
                            type="button"
                            onClick={() => handleDiagnosticStatusChange(item.id, 'N/A')}
                            className={`flex-1 min-h-10 py-2 rounded-lg font-black transition-all ${
                              item.status === 'N/A' ? 'bg-slate-600 text-white shadow-xs' : 'bg-surface text-ink hover:bg-line'
                            }`}
                          >
                            N/A
                          </Button>
                        </div>

                        {/* Diagnostic Comment Box */}
                        <div className="relative pt-1">
                          <Input
                            type="text"
                            value={item.note || ''}
                            onChange={(e) => handleDiagnosticNoteChange(item.id, e.target.value)}
                            placeholder={`Comment for ${item.name}...`}
                            className="w-full min-h-10 bg-surface border border-line rounded-xl px-3 text-sm text-ink focus:bg-white focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/25"
                          />
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
