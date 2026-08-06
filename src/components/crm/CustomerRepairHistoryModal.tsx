import React from 'react';
import { Button } from '../ui';
import { 
  X, 
  History, 
  User, 
  Phone, 
  Mail, 
  Building, 
  Clock, 
  CheckCircle2, 
  Tag,
  TrendingUp} from 'lucide-react';
import { Customer, WorkOrder, SystemSettings } from '../../types';
import { CustomerRepairTimeline } from './CustomerRepairTimeline';
import { DEFAULT_SYSTEM_SETTINGS } from '../../data/seedData';

interface CustomerRepairHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer | null;
  workOrders: WorkOrder[];
  systemSettings?: SystemSettings;
  onPrintInvoice?: (wo: WorkOrder) => void;
}



export const CustomerRepairHistoryModal: React.FC<CustomerRepairHistoryModalProps> = ({
  isOpen,
  onClose,
  customer,
  workOrders,
  systemSettings = DEFAULT_SYSTEM_SETTINGS,
  onPrintInvoice,
}) => {

  if (!isOpen || !customer) return null;

  // Find all work orders for this customer
  const customerOrders = workOrders.filter(
    (wo) =>
      wo.customerId === customer.id ||
      (customer.phone && wo.customerPhone === customer.phone) ||
      (customer.name && wo.customerName?.toLowerCase() === customer.name.toLowerCase())
  );

  // Filtered orders
  

  // Calculate metrics
  const completedCount = customerOrders.filter((wo) => wo.status === 'Finished').length;
  const inProgressCount = customerOrders.filter((wo) => wo.status === 'In Progress' || wo.status === 'Receive' || wo.status === 'Pending').length;
  const totalSpent = customerOrders.reduce((acc, wo) => acc + (wo.totalAmount || 0), 0);
  const avgCost = customerOrders.length > 0 ? Math.round(totalSpent / customerOrders.length) : 0;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[70] flex items-center justify-center p-3 sm:p-6 animate-fadeIn">
      <div className="bg-white border border-line rounded-3xl w-full max-w-5xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-line bg-[#F8FBFD] flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-brand/10 text-brand-deep rounded-2xl shadow-inner">
              <User className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg font-black text-ink">{customer.name}</h2>
                <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${
                  customer.type === 'B2B Corporate' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                  customer.type === 'Wholesale Mail-In' ? 'bg-brand-soft text-brand border-brand/20' :
                  'bg-white text-ink border-line'
                }`}>
                  {customer.type}
                </span>
              </div>
              <p className="text-xs text-muted">Complete Lifetime Repair Dossier & Service Records</p>
            </div>
          </div>

          <Button
            onClick={onClose}
            className="p-2 text-muted hover:text-ink hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Modal Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
          {/* Customer Metadata Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-surface p-4 rounded-2xl border border-line">
            <div className="flex items-center space-x-2">
              <Phone className="w-4 h-4 text-muted" />
              <div>
                <span className="block text-xs text-muted font-bold uppercase">Phone</span>
                <span className="font-mono font-bold text-ink">{customer.phone || 'N/A'}</span>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Mail className="w-4 h-4 text-muted" />
              <div className="min-w-0">
                <span className="block text-xs text-muted font-bold uppercase">Email</span>
                <span className="font-semibold text-ink truncate block">{customer.email || 'N/A'}</span>
              </div>
            </div>

            {customer.company && (
              <div className="flex items-center space-x-2">
                <Building className="w-4 h-4 text-muted" />
                <div className="min-w-0">
                  <span className="block text-xs text-muted font-bold uppercase">Company</span>
                  <span className="font-semibold text-ink truncate block">{customer.company}</span>
                </div>
              </div>
            )}

            <div className="flex items-center space-x-2">
              <Tag className="w-4 h-4 text-brand" />
              <div>
                <span className="block text-xs text-muted font-bold uppercase">Account Tier</span>
                <span className="font-bold text-brand">{customer.discountPercentage}% Discount Tier</span>
              </div>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white p-3.5 rounded-2xl border border-line shadow-2xs">
              <span className="text-xs font-bold text-muted uppercase">Total Repairs</span>
              <div className="text-lg font-black text-ink mt-0.5 flex items-center justify-between">
                <span>{customerOrders.length}</span>
                <History className="w-5 h-5 text-brand" />
              </div>
            </div>

            <div className="bg-white p-3.5 rounded-2xl border border-line shadow-2xs">
              <span className="text-xs font-bold text-muted uppercase">Completed</span>
              <div className="text-lg font-black text-emerald-600 mt-0.5 flex items-center justify-between">
                <span>{completedCount}</span>
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              </div>
            </div>

            <div className="bg-white p-3.5 rounded-2xl border border-line shadow-2xs">
              <span className="text-xs font-bold text-muted uppercase">Active Repairs</span>
              <div className="text-lg font-black text-amber-600 mt-0.5 flex items-center justify-between">
                <span>{inProgressCount}</span>
                <Clock className="w-5 h-5 text-amber-500" />
              </div>
            </div>

            <div className="bg-white p-3.5 rounded-2xl border border-line shadow-2xs">
              <span className="text-xs font-bold text-muted uppercase">Total Expenditure</span>
              <div className="text-lg font-black text-[#15803D] mt-0.5 flex items-center justify-between">
                <span>{totalSpent.toLocaleString()} {systemSettings.currencySymbol}</span>
                <TrendingUp className="w-5 h-5 text-[#15803D]" />
              </div>
            </div>
          </div>

          {/* Chronological Repair History Timeline */}
          <div className="space-y-3 pt-2">
            <h3 className="font-extrabold text-ink text-xs flex items-center justify-between">
              <span>Chronological Repair History & Outcomes ({customerOrders.length})</span>
              {customerOrders.length > 0 && (
                <span className="text-muted text-xs font-medium">Average Ticket Value: {avgCost.toLocaleString()} {systemSettings.currencySymbol}</span>
              )}
            </h3>

            <CustomerRepairTimeline
              workOrders={customerOrders}
              systemSettings={systemSettings}
              onPrintInvoice={onPrintInvoice}
              showFilters={true}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-line bg-[#F8FBFD] flex justify-end">
          <Button
            onClick={onClose}
            className="px-5 py-2 bg-ink hover:bg-black text-white font-bold text-xs rounded-xl shadow-2xs transition-all cursor-pointer"
          >
            Close Dossier
          </Button>
        </div>
      </div>
    </div>
  );
};
