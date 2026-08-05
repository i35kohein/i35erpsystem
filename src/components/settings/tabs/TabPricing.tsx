import React from 'react';
import type { SystemSettings } from '../../../types';
import { CreditCard, DollarSign, Tag } from 'lucide-react';
import { Button } from '../../ui';

interface PricingTabProps {
  formData: SystemSettings;
  setFormData: React.Dispatch<React.SetStateAction<SystemSettings>>;
  setActiveSubTab: (t: any) => void;
}

const PricingTab: React.FC<PricingTabProps> = ({ formData, setFormData, setActiveSubTab }) => {
  return (
        <div className="bg-white p-5 rounded-2xl border border-[#D2D2D7] shadow-2xs space-y-6">
          <div>
            <h3 className="text-sm font-extrabold text-[#1D1D1F]">Global Currency & Pricing Matrix Settings</h3>
            <p className="text-xs text-[#86868B]">
              Configure shop-wide currency symbols, tax rules, and default labor discounts.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 text-xs">
            {/* Currency Symbol */}
            <div className="space-y-1.5">
              <label className="font-extrabold text-[#1D1D1F] flex items-center space-x-1.5">
                <Tag className="w-3.5 h-3.5 text-[#0071E3]" />
                <span>Default Currency Symbol / Unit</span>
              </label>
              <select
                value={formData.currencySymbol}
                onChange={(e) => setFormData({ ...formData, currencySymbol: e.target.value })}
                className="w-full bg-[#F5F5F7] text-[#1D1D1F] font-bold px-3 py-2 rounded-xl border border-[#D2D2D7] focus:bg-white focus:outline-none focus:border-[#0071E3]"
              >
                <option value="MMK">MMK (Myanmar Kyat)</option>
                <option value="USD">USD ($ United States Dollar)</option>
                <option value="THB">THB (฿ Thai Baht)</option>
                <option value="SGD">SGD (S$ Singapore Dollar)</option>
                <option value="EUR">EUR (€ Euro)</option>
              </select>
            </div>

            {/* Tax Percentage */}
            <div className="space-y-1.5">
              <label className="font-extrabold text-[#1D1D1F] flex items-center space-x-1.5">
                <DollarSign className="w-3.5 h-3.5 text-[#34C759]" />
                <span>Sales Tax / Commercial VAT (%)</span>
              </label>
              <input
                type="number"
                value={formData.taxPercentage}
                onChange={(e) => setFormData({ ...formData, taxPercentage: Number(e.target.value) })}
                min="0"
                max="30"
                step="0.5"
                className="w-full bg-[#F5F5F7] text-[#1D1D1F] font-bold px-3 py-2 rounded-xl border border-[#D2D2D7] focus:bg-white focus:outline-none focus:border-[#0071E3]"
              />
            </div>

            {/* Default Discount */}
            <div className="space-y-1.5">
              <label className="font-extrabold text-[#1D1D1F] flex items-center space-x-1.5">
                <Tag className="w-3.5 h-3.5 text-[#AF52DE]" />
                <span>Default Labor Discount (%)</span>
              </label>
              <input
                type="number"
                value={formData.defaultLaborDiscountPercent}
                onChange={(e) => setFormData({ ...formData, defaultLaborDiscountPercent: Number(e.target.value) })}
                min="0"
                max="50"
                className="w-full bg-[#F5F5F7] text-[#1D1D1F] font-bold px-3 py-2 rounded-xl border border-[#D2D2D7] focus:bg-white focus:outline-none focus:border-[#0071E3]"
              />
            </div>
          </div>

          {/* Quick Jump Banner for Payment Methods */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <span className="p-2 bg-blue-100 text-[#0071E3] rounded-xl">
                <CreditCard className="w-5 h-5" />
              </span>
              <div>
                <h4 className="font-extrabold text-xs text-[#1D1D1F]">Manage Active Payment Gateways & Myanmar Banks</h4>
                <p className="text-[11px] text-[#86868B]">Enable or disable Cash, KBZ Pay, UAB Pay, AYA Pay, MMQR, CB Bank, Yoma Bank, Wave Money, etc.</p>
              </div>
            </div>
            <Button
              type="button"
              onClick={() => setActiveSubTab('payment')}
              className="bg-[#0071E3] hover:bg-[#0051B3] text-white"
            >
              Configure Payment Gateways →
            </Button>
          </div>
        </div>
  );
};

export default PricingTab;
