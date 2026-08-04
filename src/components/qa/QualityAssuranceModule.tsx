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
  MinusCircle,
  Wrench,
  Palette
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
        <div className="space-y-2 rounded-xl border border-[#E5E5EA] bg-white p-3 md:col-span-3 md:self-start">
          <div className="flex items-center justify-between gap-2 border-b border-[#E5E5EA] pb-2">
            <h2 className="min-w-0 truncate font-bold text-[#1D1D1F] text-xs">QA Queue</h2>
            <span className="shrink-0 text-[10px] font-mono font-bold bg-[#0071E3]/10 text-[#0071E3] px-2 py-0.5 rounded-full">
              {filteredWorkOrders.length} Pending
            </span>
          </div>

          <div className="space-y-2 max-h-[calc(100dvh-260px)] overflow-y-auto pr-1">
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
                const handleSelect = () => setSelectedWoId(wo.id);
                const repairs = (wo.selectedRepairs || []).filter((r) => r && r.name);

                return (
                  <div
                    key={wo.id}
                    role="button"
                    tabIndex={0}
                    onClick={handleSelect}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleSelect();
                      }
                    }}
                    className={`p-3 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#F0F6FF] border-[#0071E3] shadow-xs'
                        : 'bg-[#F5F5F7] border-[#E5E5EA] hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex justify-between items-center gap-1">
                      <span className="font-mono font-bold text-[#0071E3] flex items-center gap-1">
                        {isSelected && <Check className="w-3 h-3 shrink-0" />}
                        {wo.orderNumber}
                      </span>
                      <div className="flex items-center space-x-1">
                        <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-md border uppercase ${
                          wo.status === 'Taken Out' ? 'bg-slate-100 text-slate-600 border-slate-300' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        }`}>
                          {wo.status}
                        </span>
                        {isQaPassed ? (
                          <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-md border bg-[#EAF8ED] text-[#28A745] border-[#34C759]/20 uppercase">
                            Ready
                          </span>
                        ) : (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md border bg-[#FFF4E5] text-[#D97706] border-[#FF9F0A]/20 uppercase">
                            QA Pending
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex justify-between items-center gap-2 mt-1">
                      <p className="font-semibold text-[#1D1D1F] truncate">{wo.deviceModel}</p>
                      <span className="font-mono font-bold text-[#1D1D1F] shrink-0">{wo.totalAmount.toLocaleString()} MMK</span>
                    </div>

                    <div className="flex flex-wrap items-center gap-1 mt-1">
                      {repairs.slice(0, 2).map((r, i) => (
                        <span key={i} className="inline-flex items-center gap-1 rounded-md border border-[#0071E3]/20 bg-[#0071E3]/8 px-1.5 py-0.5 text-[9px] font-extrabold text-[#0071E3]">
                          <Wrench className="h-2.5 w-2.5" />
                          {r.name}
                        </span>
                      ))}
                      {repairs.length > 2 && (
                        <span className="text-[9px] font-bold text-[#86868B]">+{repairs.length - 2}</span>
                      )}
                      {wo.deviceColor && (
                        <span className="inline-flex items-center gap-1 rounded-md bg-white px-1.5 py-0.5 text-[9px] font-bold text-[#1D1D1F] border border-[#E5E5EA]">
                          <Palette className="h-2.5 w-2.5 text-[#86868B]" />
                          {wo.deviceColor}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between gap-2 text-[11px] text-[#86868B] mt-1">
                      <span className="truncate">
                        Cust: {wo.customerName}
                        {wo.depositAmount > 0 && (
                          <span className="text-[#0071E3] font-bold"> · Deposit {wo.depositAmount.toLocaleString()} MMK</span>
                        )}
                      </span>
                      <span className="font-mono text-[10px] shrink-0 truncate">
                        {(wo.imei || wo.serialNumber) && <>#{wo.imei || wo.serialNumber}</>}
                      </span>
                    </div>
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
                  <button onClick={() => setQaSavedNotice(false)} aria-label="Dismiss confirmation" className="text-[#1E7E34] hover:opacity-75">
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
              <div className="space-y-2.5 rounded-xl border border-[#E5E5EA] bg-[#F5F5F7] p-3">
                <div className="flex items-center justify-between border-b border-[#E5E5EA] pb-2">
                  <h3 className="text-xs font-extrabold text-[#1D1D1F] flex items-center space-x-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#0071E3] text-[10px] text-white">7</span>
                    <span>21-Point Post-Repair Hardware Inspection</span>
                  </h3>
                  <div className="flex space-x-2">
                    <button
                      type="button"
                      onClick={handleMarkAllPass}
                      className="rounded-full bg-[#34C759] px-3 py-1 text-[10px] font-bold text-white shadow-xs transition-colors hover:bg-[#28A745]"
                    >
                      Mark All Pass
                    </button>
                    <button
                      type="button"
                      onClick={() => setQaDiagnostics((prev) => prev.map((diagnostic) => ({ ...diagnostic, status: 'N/A' })))}
                      className="rounded-full border border-[#D2D2D7] bg-[#F5F5F7] px-3 py-1 text-[10px] font-bold text-[#1D1D1F] shadow-xs transition-colors hover:bg-[#E5E5EA]"
                    >
                      Mark All N/A
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-2.5 text-xs sm:grid-cols-2 lg:grid-cols-3">
                  {qaDiagnostics.map((item, idx) => {
                    const IconComp = getDiagnosticIcon(item.name);

                    return (
                      <div key={item.id} className="space-y-1.5 rounded-xl border border-[#E5E5EA] bg-white p-2.5 text-xs shadow-xs transition-all hover:border-[#0071E3]/50">
                        <div className="font-bold text-[#1D1D1F] flex justify-between items-center">
                          <div className="flex items-center space-x-1.5 truncate">
                            <div className="w-5 h-5 rounded-md bg-[#F5F5F7] text-[#0071E3] flex items-center justify-center shrink-0">
                              <IconComp className="w-3.5 h-3.5" />
                            </div>
                            <span className="text-[11px] font-extrabold truncate">{idx + 1}. {item.name}</span>
                          </div>

                          <span className={`text-[10px] font-black px-2 py-0.5 rounded-md tracking-wider uppercase shrink-0 shadow-2xs ${
                            item.status === 'Pass' ? 'bg-[#16A34A] text-white' :
                            item.status === 'Fail' ? 'bg-[#DC2626] text-white animate-pulse' : 'bg-[#475569] text-white'
                          }`}>
                            {item.status === 'Pass' ? '✓ PASS' : item.status === 'Fail' ? '✕ FAIL' : 'N/A'}
                          </span>
                        </div>

                        {/* Status Toggle Buttons */}
                        <div className="flex space-x-1 text-[10px]">
                          <button
                            type="button"
                            onClick={() => handleDiagnosticStatusChange(item.id, 'Pass')}
                            className={`flex-1 py-1 rounded-lg font-black transition-all ${
                              item.status === 'Pass' ? 'bg-[#16A34A] text-white shadow-xs' : 'bg-[#F5F5F7] text-[#1D1D1F] hover:bg-slate-200'
                            }`}
                          >
                            Pass
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDiagnosticStatusChange(item.id, 'Fail')}
                            className={`flex-1 py-1 rounded-lg font-black transition-all ${
                              item.status === 'Fail' ? 'bg-[#DC2626] text-white shadow-xs' : 'bg-[#F5F5F7] text-[#1D1D1F] hover:bg-slate-200'
                            }`}
                          >
                            Fail
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDiagnosticStatusChange(item.id, 'N/A')}
                            className={`flex-1 py-1 rounded-lg font-black transition-all ${
                              item.status === 'N/A' ? 'bg-[#475569] text-white shadow-xs' : 'bg-[#F5F5F7] text-[#1D1D1F] hover:bg-slate-200'
                            }`}
                          >
                            N/A
                          </button>
                        </div>

                        {/* Diagnostic Comment Box */}
                        <div className="relative pt-1">
                          <input
                            type="text"
                            value={item.note || ''}
                            onChange={(e) => handleDiagnosticNoteChange(item.id, e.target.value)}
                            placeholder={`Comment for ${item.name}...`}
                            className="w-full bg-[#F5F5F7] border border-[#E5E5EA] rounded-lg px-2.5 py-1 text-[11px] text-[#1D1D1F] focus:bg-white focus:border-[#0071E3] focus:outline-none"
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
