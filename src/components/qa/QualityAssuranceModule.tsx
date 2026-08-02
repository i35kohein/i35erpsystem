import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  CheckCircle2, 
  X, 
  RotateCcw, 
  UserCheck, 
  Sparkles,
  Smartphone,
  Check,
  AlertTriangle,
  MinusCircle
} from 'lucide-react';
import { WorkOrder, PostRepairChecklist, Technician, DiagnosticItemResult, AppUser } from '../../types';
import { DIAGNOSTIC_NAMES, getDiagnosticIcon } from '../intake/deviceData';
import { CustomDropdownMenu } from '../common/CustomDropdownMenu';

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

  const handleToggleQaItem = (key: keyof PostRepairChecklist) => {
    setQaData((prev) => ({
      ...prev,
      [key]: typeof prev[key] === 'boolean' ? !prev[key] : prev[key],
    }));
  };

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

  const passCount = qaDiagnostics.filter(d => d.status === 'Pass').length;
  const failCount = qaDiagnostics.filter(d => d.status === 'Fail').length;

  return (
    <div className="space-y-3 text-xs">
      {/* Header */}
      <div className="module-subheader flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-[#E5E5EA] shadow-xs">
        <div>
          <h1 className="text-lg font-bold text-[#1D1D1F] flex items-center space-x-2">
            <ShieldCheck className="w-5 h-5 text-[#34C759]" />
            <span>Quality Assurance (QA) & Warranty 21-Point Inspection</span>
          </h1>
          <p className="text-xs text-[#86868B]">Mandatory post-repair 21-hardware test re-inspection for finished devices in QA control before customer pickup</p>
        </div>

        <div className="bg-[#EAF8ED] text-[#28A745] font-mono font-bold px-3 py-1 rounded-full border border-[#34C759]/20">
          QA Control • Zero Defect Standard
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
        {/* Left Column: Work Orders Awaiting QA (4 cols) */}
        <div className="space-y-2 rounded-xl border border-[#E5E5EA] bg-white p-3 md:col-span-3">
          <div className="flex items-center justify-between gap-2 border-b border-[#E5E5EA] pb-2">
            <h2 className="min-w-0 truncate font-bold text-[#1D1D1F] text-xs">QA Queue</h2>
            <span className="shrink-0 text-[10px] font-mono font-bold bg-[#0071E3]/10 text-[#0071E3] px-2 py-0.5 rounded-full">
              {filteredWorkOrders.length} Pending
            </span>
          </div>

          <div className="space-y-2 max-h-[700px] overflow-y-auto pr-1">
            {filteredWorkOrders.length === 0 ? (
              <div className="p-6 text-center text-[#86868B] space-y-2">
                <CheckCircle2 className="w-8 h-8 text-[#34C759] mx-auto opacity-50" />
                <p className="font-semibold text-xs">No Finished Devices Pending QA Control</p>
                <p className="text-[11px]">Devices moved to 'Finished' status in the repair pipeline automatically flow into QA Control for final inspection.</p>
              </div>
            ) : (
              filteredWorkOrders.map((wo) => {
                const isSelected = wo.id === selectedWoId;
                const isQaPassed = !!wo.postRepairChecklist;

                return (
                  <div
                    key={wo.id}
                    onClick={() => setSelectedWoId(wo.id)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer ${
                      isQaPassed
                        ? isSelected
                          ? 'bg-[#E8F8EE] border-[#34C759] ring-2 ring-[#34C759]/30 shadow-xs'
                          : 'bg-[#F0FDF4] border-[#34C759]/60 hover:border-[#34C759] shadow-2xs'
                        : isSelected
                        ? 'bg-[#F0F6FF] border-[#0071E3] ring-2 ring-[#0071E3]/20 shadow-xs'
                        : 'bg-[#F5F5F7] border-[#E5E5EA] hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span className={`font-mono font-bold ${isQaPassed ? 'text-[#1E7E34]' : 'text-[#0071E3]'}`}>
                        {wo.orderNumber}
                      </span>
                      {isQaPassed ? (
                        <span className="bg-[#34C759] text-white text-[10px] px-2 py-0.5 rounded-md font-extrabold shadow-2xs">
                          Ready for Checkout
                        </span>
                      ) : (
                        <span className="bg-amber-100 text-amber-800 text-[10px] px-2 py-0.5 rounded-md border border-amber-200 font-semibold">
                          Finished • QA Pending
                        </span>
                      )}
                    </div>

                    <p className="font-bold text-[#1D1D1F] mt-1">{wo.deviceModel}</p>
                    <p className="text-[11px] text-[#86868B]">Cust: {wo.customerName}</p>

                    {isQaPassed ? (
                      <div className="mt-2 text-[10px] text-[#1E7E34] font-extrabold flex items-center space-x-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#34C759]" />
                        <span>QA Pass Verified • Ready for Pickup</span>
                      </div>
                    ) : (
                      <div className="mt-2 text-[10px] text-[#D97706] font-bold flex items-center space-x-1">
                        <ShieldCheck className="w-3.5 h-3.5 text-[#D97706]" />
                        <span>Awaiting QA Inspection</span>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: QA Checklist Worksheet & 21 Diagnostic Points (8 cols) */}
        <div className="space-y-3 rounded-xl border border-[#E5E5EA] bg-white p-3 md:col-span-9">
          {selectedWo ? (
            <div className="space-y-3">
              {qaSavedNotice && (
                <div className="p-3 bg-[#EAF8ED] border border-[#34C759] text-[#1E7E34] rounded-xl flex items-center justify-between font-bold text-xs animate-in fade-in">
                  <div className="flex items-center space-x-2">
                    <CheckCircle2 className="w-4 h-4 text-[#34C759]" />
                    <span>QA Inspection Confirmed! Card updated to Green & Ready for Checkout.</span>
                  </div>
                  <button onClick={() => setQaSavedNotice(false)} className="text-[#1E7E34] hover:opacity-75">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              <div className="border-b border-[#E5E5EA] pb-3 flex flex-wrap justify-between items-center gap-3">
                <div>
                  <span className="font-mono text-[#0071E3] font-bold">{selectedWo.orderNumber}</span>
                  <h2 className="text-base font-bold text-[#1D1D1F]">{selectedWo.deviceModel} Post-Repair QA Verification</h2>
                  {repairCategorySummary && (
                    <p className="mt-1 text-[11px] font-semibold text-[#86868B]">
                      Repair Category: <span className="text-[#1D1D1F]">{repairCategorySummary}</span>
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleMarkAllPass}
                    title="Mark every checklist item as Pass"
                    className="px-4 py-2 bg-white hover:bg-[#F5F5F7] text-[#1D1D1F] font-extrabold rounded-xl border border-[#D2D2D7] shadow-xs transition-all active:scale-95 flex items-center space-x-1.5"
                  >
                    <Check className="w-4 h-4 text-[#16A34A]" />
                    <span>Mark All Pass</span>
                  </button>

                  <button
                    onClick={handleSaveQaPass}
                    title="Confirm QA pass and mark device ready"
                    className="px-4 py-2 bg-[#34C759] hover:bg-[#30B753] text-white font-extrabold rounded-xl shadow-xs transition-all active:scale-95 flex items-center space-x-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Confirm QA Pass</span>
                  </button>
                </div>
              </div>

              {/* 21-Point Post-Repair Hardware Diagnostic Checklist */}
              <div className="space-y-2 rounded-xl border border-[#E5E5EA] bg-[#F5F5F7] p-3">
                <div className="flex items-center justify-between border-b border-[#E5E5EA] pb-2">
                  <h3 className="text-xs font-extrabold text-[#1D1D1F] flex items-center space-x-2">
                    <ShieldCheck className="w-4 h-4 text-[#0071E3]" />
                    <span>21-Point Post-Repair Hardware Inspection</span>
                  </h3>
                  <div className="flex items-center space-x-2 text-[10px] font-bold">
                    <span className="bg-[#16A34A] text-white px-2.5 py-0.5 rounded-md font-black shadow-2xs">Pass: {passCount}</span>
                    {failCount > 0 && <span className="bg-[#DC2626] text-white px-2.5 py-0.5 rounded-md font-black shadow-2xs animate-pulse">Fail: {failCount}</span>}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-1.5 text-xs sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {qaDiagnostics.map((item, idx) => {
                    const IconComp = getDiagnosticIcon(item.name);

                    return (
                      <div key={item.id} className="flex flex-col justify-between space-y-1 rounded-lg border border-[#E5E5EA] bg-white p-1.5 text-xs transition-colors hover:border-[#0071E3]/50">
                        <div className="space-y-1">
                          <div className="font-bold text-[#1D1D1F] flex justify-between items-center">
                            <div className="flex min-w-0 items-center gap-1 truncate">
                              <div className="flex h-4 w-4 shrink-0 items-center justify-center rounded bg-[#F5F5F7] text-[#0071E3]">
                                <IconComp className="h-3 w-3" />
                              </div>
                              <span className="truncate text-[10px] font-extrabold">{idx + 1}. {item.name}</span>
                            </div>

                            <span className={`shrink-0 rounded px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wide ${
                              item.status === 'Pass' ? 'bg-[#16A34A] text-white' :
                              item.status === 'Fail' ? 'bg-[#DC2626] text-white' : 'bg-[#475569] text-white'
                            }`}>
                              {item.status}
                            </span>
                          </div>

                          {/* Status Toggle Buttons */}
                          <div className="flex items-center gap-0.5 text-[9px]">
                            <button
                              type="button"
                              onClick={() => handleDiagnosticStatusChange(item.id, 'Pass')}
                              className={`h-6 !min-h-6 flex-1 rounded font-black transition-colors ${
                                item.status === 'Pass' ? 'bg-[#16A34A] text-white' : 'bg-[#F5F5F7] text-[#1D1D1F] hover:bg-slate-200'
                              }`}
                            >
                              Pass
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDiagnosticStatusChange(item.id, 'Fail')}
                              className={`h-6 !min-h-6 flex-1 rounded font-black transition-colors ${
                                item.status === 'Fail' ? 'bg-[#DC2626] text-white' : 'bg-[#F5F5F7] text-[#1D1D1F] hover:bg-slate-200'
                              }`}
                            >
                              Fail
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDiagnosticStatusChange(item.id, 'N/A')}
                              className={`h-6 !min-h-6 flex-1 rounded font-black transition-colors ${
                                item.status === 'N/A' ? 'bg-[#475569] text-white' : 'bg-[#F5F5F7] text-[#1D1D1F] hover:bg-slate-200'
                              }`}
                            >
                              N/A
                            </button>
                          </div>
                        </div>

                        {/* Optional Comment Input */}
                        <div>
                          <input
                            type="text"
                            value={item.note || ''}
                            onChange={(e) => handleDiagnosticNoteChange(item.id, e.target.value)}
                            placeholder="Optional note…"
                            className="h-6 !min-h-6 w-full rounded border border-[#E5E5EA] bg-[#F5F5F7] px-1.5 text-[9px] text-[#1D1D1F] placeholder:text-[#A1A1A6] focus:border-[#0071E3] focus:bg-white focus:outline-none"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Inspector Technician & Notes */}
              <div className="grid grid-cols-1 gap-3 rounded-xl border border-[#E5E5EA] bg-[#F5F5F7]/80 p-3 sm:grid-cols-[minmax(220px,0.8fr)_minmax(0,1.2fr)]">
                <div>
                  <label className="block text-[#86868B] font-bold mb-1">QA Inspector Technician</label>
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
                  <label className="block text-[#86868B] font-bold mb-1">QA Inspector Verification Notes</label>
                  <textarea
                    rows={1}
                    value={qaData.notes}
                    onChange={(e) => setQaData({ ...qaData, notes: e.target.value })}
                    placeholder="Add final QA notes…"
                    className="min-h-8 w-full resize-y rounded-lg border border-[#E5E5EA] bg-white px-2.5 py-1.5 text-[#1D1D1F] focus:border-[#0071E3] focus:outline-none"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="p-12 text-center text-[#86868B]">Select a work order to conduct QA checklist.</div>
          )}
        </div>
      </div>
    </div>
  );
};
