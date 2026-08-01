import React, { useMemo, useRef, useState, useEffect } from 'react';
import { Bot, Send, Sparkles, X, AlertTriangle, PackageSearch, PhoneCall, Activity, Settings2, Copy, Database, RotateCcw } from 'lucide-react';
import { Customer, PartItem, Supplier, SystemSettings, Technician, WorkOrder } from '../../types';

type ChatMessage = {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  source?: 'ai' | 'local';
};

interface AiDiagnosticAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  workOrders: WorkOrder[];
  parts: PartItem[];
  customers: Customer[];
  technicians: Technician[];
  suppliers: Supplier[];
  systemSettings: SystemSettings;
  onOpenAiSettings: () => void;
}

const QUICK_PROMPTS = [
  { label: 'Today’s priorities', prompt: 'Give me a concise operations brief and priorities for today.', icon: Activity },
  { label: 'Repair delays', prompt: 'What are the current repair bottlenecks and what should the team do next?', icon: AlertTriangle },
  { label: 'Follow-ups', prompt: 'Which customers and devices need follow-up first?', icon: PhoneCall },
  { label: 'Parts & stock', prompt: 'Which parts are top used and which stock needs attention?', icon: PackageSearch },
];

const WELCOME_MESSAGE: ChatMessage = {
  id: 'welcome',
  role: 'assistant',
  source: 'local',
  content: 'Hello — I am your ERP Operations Copilot. I can turn today’s live ticket, stock, follow-up, technician, and finance data into clear next actions. What would you like to review?',
};

export const AiDiagnosticAssistantModal: React.FC<AiDiagnosticAssistantModalProps> = ({
  isOpen,
  onClose,
  workOrders,
  parts,
  customers,
  technicians,
  suppliers,
  systemSettings,
  onOpenAiSettings,
}) => {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_MESSAGE]);
  const scrollRef = useRef<HTMLDivElement>(null);

  const context = useMemo(() => {
    const now = Date.now();
    const today = new Date(now);
    const isToday = (value?: string) => {
      if (!value) return false;
      const date = new Date(value);
      return !Number.isNaN(date.getTime())
        && date.getFullYear() === today.getFullYear()
        && date.getMonth() === today.getMonth()
        && date.getDate() === today.getDate();
    };
    const active = workOrders.filter((order) => !['Finished', 'Taken Out', 'Cant Repair', 'Customer Not Repair'].includes(order.status));
    const completedToday = workOrders
      .filter((order) => ['Finished', 'Taken Out'].includes(order.status))
      .filter((order) => isToday(order.updatedAt || order.createdAt))
      .map((order) => ({
        ticket: order.orderNumber,
        device: order.deviceModel,
        customer: order.customerName,
        status: order.status,
        technician: order.assignedTechName || 'Unassigned',
      }));
    const bottlenecks = active
      .map((order) => {
        const ageHours = Math.floor((now - new Date(order.updatedAt || order.createdAt).getTime()) / 3_600_000);
        return { ...order, ageHours };
      })
      .filter((order) => order.ageHours >= 48)
      .sort((a, b) => b.ageHours - a.ageHours)
      .slice(0, 15)
      .map((order) => ({
        ticket: order.orderNumber,
        device: order.deviceModel,
        customer: order.customerName,
        status: order.status,
        technician: order.assignedTechName || 'Unassigned',
        hoursWithoutUpdate: order.ageHours,
        priority: order.priority,
      }));

    const partUsage = new Map<string, { name: string; quantity: number; revenue: number }>();
    workOrders.forEach((order) =>
      order.lineItems?.filter((item) => !item.isLabor).forEach((item) => {
        const key = item.partId || item.partName || item.description;
        const current = partUsage.get(key) || { name: item.partName || item.description, quantity: 0, revenue: 0 };
        current.quantity += item.quantity;
        current.revenue += item.unitPrice * item.quantity;
        partUsage.set(key, current);
      })
    );

    const followUps = workOrders
      .filter((order) => ['Finished', 'Taken Out'].includes(order.status))
      .filter((order) => !['Satisfied', 'Closed'].includes(order.followUpStatus || ''))
      .map((order) => ({
        ticket: order.orderNumber,
        customer: order.customerName,
        phone: order.customerPhone,
        device: order.deviceModel,
        completedAt: order.updatedAt,
        followUpStatus: order.followUpStatus || 'Pending Call',
      }))
      .slice(0, 20);

    return {
      generatedAt: new Date().toISOString(),
      summary: {
        totalTickets: workOrders.length,
        activeTickets: active.length,
        completedTickets: workOrders.filter((order) => ['Finished', 'Taken Out'].includes(order.status)).length,
        completedToday: completedToday.length,
        unpaidTickets: workOrders.filter((order) => !order.isPaid).length,
        customers: customers.length,
        suppliers: suppliers.length,
      },
      statusCounts: Object.fromEntries(
        ['Receive', 'In Progress', 'Pending', 'Finished', 'Taken Out', 'Cant Repair', 'Customer Not Repair'].map((status) => [
          status,
          workOrders.filter((order) => order.status === status).length,
        ])
      ),
      bottlenecks,
      topUsedParts: [...partUsage.values()].sort((a, b) => b.quantity - a.quantity).slice(0, 10),
      lowStockParts: parts
        .filter((part) => part.quantityInStock <= part.reorderPoint)
        .map((part) => ({
          sku: part.sku,
          name: part.name,
          stock: part.quantityInStock,
          reserved: part.reservedQuantity,
          reorderPoint: part.reorderPoint,
          supplier: part.supplierName,
        }))
        .slice(0, 20),
      followUps,
      completedToday,
      technicianLoad: technicians.map((tech) => ({
        name: tech.name,
        status: tech.status,
        activeJobs: active.filter((order) => order.assignedTechId === tech.id).length,
        warrantyReturns: tech.warrantyReturnCount,
      })),
      finance: {
        totalRevenue: workOrders.filter((order) => order.isPaid).reduce((sum, order) => sum + order.totalAmount, 0),
        outstanding: workOrders.reduce((sum, order) => sum + Math.max(0, order.totalAmount - (order.paidAmount || 0)), 0),
      },
    };
  }, [workOrders, parts, customers, technicians, suppliers]);

  const isExternalAi = Boolean(
    systemSettings.aiProvider
    && systemSettings.aiProvider !== 'local'
    && (systemSettings.aiProvider === 'deepseek' || systemSettings.aiApiKey)
  );
  const providerLabel = isExternalAi
    ? `${systemSettings.aiProvider} · ${systemSettings.aiModel || 'default model'}`
    : 'Local live-data analysis';

  useEffect(() => {
    if (isOpen) requestAnimationFrame(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight }));
  }, [messages, isOpen]);

  const localAnswer = (question: string) => {
    const normalized = question.toLowerCase();
    const isBurmese = /[\u1000-\u109f]/.test(question);
    const asksToday = normalized.includes('today') || question.includes('ဒီနေ့');
    const asksCompletedRepair =
      normalized.includes('completed') || normalized.includes('finished') || normalized.includes('repaired') || normalized.includes('repair')
      || question.includes('ပြင်ပြီး') || question.includes('ပြင်') || question.includes('ပြီးလဲ') || question.includes('ပြီး');

    if (asksToday && asksCompletedRepair) {
      if (isBurmese) {
        const completedList = context.completedToday.length
          ? `\n${context.completedToday.slice(0, 8).map((item) => `• ${item.ticket} — ${item.device} (${item.status})`).join('\n')}`
          : '';
        return `ဒီနေ့ ပြီးစီးထားတဲ့ repair ticket ${context.summary.completedToday} လုံးရှိပါတယ်။${completedList}\n\nFinished / Taken Out status ဖြစ်ပြီး ဒီနေ့ update လုပ်ထားတဲ့ ticket တွေကိုတွက်ထားတာပါ။`;
      }
      const completedList = context.completedToday.length
        ? `\n${context.completedToday.slice(0, 8).map((item) => `• ${item.ticket} — ${item.device} (${item.status})`).join('\n')}`
        : '';
      return `${context.summary.completedToday} repair ticket(s) were completed today.${completedList}\n\nThis counts Finished and Taken Out tickets updated today.`;
    }
    if (normalized.includes('bottleneck') || normalized.includes('stuck') || normalized.includes('delay')) {
      if (!context.bottlenecks.length) return 'No active ticket has gone 48 hours without an update. The repair pipeline currently has no aging bottleneck.';
      return `There are ${context.bottlenecks.length} aging tickets:\n${context.bottlenecks
        .slice(0, 8)
        .map((item) => `• ${item.ticket} — ${item.device}, ${item.status}, ${item.hoursWithoutUpdate}h, ${item.technician}`)
        .join('\n')}`;
    }
    if (normalized.includes('part') || normalized.includes('selling') || normalized.includes('stock')) {
      const top = context.topUsedParts.length
        ? context.topUsedParts.map((item, index) => `${index + 1}. ${item.name}: ${item.quantity} used`).join('\n')
        : 'No non-labor part usage is recorded yet.';
      const low = context.lowStockParts.length
        ? `\n\nLow stock:\n${context.lowStockParts.slice(0, 8).map((item) => `• ${item.name}: ${item.stock} available (reorder at ${item.reorderPoint})`).join('\n')}`
        : '\n\nNo parts are currently at or below their reorder point.';
      return `Top used parts:\n${top}${low}`;
    }
    if (normalized.includes('follow') || normalized.includes('call') || normalized.includes('customer')) {
      if (!context.followUps.length) return 'No completed device currently requires a follow-up.';
      return `${context.followUps.length} completed devices need follow-up:\n${context.followUps
        .slice(0, 10)
        .map((item) => `• ${item.ticket} — ${item.customer}, ${item.device}, ${item.followUpStatus}`)
        .join('\n')}`;
    }
    if (
      normalized.includes('finance') ||
      normalized.includes('revenue') ||
      normalized.includes('balance') ||
      normalized.includes('unpaid') ||
      normalized.includes('money')
    ) {
      const collectionPriority =
        context.finance.outstanding > 0
          ? `Priority: review and collect the ${context.finance.outstanding.toLocaleString()} ${systemSettings.currencySymbol} outstanding balance across ${context.summary.unpaidTickets} unpaid ticket(s).`
          : 'No outstanding repair balance requires collection.';
      return `Finance summary:\n• Paid revenue: ${context.finance.totalRevenue.toLocaleString()} ${systemSettings.currencySymbol}.\n• Outstanding balance: ${context.finance.outstanding.toLocaleString()} ${systemSettings.currencySymbol}.\n• Unpaid tickets: ${context.summary.unpaidTickets}.\n\n${collectionPriority}`;
    }
    return `Shop brief:\n• ${context.summary.activeTickets} active tickets; ${context.summary.completedTickets} completed.\n• ${context.bottlenecks.length} ticket(s) aging over 48 hours.\n• ${context.followUps.length} completed device(s) need follow-up.\n• ${context.lowStockParts.length} part(s) are at or below reorder level.\n• Paid revenue: ${context.finance.totalRevenue.toLocaleString()} ${systemSettings.currencySymbol}.\n• Outstanding balance: ${context.finance.outstanding.toLocaleString()} ${systemSettings.currencySymbol}.\n\nAsk about bottlenecks, top parts, stock, follow-ups, technicians, or finance for details.`;
  };

  const sendMessage = async (question = input) => {
    const trimmed = question.trim();
    if (!trimmed || isLoading) return;
    const userMessage: ChatMessage = { id: `user-${Date.now()}`, role: 'user', content: trimmed };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInput('');
    setIsLoading(true);

    try {
      let answer: string;
      if (!isExternalAi) {
        answer = localAnswer(trimmed);
      } else {
        const response = await fetch('/api/ai/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            provider: systemSettings.aiProvider,
            // DeepSeek uses the server-only DEEPSEEK_API_KEY. Never send a key
            // from the browser for that provider.
            apiKey: systemSettings.aiProvider === 'deepseek' ? undefined : systemSettings.aiApiKey,
            model: systemSettings.aiModel,
            baseUrl: systemSettings.aiBaseUrl,
            systemPrompt: systemSettings.aiSystemPrompt,
            messages: nextMessages
              .filter((message) => message.role !== 'system' && message.id !== 'welcome')
              .slice(-12)
              .map(({ role, content }) => ({ role, content })),
            context,
          }),
        });
        const responseText = await response.text();
        let data: { success?: boolean; answer?: string; error?: string } = {};
        if (responseText.trim()) {
          try {
            data = JSON.parse(responseText);
          } catch {
            throw new Error(`AI service returned an invalid response (HTTP ${response.status}).`);
          }
        } else {
          throw new Error(
            response.status === 404
              ? 'AI service is not ready. Restart the local server once, then try again.'
              : `AI service returned no response (HTTP ${response.status}).`
          );
        }
        if (!response.ok || !data.success) throw new Error(data.error || `AI provider request failed (HTTP ${response.status}).`);
        if (!data.answer) throw new Error('The AI provider returned an empty answer.');
        answer = data.answer;
      }
      setMessages((current) => [
        ...current,
        { id: `assistant-${Date.now()}`, role: 'assistant', source: isExternalAi ? 'ai' : 'local', content: answer },
      ]);
    } catch (error) {
      setMessages((current) => [
        ...current,
        { id: `notice-${Date.now()}`, role: 'system', content: 'AI provider is unavailable right now. Showing local live-data analysis instead.' },
        { id: `assistant-${Date.now()}`, role: 'assistant', source: 'local', content: localAnswer(trimmed) },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const clearConversation = () => {
    if (isLoading) return;
    setMessages([WELCOME_MESSAGE]);
    setInput('');
  };

  const copyMessage = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
    } catch {
      // Clipboard support is not guaranteed in every browser context.
    }
  };

  return (
    <>
      <button type="button" aria-label="Close AI Assistant" onClick={onClose} className="fixed inset-0 z-40 bg-black/10 cursor-default" />
      <aside className="fixed right-0 top-[52px] bottom-0 z-50 w-full sm:w-[440px] bg-white border-l border-[var(--border)] shadow-2xl flex flex-col">
        <div className="px-4 py-3 border-b border-[var(--border)] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 bg-[var(--primary)] text-white flex items-center justify-center rounded-lg"><Bot className="w-4 h-4" /></div>
            <div className="min-w-0">
              <h2 className="text-sm font-extrabold text-[var(--text-main)]">Operations Copilot</h2>
              <p className="text-[10px] text-[var(--text-muted)] truncate flex items-center gap-1"><span className={`w-1.5 h-1.5 rounded-full ${isExternalAi ? 'bg-emerald-500' : 'bg-[var(--primary)]'}`} />{providerLabel}</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button type="button" onClick={clearConversation} disabled={isLoading} title="New conversation" className="p-2 text-[var(--text-muted)] hover:text-[var(--primary)] hover:bg-[var(--blue-tint)] rounded-lg disabled:opacity-40"><RotateCcw className="w-4 h-4" /></button>
            <button type="button" onClick={onOpenAiSettings} title="AI provider settings" className="p-2 text-[var(--text-muted)] hover:text-[var(--primary)] hover:bg-[var(--blue-tint)] rounded-lg"><Settings2 className="w-4 h-4" /></button>
            <button type="button" onClick={onClose} title="Close assistant" className="p-2 text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--blue-tint)] rounded-lg"><X className="w-4 h-4" /></button>
          </div>
        </div>

        <div className="px-4 py-2.5 border-b border-[var(--border)] shrink-0">
          <div className="flex items-center gap-1.5 text-[10px] text-[var(--text-muted)] mb-2">
            <Database className="w-3.5 h-3.5 text-[var(--primary)]" />
            <span>Live context: <strong className="text-[var(--text-main)]">{context.summary.activeTickets} active</strong> · <strong className="text-[var(--text-main)]">{context.lowStockParts.length} low stock</strong> · <strong className="text-[var(--text-main)]">{context.followUps.length} follow-ups</strong></span>
          </div>
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
          {QUICK_PROMPTS.map(({ label, prompt, icon: Icon }) => (
            <button key={label} type="button" disabled={isLoading} onClick={() => sendMessage(prompt)} className="px-2.5 py-1.5 bg-[var(--bg)] border border-[var(--border)] text-[var(--text-main)] rounded-lg text-[10px] font-bold flex items-center gap-1.5 shrink-0 hover:border-[var(--primary)] hover:bg-[var(--blue-tint)] disabled:opacity-50">
              <Icon className="w-3.5 h-3.5 text-[var(--primary)]" /> {label}
            </button>
          ))}
          </div>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-[var(--bg)] [scrollbar-gutter:stable]">
          {messages.map((message) => (
            message.role === 'system' ? (
              <div key={message.id} className="mx-auto max-w-[92%] px-2.5 py-1.5 text-[10px] text-amber-800 bg-amber-50 border border-amber-200 rounded-lg text-center">{message.content}</div>
            ) : (
            <div key={message.id} className={`group flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`relative max-w-[90%] px-3 py-2.5 text-xs leading-relaxed whitespace-pre-wrap border ${
                message.role === 'user'
                  ? 'bg-[var(--primary)] text-white border-[var(--primary)] rounded-2xl rounded-br-md'
                  : 'bg-white text-[var(--text-main)] border-[var(--border)] rounded-2xl rounded-bl-md shadow-sm'
              }`}>
                {message.role === 'assistant' && <span className="block mb-1 text-[9px] font-bold uppercase tracking-wide text-[var(--text-muted)]">{message.source === 'ai' ? 'AI analysis' : 'Live ERP analysis'}</span>}
                {message.content}
                {message.role === 'assistant' && (
                  <button type="button" onClick={() => void copyMessage(message.content)} title="Copy response" className="absolute -right-8 top-1.5 p-1 text-[var(--text-muted)] opacity-0 group-hover:opacity-100 hover:text-[var(--primary)]">
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
            )
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="px-3 py-2.5 bg-white border border-[var(--border)] rounded-2xl rounded-bl-md text-xs text-[var(--text-muted)] flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-[var(--primary)] animate-pulse" /> Reviewing live ERP data…
              </div>
            </div>
          )}
        </div>

        <form onSubmit={(event) => { event.preventDefault(); sendMessage(); }} className="p-3 border-t border-[var(--border)] bg-white shrink-0">
          <div className="flex items-end gap-2">
            <textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  sendMessage();
                }
              }}
              rows={1}
              placeholder="Ask a business question…"
              className="flex-1 min-h-[42px] max-h-28 resize-none border border-[var(--border)] bg-white rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[var(--primary)]"
            />
            <button type="submit" disabled={!input.trim() || isLoading} title="Send message" className="w-10 h-10 bg-[var(--primary)] text-white rounded-xl flex items-center justify-center disabled:opacity-40">
              <Send className="w-4 h-4" />
            </button>
          </div>
          <p className="mt-1.5 text-[9px] text-[var(--text-muted)] text-center">Enter to send · Shift + Enter for a new line · Confirm critical decisions before acting.</p>
        </form>
      </aside>
    </>
  );
};
