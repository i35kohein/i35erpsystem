import React, { useState } from 'react';
import { 
  Cpu, 
  Activity, 
  Flame, 
  Search, 
  Plus, 
  CheckCircle2, 
  AlertTriangle, 
  FileText, 
  Microscope,
  Layers
} from 'lucide-react';
import { WorkOrder, MicroSolderingLog } from '../../types';

interface MicroSolderingModuleProps {
  workOrders: WorkOrder[];
  onSaveMicroSolderingLog: (workOrderId: string, log: MicroSolderingLog) => void;
}

export const MicroSolderingModule: React.FC<MicroSolderingModuleProps> = ({
  workOrders,
  onSaveMicroSolderingLog,
}) => {
  // Filter for micro-soldering or mail-in jobs
  const microJobs = workOrders.filter(
    (w) => w.serviceType === 'Micro-Soldering' || w.serviceType === 'B2B Mail-In' || w.microSolderingLog
  );

  const [selectedWoId, setSelectedWoId] = useState<string>(microJobs[0]?.id || workOrders[0]?.id || '');
  const selectedWo = workOrders.find((w) => w.id === selectedWoId);

  // Form State for Diode & Board Diagnostic Worksheet
  const [boardModel, setBoardModel] = useState<string>(selectedWo?.microSolderingLog?.boardModel || 'iPhone 13 Pro Logic Board (820-02210)');
  const [lineName, setLineName] = useState<string>('PP_VCC_MAIN');
  const [expectedVal, setExpectedVal] = useState<string>('0.380V');
  const [actualVal, setActualVal] = useState<string>('0.002V');
  const [diodeReadings, setDiodeReadings] = useState(
    selectedWo?.microSolderingLog?.diodeReadings || [
      { lineName: 'PP_VCC_MAIN', expectedValue: '0.380V', actualValue: '0.002V', status: 'FAIL' as const },
      { lineName: 'PP_VDD_BOOST', expectedValue: '0.410V', actualValue: '0.408V', status: 'PASS' as const },
    ]
  );
  const [thermalNotes, setThermalNotes] = useState<string>(
    selectedWo?.microSolderingLog?.thermalNotes || 'Thermal camera shows localized hotspot (112°C) at capacitor C3010 near Hydra USB IC.'
  );
  const [icReplaced, setIcReplaced] = useState<string>(
    selectedWo?.microSolderingLog?.icReplaced?.join(', ') || 'Decoupling Capacitor C3010, Hydra USB Controller U2'
  );

  const handleAddDiodeReading = () => {
    const isFail = actualVal.toLowerCase().includes('0.00') || actualVal.toLowerCase().includes('short');
    setDiodeReadings([
      ...diodeReadings,
      {
        lineName,
        expectedValue: expectedVal,
        actualValue: actualVal,
        status: isFail ? 'FAIL' : 'PASS',
      },
    ]);
  };

  const handleSaveWorksheet = () => {
    if (!selectedWo) return;

    const log: MicroSolderingLog = {
      boardModel,
      diodeReadings,
      thermalNotes,
      icReplaced: icReplaced.split(',').map((s) => s.trim()),
      schematicTags: ['PP_VCC_MAIN', 'C3010', 'U2_HYDRA'],
      multimeterDiodeShortFound: diodeReadings.some((r) => r.status === 'FAIL'),
    };

    onSaveMicroSolderingLog(selectedWo.id, log);
    alert('Micro-Soldering Diagnostic Worksheet saved successfully to Work Order!');
  };

  return (
    <div className="space-y-6 text-xs">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-[#E5E5EA] shadow-xs">
        <div>
          <h1 className="text-lg font-bold text-[#1D1D1F] flex items-center space-x-2">
            <Cpu className="w-5 h-5 text-[#AF52DE]" />
            <span>Micro-Soldering & Logic Board Diagnostic Module</span>
          </h1>
          <p className="text-xs text-[#86868B]">Record multimeter diode mode measurements, thermal camera hotspots, IC reballing logs, and ZXW schematic tags</p>
        </div>

        <div className="bg-purple-50 text-purple-700 font-mono font-bold px-3 py-1 rounded-full border border-purple-200/80">
          Level 3 Master Tech Workstation
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Left Column: Board Repair Work Orders (5 cols) */}
        <div className="md:col-span-5 bg-white border border-[#E5E5EA] rounded-2xl p-4 space-y-3 shadow-xs">
          <h2 className="font-bold text-[#1D1D1F] text-xs border-b border-[#E5E5EA] pb-2">Level 3 Board Repair Queue</h2>

          <div className="space-y-2">
            {workOrders.map((wo) => {
              const isSelected = wo.id === selectedWoId;

              return (
                <div
                  key={wo.id}
                  onClick={() => {
                    setSelectedWoId(wo.id);
                    if (wo.microSolderingLog) {
                      setBoardModel(wo.microSolderingLog.boardModel);
                      setDiodeReadings(wo.microSolderingLog.diodeReadings);
                      setThermalNotes(wo.microSolderingLog.thermalNotes);
                      setIcReplaced(wo.microSolderingLog.icReplaced.join(', '));
                    }
                  }}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#F0F6FF] border-[#0071E3] shadow-xs'
                      : 'bg-[#F5F5F7] border-[#E5E5EA] hover:bg-slate-100'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span className="font-mono font-bold text-[#AF52DE]">{wo.orderNumber}</span>
                    <span className="bg-white text-[#1D1D1F] text-[10px] px-2 py-0.5 rounded-md border border-[#E5E5EA] font-semibold">
                      {wo.serviceType}
                    </span>
                  </div>

                  <p className="font-bold text-[#1D1D1F] mt-1">{wo.deviceModel}</p>
                  <p className="text-[11px] text-[#86868B]">Cust: {wo.customerName}</p>

                  {wo.microSolderingLog?.multimeterDiodeShortFound && (
                    <span className="inline-block mt-2 text-[10px] bg-[#FF3B30]/10 text-[#FF3B30] font-bold px-2 py-0.5 rounded border border-[#FF3B30]/20">
                      ⚠ Board Short Circuit Logged
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Board Diagnostic Worksheet (7 cols) */}
        <div className="md:col-span-7 bg-white border border-[#E5E5EA] rounded-2xl p-5 space-y-5 shadow-xs">
          {selectedWo ? (
            <div className="space-y-5">
              <div className="border-b border-[#E5E5EA] pb-3 flex justify-between items-center">
                <div>
                  <span className="font-mono text-[#AF52DE] font-bold">{selectedWo.orderNumber}</span>
                  <h2 className="text-base font-bold text-[#1D1D1F]">{selectedWo.deviceModel} Diagnostic Worksheet</h2>
                </div>

                <button
                  onClick={handleSaveWorksheet}
                  className="px-4 py-2 bg-[#AF52DE] hover:bg-purple-600 text-white font-bold rounded-xl shadow-xs transition-all active:scale-95"
                >
                  Save Board Worksheet
                </button>
              </div>

              {/* Board Identification */}
              <div className="bg-[#F5F5F7]/80 p-3 rounded-xl border border-[#E5E5EA] space-y-2">
                <label className="block text-[#86868B] font-bold">Logic Board Model / Number:</label>
                <input
                  type="text"
                  value={boardModel}
                  onChange={(e) => setBoardModel(e.target.value)}
                  placeholder="e.g. 820-02020 or iPhone 13 Pro Logic Board"
                  className="w-full bg-white border border-[#E5E5EA] rounded-lg p-2 text-[#1D1D1F] font-mono focus:border-[#0071E3] focus:ring-2 focus:ring-[#0071E3]/20"
                />
              </div>

              {/* Multimeter Diode Mode Readings Table */}
              <div className="bg-[#F5F5F7]/80 p-4 rounded-xl border border-[#E5E5EA] space-y-3">
                <div className="flex justify-between items-center">
                  <h3 className="font-bold text-[#AF52DE] flex items-center space-x-1.5">
                    <Activity className="w-4 h-4 text-[#AF52DE]" />
                    <span>Multimeter Diode Mode Voltage Drop Readings</span>
                  </h3>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="text"
                    value={lineName}
                    onChange={(e) => setLineName(e.target.value)}
                    placeholder="Power Line (e.g. PP_VCC_MAIN)"
                    className="bg-white border border-[#E5E5EA] rounded p-1.5 text-[#1D1D1F] font-mono focus:border-[#0071E3]"
                  />
                  <input
                    type="text"
                    value={expectedVal}
                    onChange={(e) => setExpectedVal(e.target.value)}
                    placeholder="Expected (e.g. 0.380V)"
                    className="bg-white border border-[#E5E5EA] rounded p-1.5 text-[#1D1D1F] font-mono focus:border-[#0071E3]"
                  />
                  <div className="flex space-x-1">
                    <input
                      type="text"
                      value={actualVal}
                      onChange={(e) => setActualVal(e.target.value)}
                      placeholder="Actual (e.g. 0.002V)"
                      className="bg-white border border-[#E5E5EA] rounded p-1.5 text-[#1D1D1F] font-mono flex-1 focus:border-[#0071E3]"
                    />
                    <button
                      onClick={handleAddDiodeReading}
                      className="px-2.5 py-1 bg-[#AF52DE] text-white font-bold rounded-lg hover:bg-purple-600 transition-colors"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div className="border border-[#E5E5EA] rounded-lg overflow-hidden bg-white">
                  <table className="w-full text-left">
                    <thead className="bg-[#F5F5F7] text-[#86868B] text-[10px] uppercase font-mono border-b border-[#E5E5EA]">
                      <tr>
                        <th className="p-2">Power Line</th>
                        <th className="p-2">Expected Diode</th>
                        <th className="p-2">Actual Diode</th>
                        <th className="p-2">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E5E5EA] font-mono">
                      {diodeReadings.map((r, idx) => (
                        <tr key={idx}>
                          <td className="p-2 text-[#1D1D1F]">{r.lineName}</td>
                          <td className="p-2 text-[#86868B]">{r.expectedValue}</td>
                          <td className="p-2 text-[#1D1D1F]">{r.actualValue}</td>
                          <td className="p-2">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                              r.status === 'PASS' ? 'bg-[#EAF8ED] text-[#28A745] border-[#34C759]/20' : 'bg-[#FFF0F0] text-[#FF3B30] border-[#FF3B30]/30 animate-pulse'
                            }`}>
                              {r.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Thermal Camera & IC Replacement Log */}
              <div className="bg-[#F5F5F7]/80 p-4 rounded-xl border border-[#E5E5EA] space-y-3">
                <div>
                  <label className="block text-[#86868B] font-bold mb-1 flex items-center space-x-1.5">
                    <Flame className="w-4 h-4 text-[#FF9F0A]" />
                    <span>Thermal Camera Hotspot Finding Notes</span>
                  </label>
                  <textarea
                    rows={2}
                    value={thermalNotes}
                    onChange={(e) => setThermalNotes(e.target.value)}
                    className="w-full bg-white border border-[#E5E5EA] rounded-lg p-2 text-[#1D1D1F] focus:border-[#0071E3] focus:ring-2 focus:ring-[#0071E3]/20"
                  />
                </div>

                <div>
                  <label className="block text-[#86868B] font-bold mb-1">
                    Chips / Micro-Components Replaced (Comma-separated)
                  </label>
                  <input
                    type="text"
                    value={icReplaced}
                    onChange={(e) => setIcReplaced(e.target.value)}
                    placeholder="e.g. Audio IC U3101, Decoupling Cap C3010, Hydra U2"
                    className="w-full bg-white border border-[#E5E5EA] rounded-lg p-2 text-[#1D1D1F] font-mono focus:border-[#0071E3] focus:ring-2 focus:ring-[#0071E3]/20"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="p-12 text-center text-[#86868B]">
              Select a work order to log micro-soldering diagnostics.
            </div>
          )}
        </div>
      </div>
    </div>
  );

};
