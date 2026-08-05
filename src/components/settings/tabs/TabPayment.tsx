import React from 'react';
import type { SystemSettings } from '../../../types';
import { CheckSquare, CreditCard, DollarSign, Landmark, Phone, Plus, QrCode, RotateCcw, ToggleLeft, ToggleRight, Wallet } from 'lucide-react';
import { Button } from '../../ui';

interface PaymentTabProps {
  formData: SystemSettings;
  setFormData: React.Dispatch<React.SetStateAction<SystemSettings>>;
  currentPaymentMethods: any[];
  handleTogglePaymentMethod: (id: string) => void;
  handleUpdatePaymentMethodField: (id: string, field: string, value: any) => void;
  handleAddCustomPaymentMethod: () => void;
  handleResetPaymentMethods: () => void;
  handleSetAllPaymentMethodsState: (enabled: boolean) => void;
}

const PaymentTab: React.FC<PaymentTabProps> = ({ formData, setFormData, currentPaymentMethods, handleTogglePaymentMethod, handleUpdatePaymentMethodField, handleAddCustomPaymentMethod, handleResetPaymentMethods, handleSetAllPaymentMethodsState }) => {
  return (
        <div className="bg-white p-6 rounded-2xl border border-[#D2D2D7] shadow-2xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E5E5EA] pb-4">
            <div>
              <h3 className="text-base font-extrabold text-[#1D1D1F] flex items-center space-x-2">
                <CreditCard className="w-5 h-5 text-[#0071E3]" />
                <span>Global Payment Gateways & Myanmar Banking Settings</span>
              </h3>
              <p className="text-xs text-[#86868B] mt-1">
                Configure enabled payment methods across your store (Cash, KBZ Pay, UAB Pay, AYA Pay, MMQR, CB Bank, Yoma Bank, Wave Money, etc.). Disabled payment options will be hidden automatically during POS checkout, Work Order intake, and invoicing.
              </p>
            </div>

            <div className="flex items-center space-x-2 shrink-0">
              <button
                type="button"
                onClick={() => handleSetAllPaymentMethodsState(true)}
                className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs rounded-xl border border-emerald-200 transition-all flex items-center space-x-1 cursor-pointer"
              >
                <CheckSquare className="w-3.5 h-3.5" />
                <span>Enable All</span>
              </button>
              <button
                type="button"
                onClick={handleAddCustomPaymentMethod}
                className="px-3 py-1.5 bg-[#0071E3] hover:bg-[#0051B3] text-white font-bold text-xs rounded-xl shadow-2xs transition-all flex items-center space-x-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Custom Gateway</span>
              </button>
              <button
                type="button"
                onClick={handleResetPaymentMethods}
                className="px-3 py-1.5 bg-[#F5F5F7] hover:bg-[#E5E5EA] text-[#1D1D1F] font-bold text-xs rounded-xl border border-[#D2D2D7] transition-all flex items-center space-x-1 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5 text-[#86868B]" />
                <span>Reset Defaults</span>
              </button>
            </div>
          </div>

          {/* Quick Summary Badge Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              {
                title: 'Total Configured',
                count: currentPaymentMethods.length,
                color: 'bg-blue-50 text-[#0071E3] border-blue-200',
              },
              {
                title: 'Active Gateways',
                count: currentPaymentMethods.filter((m) => m.enabled).length,
                color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
              },
              {
                title: 'Myanmar Mobile & MMQR',
                count: currentPaymentMethods.filter((m) => m.category === 'Myanmar Mobile Pay').length,
                color: 'bg-purple-50 text-purple-700 border-purple-200',
              },
              {
                title: 'Myanmar Bank Accounts',
                count: currentPaymentMethods.filter((m) => m.category === 'Myanmar Banks').length,
                color: 'bg-amber-50 text-amber-700 border-amber-200',
              },
            ].map((stat, idx) => (
              <div key={idx} className={`p-3 rounded-xl border ${stat.color} flex items-center justify-between`}>
                <span className="text-xs font-bold">{stat.title}</span>
                <span className="text-sm font-extrabold font-mono">{stat.count}</span>
              </div>
            ))}
          </div>

          {/* Payment Methods Table / Grid */}
          <div className="space-y-6">
            {(['Cash', 'Myanmar Mobile Pay', 'Myanmar Banks', 'Card & Digital'] as const).map((cat) => {
              const categoryItems = currentPaymentMethods.filter((m) => m.category === cat);
              if (categoryItems.length === 0) return null;

              const categoryTitles: Record<string, { title: string; icon: any; desc: string }> = {
                'Cash': { title: 'Cash Counter Payments', icon: DollarSign, desc: 'Physical currency and cash drawer payments' },
                'Myanmar Mobile Pay': { title: 'Myanmar Mobile Wallets & MMQR', icon: QrCode, desc: 'KBZ Pay, UAB Pay, AYA Pay, Wave Money & Universal MMQR QR' },
                'Myanmar Banks': { title: 'Myanmar Bank Transfers (iBanking / mBanking)', icon: Landmark, desc: 'CB Bank, Yoma Bank, KBZ Bank, AYA Bank direct transfers' },
                'Card & Digital': { title: 'Credit Cards & Contactless NFC', icon: CreditCard, desc: 'Visa/Mastercard POS terminals and Apple Pay / NFC' },
              };

              const CatIcon = categoryTitles[cat]?.icon || Wallet;

              return (
                <div key={cat} className="space-y-3">
                  <div className="flex items-center space-x-2 border-b border-[#E5E5EA] pb-2">
                    <span className="p-1.5 bg-[#F5F5F7] rounded-lg text-[#0071E3]">
                      <CatIcon className="w-4 h-4" />
                    </span>
                    <div>
                      <h4 className="text-xs font-extrabold text-[#1D1D1F] uppercase tracking-wider">
                        {categoryTitles[cat]?.title || cat}
                      </h4>
                      <p className="text-[11px] text-[#86868B]">
                        {categoryTitles[cat]?.desc}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {categoryItems.map((method) => (
                      <div
                        key={method.id}
                        className={`p-4 rounded-2xl border transition-all ${
                          method.enabled
                            ? 'bg-white border-[#E5E5EA] shadow-2xs hover:border-[#0071E3]'
                            : 'bg-[#F8F9FA] border-[#E5E5EA] opacity-60'
                        }`}
                      >
                        <div className="flex items-center justify-between pb-3 border-b border-[#F5F5F7]">
                          <div>
                            <div className="flex items-center space-x-1.5">
                              <span className="font-extrabold text-xs text-[#1D1D1F] block">{method.name}</span>
                            </div>
                            <span className={`text-[10px] font-extrabold uppercase px-1.5 py-0.2 rounded-md ${
                              method.enabled ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-500'
                            }`}>
                              {method.enabled ? 'ENABLED globally' : 'DISABLED'}
                            </span>
                          </div>

                          <div className="flex items-center space-x-2">
                            <button
                              type="button"
                              onClick={() => handleTogglePaymentMethod(method.id)}
                              className={`p-1.5 rounded-xl transition-colors cursor-pointer ${
                                method.enabled
                                  ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                                  : 'bg-slate-200 text-slate-500 hover:bg-slate-300'
                              }`}
                              title={method.enabled ? 'Click to Disable' : 'Click to Enable'}
                            >
                              {method.enabled ? (
                                <ToggleRight className="w-5 h-5 text-emerald-600" />
                              ) : (
                                <ToggleLeft className="w-5 h-5 text-slate-400" />
                              )}
                            </button>

                            {/* Quick Toggle Button */}
                            <button
                              type="button"
                              onClick={() => handleTogglePaymentMethod(method.id)}
                              className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                                method.enabled
                                  ? 'bg-rose-50 text-rose-600 hover:bg-rose-100'
                                  : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                              }`}
                            >
                              {method.enabled ? 'Disable' : 'Enable'}
                            </button>
                          </div>
                        </div>

                        {/* Editable details for Mobile Wallet / Bank Account */}
                        <div className="mt-3 space-y-2 text-xs">
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-[10px] font-bold text-[#86868B] block mb-0.5">Gateway / Bank Name</label>
                              <input
                                type="text"
                                value={method.name}
                                onChange={(e) => handleUpdatePaymentMethodField(method.id, 'name', e.target.value)}
                                className="w-full bg-[#F5F5F7] border border-[#E5E5EA] rounded-lg px-2 py-1 text-xs font-bold text-[#1D1D1F]"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] font-bold text-[#86868B] block mb-0.5">Account / Phone No.</label>
                              <input
                                type="text"
                                value={method.accountNumber || ''}
                                onChange={(e) => handleUpdatePaymentMethodField(method.id, 'accountNumber', e.target.value)}
                                placeholder="e.g. 09790000000 or Account #"
                                className="w-full bg-[#F5F5F7] border border-[#E5E5EA] rounded-lg px-2 py-1 text-xs font-mono font-bold text-[#0071E3]"
                              />
                            </div>
                          </div>

                          {method.category !== 'Cash' && method.category !== 'Card & Digital' && (
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="text-[10px] font-bold text-[#86868B] block mb-0.5">Account Beneficiary Name</label>
                                <input
                                  type="text"
                                  value={method.accountName || ''}
                                  onChange={(e) => handleUpdatePaymentMethodField(method.id, 'accountName', e.target.value)}
                                  placeholder="e.g. AppleRepair Pro Ltd"
                                  className="w-full bg-[#F5F5F7] border border-[#E5E5EA] rounded-lg px-2 py-1 text-xs font-bold text-[#1D1D1F]"
                                />
                              </div>
                              <div>
                                <label className="text-[10px] font-bold text-[#86868B] block mb-0.5">Receipt / Note Reference</label>
                                <input
                                  type="text"
                                  value={method.notes || ''}
                                  onChange={(e) => handleUpdatePaymentMethodField(method.id, 'notes', e.target.value)}
                                  placeholder="e.g. Scan QR at counter"
                                  className="w-full bg-[#F5F5F7] border border-[#E5E5EA] rounded-lg px-2 py-1 text-xs text-[#86868B]"
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
  );
};

export default PaymentTab;
