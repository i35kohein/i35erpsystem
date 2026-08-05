import React from 'react';
import type { SystemSettings } from '../../../types';
import { BellRing, ChevronDown, MessageSquare, Phone, Plus, RefreshCw, Send, Sparkles, Store, Tag, Trash2 } from 'lucide-react';

interface NotificationsTabProps {
  formData: SystemSettings;
  setFormData: React.Dispatch<React.SetStateAction<SystemSettings>>;
  isSectionOpen: (key: string) => boolean;
  toggleSection: (key: string) => void;
  currentNotificationTemplates: any[];
  handleUpdateTemplateField: (id: string, field: string, value: any) => void;
  handleInsertVariable: (templateId: string, variableTag: string) => void;
  handleAddCustomNotificationTemplate: () => void;
  handleDeleteNotificationTemplate: (id: string) => void;
  handleResetNotificationTemplates: () => void;
  samplePrintWorkOrder: any;
}

const NotificationsTab: React.FC<NotificationsTabProps> = ({ formData, setFormData, isSectionOpen, toggleSection, currentNotificationTemplates, handleUpdateTemplateField, handleInsertVariable, handleAddCustomNotificationTemplate, handleDeleteNotificationTemplate, handleResetNotificationTemplates, samplePrintWorkOrder }) => {
  return (
        <div className="space-y-6">
          {/* Main Config Card */}
          <div className="bg-white p-6 rounded-2xl border border-line-strong shadow-2xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-line">
              <div>
                <h3 className="text-base font-extrabold text-ink flex items-center space-x-2">
                  <BellRing className="w-5 h-5 text-brand" />
                  <span>Automatic SMS & Telegram Notification Templates</span>
                </h3>
                <p className="text-xs text-muted mt-1">
                  Customize automatic notification templates sent to customers for repair milestones (Finished, Ready for Pickup, Needs Attention, Pending Parts, Intake).
                </p>
              </div>

              <div className="flex items-center space-x-2 shrink-0">
                <button
                  type="button"
                  onClick={handleResetNotificationTemplates}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-ink font-bold text-xs rounded-xl transition-all border border-line-strong flex items-center space-x-1.5 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-muted" />
                  <span>Reset Defaults</span>
                </button>
                <button
                  type="button"
                  onClick={handleAddCustomNotificationTemplate}
                  className="px-3.5 py-2 bg-brand hover:bg-brand-deep text-white font-extrabold text-xs rounded-xl transition-all shadow-2xs flex items-center space-x-1.5 cursor-pointer active:scale-95"
                >
                  <Plus className="w-4 h-4" />
                  <span>New Template</span>
                </button>
              </div>
            </div>

            {/* Global Dispatch Channels & Triggers */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-surface rounded-2xl border border-line space-y-3">
                <label className="text-xs font-extrabold text-ink block flex items-center space-x-2">
                  <MessageSquare className="w-4 h-4 text-brand" />
                  <span>Default Preferred Dispatch Channel</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'Viber', label: 'Viber', color: 'bg-[#7360F2]' },
                    { id: 'SMS', label: 'Direct SMS', color: 'bg-success' },
                    { id: 'Telegram', label: 'Telegram', color: 'bg-[#229ED9]' },
                  ].map((ch) => {
                    const isSelected = (formData.defaultNotificationChannel || 'Viber') === ch.id;
                    return (
                      <button
                        key={ch.id}
                        type="button"
                        onClick={() => setFormData({ ...formData, defaultNotificationChannel: ch.id as any })}
                        className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
                          isSelected
                            ? `${ch.color} text-white border-transparent shadow-2xs`
                            : 'bg-white text-ink border-line-strong hover:bg-slate-100'
                        }`}
                      >
                        <span>{ch.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="p-4 bg-surface rounded-2xl border border-line space-y-3 flex flex-col justify-center">
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.autoPromptNotificationModal ?? true}
                    onChange={(e) => setFormData({ ...formData, autoPromptNotificationModal: e.target.checked })}
                    className="w-4 h-4 text-brand rounded focus:ring-0 cursor-pointer"
                  />
                  <div>
                    <span className="font-extrabold text-ink text-xs block">Auto-Prompt Notification Window on Status Change</span>
                    <span className="text-[11px] text-muted">Automatically open dispatch dialog when ticket moves to Finished, Ready, or Pending Parts.</span>
                  </div>
                </label>
              </div>
            </div>

            {/* Telegram Bot Integration Config */}
            <div className="p-4 bg-gradient-to-r from-blue-50/50 to-indigo-50/50 rounded-2xl border border-blue-200 space-y-3">
              <div className="flex items-center space-x-2">
                <Send className="w-4 h-4 text-[#229ED9]" />
                <h4 className="text-xs font-extrabold text-ink">Telegram Bot & Store Alerts Integration</h4>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-[11px] font-bold text-muted mb-1">Telegram Bot Token</label>
                  <input
                    type="text"
                    placeholder="e.g. 7890123456:AAFx..."
                    value={formData.telegramBotToken || ''}
                    onChange={(e) => setFormData({ ...formData, telegramBotToken: e.target.value })}
                    className="w-full bg-white border border-line-strong rounded-xl px-3 py-2 text-xs font-mono text-ink focus:border-brand focus:ring-1 focus:ring-brand"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-muted mb-1">Telegram Admin Chat ID / Channel ID</label>
                  <input
                    type="text"
                    placeholder="e.g. @applerepair_updates or -100123456789"
                    value={formData.telegramChatId || ''}
                    onChange={(e) => setFormData({ ...formData, telegramChatId: e.target.value })}
                    className="w-full bg-white border border-line-strong rounded-xl px-3 py-2 text-xs font-mono text-ink focus:border-brand focus:ring-1 focus:ring-brand"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Templates Cards List — collapsible (mobile-friendly) */}
          <div className="bg-white rounded-2xl border border-line-strong shadow-2xs overflow-hidden">
            <button
              type="button"
              onClick={() => toggleSection('notif-templates')}
              className="w-full flex items-center justify-between gap-2 px-4 py-3 bg-[#F8F9FA] hover:bg-[#F0F1F4] transition-colors cursor-pointer"
              aria-expanded={isSectionOpen('notif-templates')}
            >
              <span className="text-xs font-extrabold text-ink flex items-center space-x-2">
                <BellRing className="w-4 h-4 text-brand" />
                <span>Configured Message Templates ({currentNotificationTemplates.length})</span>
              </span>
              <ChevronDown className={`w-4 h-4 text-muted transition-transform ${isSectionOpen('notif-templates') ? '' : 'rotate-180'}`} />
            </button>
            {isSectionOpen('notif-templates') && (
            <div className="space-y-4 p-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-extrabold text-muted uppercase tracking-wider">
                Configured Message Templates ({currentNotificationTemplates.length})
              </h4>
              <span className="text-[11px] text-brand font-bold">
                Click variable buttons to insert tags into text
              </span>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {currentNotificationTemplates.map((tmpl) => {
                const sampleOutput = (tmpl.templateText || '')
                  .replace(/\{customerName\}/g, samplePrintWorkOrder.customerName)
                  .replace(/\{deviceModel\}/g, samplePrintWorkOrder.deviceModel)
                  .replace(/\{ticketNumber\}/g, samplePrintWorkOrder.orderNumber)
                  .replace(/\{totalAmount\}/g, samplePrintWorkOrder.totalAmount.toLocaleString())
                  .replace(/\{shopName\}/g, formData.shopName || 'AppleRepair Pro Lab')
                  .replace(/\{shopPhone\}/g, formData.shopPhone || '+95 9 790 000 000');

                return (
                  <div
                    key={tmpl.id}
                    className="bg-white p-5 rounded-2xl border border-line-strong shadow-2xs space-y-4 hover:border-brand/50 transition-all"
                  >
                    {/* Template Card Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-line">
                      <div className="flex items-center space-x-3">
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={tmpl.enabled ?? true}
                            onChange={(e) => handleUpdateTemplateField(tmpl.id, 'enabled', e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-success"></div>
                        </label>
                        <div>
                          <input
                            type="text"
                            value={tmpl.title}
                            onChange={(e) => handleUpdateTemplateField(tmpl.id, 'title', e.target.value)}
                            className="font-extrabold text-sm text-ink bg-transparent border-b border-transparent hover:border-line-strong focus:border-brand focus:outline-none px-1"
                          />
                          {tmpl.description && (
                            <p className="text-[11px] text-muted px-1">{tmpl.description}</p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <span className="px-2.5 py-1 bg-blue-50 text-brand font-mono text-[10px] font-bold rounded-lg border border-blue-200">
                          Key: {tmpl.key}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleDeleteNotificationTemplate(tmpl.id)}
                          className="p-2 text-slate-400 hover:text-danger hover:bg-rose-50 rounded-lg transition-all cursor-pointer"
                          title="Delete Template"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Variable Shortcut Insert Pills */}
                    <div>
                      <span className="text-[10px] font-extrabold text-muted uppercase tracking-wider block mb-1.5">
                        Insert Dynamic Tag Shortcut:
                      </span>
                      <div className="flex flex-wrap gap-1.5 text-[11px]">
                        {[
                          { tag: '{customerName}', label: 'Customer Name' },
                          { tag: '{deviceModel}', label: 'Device Model' },
                          { tag: '{ticketNumber}', label: 'Ticket Number' },
                          { tag: '{totalAmount}', label: 'Total Price' },
                          { tag: '{shopName}', label: 'Shop Name' },
                          { tag: '{shopPhone}', label: 'Shop Phone' },
                        ].map((v) => (
                          <button
                            key={v.tag}
                            type="button"
                            onClick={() => handleInsertVariable(tmpl.id, v.tag)}
                            className="px-2.5 py-1 bg-surface hover:bg-blue-50 text-ink hover:text-brand font-mono font-bold text-[11px] rounded-lg border border-line transition-all cursor-pointer flex items-center space-x-1"
                          >
                            <Plus className="w-3 h-3 text-brand" />
                            <span>{v.tag}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Template Textarea */}
                    <div>
                      <label className="block text-[11px] font-bold text-muted mb-1">
                        Template Message Text (မြန်မာဘာသာ / English):
                      </label>
                      <textarea
                        rows={3}
                        value={tmpl.templateText}
                        onChange={(e) => handleUpdateTemplateField(tmpl.id, 'templateText', e.target.value)}
                        className="w-full bg-surface border border-line rounded-xl p-3 text-xs text-ink font-sans leading-relaxed focus:bg-white focus:border-brand focus:ring-2 focus:ring-brand/20 resize-none"
                      />
                    </div>

                    {/* Real-time Render Preview Box */}
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-1">
                      <div className="flex items-center justify-between text-[10px] font-bold text-muted">
                        <span className="flex items-center space-x-1">
                          <Sparkles className="w-3 h-3 text-amber-500" />
                          <span>Live Customer Preview (Daw Khin Than • iPhone 15 Pro):</span>
                        </span>
                        <span>{sampleOutput.length} characters</span>
                      </div>
                      <p className="text-xs text-ink font-sans leading-relaxed bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs">
                        {sampleOutput}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
            </div>
            )}
          </div>
        </div>
  );
};

export default NotificationsTab;
