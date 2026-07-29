import React, { useState } from 'react';
import { 
  Sparkles, 
  X, 
  Cpu, 
  Activity, 
  CircleDot, 
  ShieldAlert, 
  CheckCircle2, 
  AlertTriangle,
  Send
} from 'lucide-react';

interface AiDiagnosticAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AiDiagnosticAssistantModal: React.FC<AiDiagnosticAssistantModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [deviceModel, setDeviceModel] = useState('iPhone 13 Pro');
  const [symptoms, setSymptoms] = useState('No power after liquid contact. Consumes 0.000A on DC Power Supply. iTunes Error 4013.');
  const [panicLog, setPanicLog] = useState('panic(cpu 0 caller 0xfffffff011a0c410): "i2c0 bus failure / prst0 thermal sensor timed out"');
  const [isLoading, setIsLoading] = useState(false);
  const [diagnosisResult, setDiagnosisResult] = useState<any>(null);

  if (!isOpen) return null;

  const handleAnalyze = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/gemini/diagnose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deviceModel,
          symptoms,
          panicLog,
        }),
      });
      const data = await res.json();
      if (data.success && data.diagnosis) {
        setDiagnosisResult(data.diagnosis);
      } else {
        alert(data.error || 'Diagnostic assistant failed.');
      }
    } catch (err) {
      console.error(err);
      alert('Error communicating with Gemini AI diagnostic endpoint.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white border border-[#E5E5EA] rounded-2xl max-w-2xl w-full p-6 space-y-4 text-xs shadow-2xl relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-[#86868B] hover:text-[#1D1D1F] p-1 rounded-full hover:bg-[#F5F5F7] transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center space-x-3 border-b border-[#E5E5EA] pb-3">
          <div className="p-2.5 bg-[#AF52DE] rounded-xl text-white shadow-xs">
            <Sparkles className="w-5 h-5 text-amber-200" />
          </div>
          <div>
            <h2 className="text-base font-bold text-[#1D1D1F]">Apple Certified AI Panic Log & Diagnostic Assistant</h2>
            <p className="text-[#86868B] text-[11px]">Powered by Gemini 3.6 Flash for micro-soldering, diode readings, and error code troubleshooting</p>
          </div>
        </div>

        {/* Form Inputs */}
        <div className="space-y-3 bg-[#F5F5F7]/80 p-4 rounded-xl border border-[#E5E5EA]">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[#86868B] font-bold mb-1">Device Model:</label>
              <input
                type="text"
                value={deviceModel}
                onChange={(e) => setDeviceModel(e.target.value)}
                className="w-full bg-white border border-[#E5E5EA] rounded-lg p-2 text-[#1D1D1F] focus:border-[#0071E3] focus:ring-2 focus:ring-[#0071E3]/20"
              />
            </div>

            <div>
              <label className="block text-[#86868B] font-bold mb-1">Symptoms / Error Code:</label>
              <input
                type="text"
                value={symptoms}
                onChange={(e) => setSymptoms(e.target.value)}
                className="w-full bg-white border border-[#E5E5EA] rounded-lg p-2 text-[#1D1D1F] focus:border-[#0071E3] focus:ring-2 focus:ring-[#0071E3]/20"
              />
            </div>
          </div>

          <div>
            <label className="block text-[#86868B] font-bold mb-1">Panic Log / Thermal Camera / Multimeter Notes:</label>
            <textarea
              rows={2}
              value={panicLog}
              onChange={(e) => setPanicLog(e.target.value)}
              className="w-full bg-white border border-[#E5E5EA] rounded-lg p-2 text-[#1D1D1F] font-mono focus:border-[#0071E3] focus:ring-2 focus:ring-[#0071E3]/20"
            />
          </div>

          <button
            onClick={handleAnalyze}
            disabled={isLoading}
            className="w-full py-2.5 bg-[#AF52DE] hover:bg-purple-600 text-white font-bold rounded-xl flex items-center justify-center space-x-2 shadow-xs transition-all active:scale-95"
          >
            <Sparkles className="w-4 h-4 text-amber-200" />
            <span>{isLoading ? 'Gemini AI Analyzing Diode Rails & Panic Logs...' : 'Generate AI Diagnostic Breakdown'}</span>
          </button>
        </div>

        {/* AI Output Result Card */}
        {diagnosisResult && (
          <div className="space-y-3 bg-[#F5F5F7]/80 p-4 rounded-xl border border-[#AF52DE]/30 text-[#1D1D1F]">
            <div className="flex items-center justify-between border-b border-[#E5E5EA] pb-2">
              <span className="font-bold text-[#AF52DE] uppercase tracking-wider text-[11px]">
                AI Hardware Analysis Output
              </span>
              <span className="bg-purple-50 text-purple-700 border border-purple-200 font-bold px-2 py-0.5 rounded text-[10px]">
                {diagnosisResult.estimatedDifficulty || 'Level 3 Micro-Soldering'}
              </span>
            </div>

            {/* Suspected Issues */}
            <div className="space-y-1">
              <strong className="text-[#D97706]">Suspected Hardware Failures:</strong>
              <ul className="list-disc list-inside space-y-0.5 text-[#1D1D1F]">
                {diagnosisResult.suspectedIssues?.map((iss: string, idx: number) => (
                  <li key={idx}>{iss}</li>
                ))}
              </ul>
            </div>

            {/* Diode Test Points */}
            <div className="space-y-1">
              <strong className="text-[#0071E3]">Multimeter Diode Mode Test Points:</strong>
              <div className="bg-white p-2.5 rounded-lg border border-[#E5E5EA] font-mono text-[11px] space-y-1 text-[#1D1D1F]">
                {diagnosisResult.diodeTestPoints?.map((tp: string, idx: number) => (
                  <p key={idx}>• {tp}</p>
                ))}
              </div>
            </div>

            {/* Recommended Action */}
            <div className="space-y-1">
              <strong className="text-[#28A745]">Recommended Repair Action:</strong>
              <p className="text-[#1D1D1F]">{diagnosisResult.recommendedAction}</p>
            </div>

            {/* Customer Explanation */}
            <div className="p-3 bg-white rounded-lg border border-[#E5E5EA] text-[#1D1D1F]">
              <span className="text-[#86868B] font-bold block mb-0.5">Suggested Customer Summary:</span>
              <p className="italic">"{diagnosisResult.clientExplanation}"</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
