import React from 'react';
import { Input } from '../../ui';
import type { SystemSettings } from '../../../types';
import { Hash, ShieldCheck } from 'lucide-react';

interface IntakeTabProps {
  formData: SystemSettings;
  setFormData: React.Dispatch<React.SetStateAction<SystemSettings>>;
}

const IntakeTab: React.FC<IntakeTabProps> = ({ formData, setFormData }) => {
  return (
        <div className="bg-white p-5 rounded-2xl border border-line-strong shadow-2xs space-y-6">
          <div>
            <h3 className="text-sm font-extrabold text-ink">Work Order & Ticket Intake Rules</h3>
            <p className="text-xs text-muted">
              Customize ticket number formatting, default warranty terms, and mandatory customer intake flags.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
            {/* Voucher Prefix */}
            <div className="space-y-1.5">
              <label className="font-extrabold text-ink flex items-center space-x-1.5">
                <Hash className="w-3.5 h-3.5 text-brand" />
                <span>Ticket / Voucher Prefix Format</span>
              </label>
              <Input
                type="text"
                value={formData.ticketPrefix}
                onChange={(e) => setFormData({ ...formData, ticketPrefix: e.target.value })}
                placeholder="WO-"
                className="w-full bg-surface text-ink font-bold px-3 py-2 rounded-xl border border-line-strong focus:bg-white focus:outline-none "
              />
              <p className="text-xs text-muted">e.g. WO- generates vouchers like WO-2026-1001.</p>
            </div>

            {/* Default Warranty */}
            <div className="space-y-1.5">
              <label className="font-extrabold text-ink flex items-center space-x-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-success" />
                <span>Default Service Warranty Coverage (Days)</span>
              </label>
              <select aria-label="Default Service Warranty Coverage (Days)"
                value={formData.defaultWarrantyDays}
                onChange={(e) => setFormData({ ...formData, defaultWarrantyDays: Number(e.target.value) })}
                className="w-full bg-surface text-ink font-bold px-3 py-2 rounded-xl border border-line-strong focus:bg-white focus:outline-none "
              >
                <option value={0}>No Warranty</option>
                <option value={30}>30 Days (Spareparts)</option>
                <option value={60}>60 Days (Extended)</option>
                <option value={90}>90 Days (Recommended Apple Lab Standard)</option>
                <option value={180}>180 Days (Half-Year Warranty)</option>
                <option value={365}>365 Days (1 Full Year)</option>
              </select>
            </div>

          </div>
        </div>
  );
};

export default IntakeTab;
