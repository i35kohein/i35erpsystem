import React from 'react';
import { Input } from '../../ui';
import type { SystemSettings } from '../../../types';

interface QaTabProps {
  formData: SystemSettings;
  setFormData: React.Dispatch<React.SetStateAction<SystemSettings>>;
}

const QaTab: React.FC<QaTabProps> = ({ formData, setFormData }) => {
  return (
        <div className="bg-white p-5 rounded-2xl border border-line-strong shadow-2xs space-y-6">
          <div>
            <h3 className="text-sm font-extrabold text-ink">QA & Diagnostic Workflow Governance</h3>
            <p className="text-xs text-muted">
              Enforce mandatory quality assurance inspection gates before marking tickets as completed.
            </p>
          </div>

          <div className="space-y-3 text-xs">
            <label className="flex items-center space-x-3 cursor-pointer p-3 bg-surface rounded-xl border border-line hover:border-brand transition-all">
              <Input
                type="checkbox"
                checked={formData.mandatoryQaChecklist}
                onChange={(e) => setFormData({ ...formData, mandatoryQaChecklist: e.target.checked })}
                className="w-4 h-4 text-brand rounded focus:ring-0 cursor-pointer"
              />
              <div>
                <span className="font-extrabold text-ink text-xs block">Mandatory QA Checklist Verification</span>
                <span className="text-xs text-muted">Require a passing QA inspection before ticket status can be transitioned to "Ready for Pickup".</span>
              </div>
            </label>

            <label className="flex items-center space-x-3 cursor-pointer p-3 bg-surface rounded-xl border border-line hover:border-brand transition-all">
              <Input
                type="checkbox"
                checked={formData.requireMicroSolderingLog}
                onChange={(e) => setFormData({ ...formData, requireMicroSolderingLog: e.target.checked })}
                className="w-4 h-4 text-brand rounded focus:ring-0 cursor-pointer"
              />
              <div>
                <span className="font-extrabold text-ink text-xs block">Require Diode/Thermal Log for Level 3 Board Repairs</span>
                <span className="text-xs text-muted">Require multimeter diode readings and IC replacement logs for L3 micro-soldering work orders.</span>
              </div>
            </label>

            <label className="flex items-center space-x-3 cursor-pointer p-3 bg-surface rounded-xl border border-line hover:border-brand transition-all">
              <Input
                type="checkbox"
                checked={formData.requireQaPhotoBeforeConfirm}
                onChange={(e) => setFormData({ ...formData, requireQaPhotoBeforeConfirm: e.target.checked })}
                className="w-4 h-4 text-brand rounded focus:ring-0 cursor-pointer"
              />
              <div>
                <span className="font-extrabold text-ink text-xs block">Require Before/After Photo to Confirm QA</span>
                <span className="text-xs text-muted">Block "Confirm QA Pass" until at least one before or after repair photo is attached.</span>
              </div>
            </label>
          </div>
        </div>
  );
};

export default QaTab;
