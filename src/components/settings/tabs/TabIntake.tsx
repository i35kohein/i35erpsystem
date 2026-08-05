import React from 'react';
import type { SystemSettings } from '../../../types';
import { Check, Hash, ShieldCheck } from 'lucide-react';

interface IntakeTabProps {
  formData: SystemSettings;
  setFormData: React.Dispatch<React.SetStateAction<SystemSettings>>;
}

const IntakeTab: React.FC<IntakeTabProps> = ({ formData, setFormData }) => {
  return (
        <div className="bg-white p-5 rounded-2xl border border-[#D2D2D7] shadow-2xs space-y-6">
          <div>
            <h3 className="text-sm font-extrabold text-[#1D1D1F]">Work Order & Ticket Intake Rules</h3>
            <p className="text-xs text-[#86868B]">
              Customize ticket number formatting, default warranty terms, and mandatory customer intake flags.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
            {/* Voucher Prefix */}
            <div className="space-y-1.5">
              <label className="font-extrabold text-[#1D1D1F] flex items-center space-x-1.5">
                <Hash className="w-3.5 h-3.5 text-[#0071E3]" />
                <span>Ticket / Voucher Prefix Format</span>
              </label>
              <input
                type="text"
                value={formData.ticketPrefix}
                onChange={(e) => setFormData({ ...formData, ticketPrefix: e.target.value })}
                placeholder="WO-"
                className="w-full bg-[#F5F5F7] text-[#1D1D1F] font-bold px-3 py-2 rounded-xl border border-[#D2D2D7] focus:bg-white focus:outline-none focus:border-[#0071E3]"
              />
              <p className="text-[11px] text-[#86868B]">e.g. WO- generates vouchers like WO-2026-1001.</p>
            </div>

            {/* Default Warranty */}
            <div className="space-y-1.5">
              <label className="font-extrabold text-[#1D1D1F] flex items-center space-x-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-[#34C759]" />
                <span>Default Service Warranty Coverage (Days)</span>
              </label>
              <select
                value={formData.defaultWarrantyDays}
                onChange={(e) => setFormData({ ...formData, defaultWarrantyDays: Number(e.target.value) })}
                className="w-full bg-[#F5F5F7] text-[#1D1D1F] font-bold px-3 py-2 rounded-xl border border-[#D2D2D7] focus:bg-white focus:outline-none focus:border-[#0071E3]"
              >
                <option value={30}>30 Days (Standard Modular)</option>
                <option value={60}>60 Days (Extended)</option>
                <option value={90}>90 Days (Recommended Apple Lab Standard)</option>
                <option value={180}>180 Days (Half-Year Warranty)</option>
                <option value={365}>365 Days (1 Full Year)</option>
              </select>
            </div>

            {/* Checkbox Toggles */}
            <div className="md:col-span-2 space-y-3 pt-3 border-t border-[#E5E5EA]">
              <label className="flex items-center space-x-3 cursor-pointer p-3 bg-[#F8F9FA] rounded-xl border border-[#E5E5EA] hover:border-[#0071E3] transition-all">
                <input
                  type="checkbox"
                  checked={formData.requirePasscodeIntake}
                  onChange={(e) => setFormData({ ...formData, requirePasscodeIntake: e.target.checked })}
                  className="w-4 h-4 text-[#0071E3] rounded focus:ring-0 cursor-pointer"
                />
                <div>
                  <span className="font-extrabold text-[#1D1D1F] text-xs block">Require Device Passcode / PIN at Intake</span>
                  <span className="text-[11px] text-[#86868B]">Prompt technicians to record screen passcodes for post-repair diagnostic testing.</span>
                </div>
              </label>

              <label className="flex items-center space-x-3 cursor-pointer p-3 bg-[#F8F9FA] rounded-xl border border-[#E5E5EA] hover:border-[#0071E3] transition-all">
                <input
                  type="checkbox"
                  checked={formData.requireFindMyCheck}
                  onChange={(e) => setFormData({ ...formData, requireFindMyCheck: e.target.checked })}
                  className="w-4 h-4 text-[#0071E3] rounded focus:ring-0 cursor-pointer"
                />
                <div>
                  <span className="font-extrabold text-[#1D1D1F] text-xs block">Mandatory Find My / iCloud Lock Check</span>
                  <span className="text-[11px] text-[#86868B]">Verify that Find My iPhone / Mac activation lock status is checked during work order creation.</span>
                </div>
              </label>
            </div>
          </div>
        </div>
  );
};

export default IntakeTab;
