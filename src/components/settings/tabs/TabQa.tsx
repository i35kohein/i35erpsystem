import React from 'react';
import type { SystemSettings } from '../../../types';

interface QaTabProps {
  formData: SystemSettings;
  setFormData: React.Dispatch<React.SetStateAction<SystemSettings>>;
}

const QaTab: React.FC<QaTabProps> = ({ formData, setFormData }) => {
  return (
        <div className="bg-white p-5 rounded-2xl border border-[#D2D2D7] shadow-2xs space-y-6">
          <div>
            <h3 className="text-sm font-extrabold text-[#1D1D1F]">QA & Diagnostic Workflow Governance</h3>
            <p className="text-xs text-[#86868B]">
              Enforce mandatory quality assurance inspection gates before marking tickets as completed.
            </p>
          </div>

          <div className="space-y-3 text-xs">
            <label className="flex items-center space-x-3 cursor-pointer p-3 bg-[#F8F9FA] rounded-xl border border-[#E5E5EA] hover:border-[#0071E3] transition-all">
              <input
                type="checkbox"
                checked={formData.mandatoryQaChecklist}
                onChange={(e) => setFormData({ ...formData, mandatoryQaChecklist: e.target.checked })}
                className="w-4 h-4 text-[#0071E3] rounded focus:ring-0 cursor-pointer"
              />
              <div>
                <span className="font-extrabold text-[#1D1D1F] text-xs block">Mandatory QA Checklist Verification</span>
                <span className="text-[11px] text-[#86868B]">Require a passing QA inspection before ticket status can be transitioned to "Ready for Pickup".</span>
              </div>
            </label>

            <label className="flex items-center space-x-3 cursor-pointer p-3 bg-[#F8F9FA] rounded-xl border border-[#E5E5EA] hover:border-[#0071E3] transition-all">
              <input
                type="checkbox"
                checked={formData.requireMicroSolderingLog}
                onChange={(e) => setFormData({ ...formData, requireMicroSolderingLog: e.target.checked })}
                className="w-4 h-4 text-[#0071E3] rounded focus:ring-0 cursor-pointer"
              />
              <div>
                <span className="font-extrabold text-[#1D1D1F] text-xs block">Require Diode/Thermal Log for Level 3 Board Repairs</span>
                <span className="text-[11px] text-[#86868B]">Require multimeter diode readings and IC replacement logs for L3 micro-soldering work orders.</span>
              </div>
            </label>
          </div>
        </div>
  );
};

export default QaTab;
