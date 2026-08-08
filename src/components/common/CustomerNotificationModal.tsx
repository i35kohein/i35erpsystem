import React, { useState, useEffect } from 'react';
import { Button } from '../ui';
import {MessageSquare, Phone, Send, Copy, Check, X, BellRing, ExternalLink} from 'lucide-react';
import { WorkOrder, SystemSettings, NotificationTemplate } from '../../types';
import { DEFAULT_NOTIFICATION_TEMPLATES } from '../../data/seedData';

interface CustomerNotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  workOrder: WorkOrder;
  onLogNotificationSent?: (method: string, message: string) => void;
  settings?: SystemSettings;
}

export const applyTemplateVariables = (
  rawTemplate: string,
  wo: WorkOrder,
  shopName: string = 'AppleRepair Pro Lab',
  shopPhone: string = '+95 9 790 000 000'
) => {
  if (!rawTemplate) return '';
  return rawTemplate
    .replace(/\{customerName\}/g, wo.customerName || 'Customer')
    .replace(/\{deviceModel\}/g, wo.deviceModel || 'Device')
    .replace(/\{ticketNumber\}/g, wo.orderNumber || wo.id || '')
    .replace(/\{totalAmount\}/g, (wo.totalAmount || 0).toLocaleString())
    .replace(/\{shopName\}/g, shopName)
    .replace(/\{shopPhone\}/g, shopPhone);
};

export const CustomerNotificationModal: React.FC<CustomerNotificationModalProps> = ({
  isOpen,
  onClose,
  workOrder,
  onLogNotificationSent,
  settings,
}) => {
  if (!isOpen || !workOrder) return null;

  const initialChannel = settings?.defaultNotificationChannel || 'Viber';
  const [channel, setChannel] = useState<'SMS' | 'Viber' | 'Telegram'>(initialChannel);

  const activeTemplates: NotificationTemplate[] = (settings?.notificationTemplates && settings.notificationTemplates.length > 0)
    ? settings.notificationTemplates
    : DEFAULT_NOTIFICATION_TEMPLATES;

  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(activeTemplates[0]?.id || 'tmpl-1');
  const [copied, setCopied] = useState(false);
  const [isLogged, setIsLogged] = useState(false);

  const shopName = settings?.shopName || 'AppleRepair Pro Lab';
  const shopPhone = settings?.shopPhone || '+95 9 790 000 000';

  const currentTmplObj = activeTemplates.find((t) => t.id === selectedTemplateId) || activeTemplates[0];

  const [messageText, setMessageText] = useState(() => 
    currentTmplObj ? applyTemplateVariables(currentTmplObj.templateText, workOrder, shopName, shopPhone) : ''
  );

  useEffect(() => {
    if (currentTmplObj) {
      setMessageText(applyTemplateVariables(currentTmplObj.templateText, workOrder, shopName, shopPhone));
    }
  }, [selectedTemplateId, workOrder, settings]);

  // Clean phone number format for Viber/SMS/Telegram
  const rawPhone = workOrder.customerPhone || '';
  const cleanPhone = rawPhone.replace(/[^0-9+]/g, '');

  const handleSelectTemplate = (tmpl: NotificationTemplate) => {
    setSelectedTemplateId(tmpl.id);
    setMessageText(applyTemplateVariables(tmpl.templateText, workOrder, shopName, shopPhone));
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(messageText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    if (onLogNotificationSent && !isLogged) {
      onLogNotificationSent(channel, messageText);
      setIsLogged(true);
    }
  };

  const encodedMsg = encodeURIComponent(messageText);

  const getActionUrl = () => {
    if (channel === 'SMS') {
      return `sms:${cleanPhone}?body=${encodedMsg}`;
    }
    if (channel === 'Viber') {
      return `viber://chat?number=${cleanPhone}`;
    }
    if (channel === 'Telegram') {
      return `https://t.me/share/url?url=&text=${encodedMsg}`;
    }
    return '#';
  };

  const handleSendAction = () => {
    const url = getActionUrl();
    if (url && url !== '#') {
      window.open(url, '_blank');
    }
    if (onLogNotificationSent && !isLogged) {
      onLogNotificationSent(channel, messageText);
      setIsLogged(true);
    }
  };

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="customer-notification-title" className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-white rounded-2xl border border-line shadow-2xl max-w-lg w-full overflow-hidden">
        {/* Modal Header */}
        <div className="bg-ink text-white p-5 flex items-center justify-between">
          <div className="flex items-center space-x-2.5" id="customer-notification-title">
            <div className="p-2 bg-brand rounded-2xl text-white">
              <BellRing className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h2 className="text-base font-extrabold tracking-tight">Customer Notification Alert</h2>
              <p className="text-xs text-slate-300">
                Ticket <span className="font-mono text-blue-300 font-bold">{workOrder.orderNumber}</span> • {workOrder.customerName} ({workOrder.customerPhone})
              </p>
            </div>
          </div>
          <Button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/10 text-slate-300 hover:text-white transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="p-6 space-y-5">
          {/* Channel Selector Buttons */}
          <div>
            <label className="block text-xs font-extrabold text-muted uppercase tracking-wider mb-2">
              Select Notification Channel
            </label>
            <div className="grid grid-cols-3 gap-2">
              <Button
                type="button"
                onClick={() => setChannel('Viber')}
                className={`py-2.5 px-3 rounded-2xl border font-extrabold text-xs flex items-center justify-center space-x-2 transition-all cursor-pointer ${
                  channel === 'Viber'
                    ? 'bg-purple text-white border-purple shadow-sm'
                    : 'bg-surface text-ink border-line hover:bg-line'
                }`}
              >
                <MessageSquare className="w-4 h-4" />
                <span>Viber</span>
              </Button>

              <Button
                type="button"
                onClick={() => setChannel('SMS')}
                className={`py-2.5 px-3 rounded-2xl border font-extrabold text-xs flex items-center justify-center space-x-2 transition-all cursor-pointer ${
                  channel === 'SMS'
                    ? 'bg-success text-white border-success shadow-sm'
                    : 'bg-surface text-ink border-line hover:bg-line'
                }`}
              >
                <Phone className="w-4 h-4" />
                <span>Direct SMS</span>
              </Button>

              <Button
                type="button"
                onClick={() => setChannel('Telegram')}
                className={`py-2.5 px-3 rounded-2xl border font-extrabold text-xs flex items-center justify-center space-x-2 transition-all cursor-pointer ${
                  channel === 'Telegram'
                    ? 'bg-sky text-white border-sky shadow-sm'
                    : 'bg-surface text-ink border-line hover:bg-line'
                }`}
              >
                <Send className="w-4 h-4" />
                <span>Telegram</span>
              </Button>
            </div>
          </div>

          {/* Configured Notification Templates */}
          <div>
            <label className="block text-xs font-extrabold text-muted uppercase tracking-wider mb-2">
              Notification Message Templates (မြန်မာဘာသာ)
            </label>
            <div className="flex flex-wrap gap-1.5">
              {activeTemplates.map((tmpl) => {
                const isSel = selectedTemplateId === tmpl.id;
                return (
                  <Button
                    key={tmpl.id}
                    type="button"
                    onClick={() => handleSelectTemplate(tmpl)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      isSel
                        ? 'bg-brand text-white shadow-xs'
                        : 'bg-surface text-ink hover:bg-line border border-line'
                    }`}
                  >
                    {tmpl.title}
                  </Button>
                );
              })}
            </div>
          </div>

          {/* Message Text Area */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label htmlFor="customer-notification-text" className="text-xs font-bold text-muted">Message Preview:</label>
              <span className="text-xs text-brand font-bold">{messageText.length} characters</span>
            </div>
            <textarea
              id="customer-notification-text"
              aria-label="Message preview"
              rows={4}
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              className="w-full bg-surface border border-line rounded-2xl p-3.5 text-xs text-ink font-sans leading-relaxed focus:bg-white focus:border-brand focus:ring-2 focus:ring-brand/20 resize-none"
            />
          </div>

          {/* Recipient summary info badge */}
          <div className="bg-brand-soft border border-brand/30 p-3 rounded-2xl flex items-center justify-between text-xs text-ink">
            <div>
              <span className="text-xs text-muted block">Recipient Phone:</span>
              <span className="font-mono font-extrabold text-brand">{workOrder.customerPhone || 'N/A'}</span>
            </div>
            <div className="text-right">
              <span className="text-xs text-muted block">Device / Total:</span>
              <span className="font-bold">{workOrder.deviceModel} • {workOrder.totalAmount.toLocaleString()} MMK</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-2 pt-2 border-t border-line">
            <Button
              type="button"
              onClick={handleCopy}
              className="flex-1 py-3 bg-surface hover:bg-line text-ink font-extrabold text-xs rounded-2xl transition-all flex items-center justify-center space-x-1.5 cursor-pointer active:scale-95 border border-line-strong"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-success" />
                  <span className="text-success-deep">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-brand" />
                  <span>Copy Burmese Text</span>
                </>
              )}
            </Button>

            <Button
              type="button"
              onClick={handleSendAction}
              className={`flex-1 py-3 text-white font-extrabold text-xs rounded-2xl shadow-md transition-all flex items-center justify-center space-x-1.5 cursor-pointer active:scale-95 ${
                channel === 'Viber'
                  ? 'bg-purple hover:bg-purple/90'
                  : channel === 'SMS'
                  ? 'bg-success hover:bg-success/90'
                  : 'bg-sky hover:bg-sky/90'
              }`}
            >
              <ExternalLink className="w-4 h-4" />
              <span>Send via {channel}</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
