import React, { useMemo, useRef, useState, useEffect } from 'react';
import { Bot, Send, Sparkles, X, AlertTriangle, PackageSearch, PhoneCall, Activity, Settings2 } from 'lucide-react';
import { Customer, PartItem, Supplier, SystemSettings, Technician, WorkOrder } from '../../types';

type ChatMessage = { id: string; role: 'user' | 'assistant'; content: string };

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
  { label: 'Bottlenecks', prompt: 'What are the current repair bottlenecks?', icon: AlertTriangle },
  { label: 'Top parts', prompt: 'Which parts are top selling or most used?', icon: PackageSearch },
  { label: 'Follow-ups', prompt: 'Which devices or customers need follow-up?', icon: PhoneCall },
  { label: 'Daily brief', prompt: 'Give me a concise operations brief and priorities.', icon: Activity },
];

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
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: 'I can analyze this shop’s live tickets, bottlenecks, parts usage, stock, follow-ups, technicians, customers, suppliers, and finance. What should we check?',
    },
  ]);
  const scrollRef = useRef<HTMLDivElement>(null);

  const context = useMemo(() => {
    const now = Date.now();
    const active = workOrders.filter((order) => !['Finished', 'Taken Out', 'Cant Repair', 'Customer Not Repair'].includes(order.status));
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

  useEffect(() => {
    if (isOpen) requestAnimationFrame(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight }));
  }, [messages, isOpen]);

  const localAnswer = (question: string) => {
    const normalized = question.toLowerCase();
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
      if (!systemSettings.aiProvider || systemSettings.aiProvider === 'local') {
        answer = localAnswer(trimmed);
      } else {
        const response = await fetch('/api/ai/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            provider: systemSettings.aiProvider,
            apiKey: systemSettings.aiApiKey,
            model: systemSettings.aiModel,
            baseUrl: systemSettings.aiBaseUrl,
            systemPrompt: systemSettings.aiSystemPrompt,
            messages: nextMessages.filter((message) => message.id !== 'welcome').map(({ role, content }) => ({ role, content })),
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
      setMessages((current) => [...current, { id: `assistant-${Date.now()}`, role: 'assistant', content: answer }]);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'AI provider request failed.';
      setMessages((current) => [
        ...current,
        { id: `assistant-${Date.now()}`, role: 'assistant', content: `${message}\n\nLocal analysis:\n${localAnswer(trimmed)}` },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <button type="button" aria-label="Close AI Assistant" onClick={onClose} className="fixed inset-0 z-40 bg-black/10 cursor-default" />
      <aside className="fixed right-0 top-[52px] bottom-0 z-50 w-full sm:w-[420px] bg-white border-l border-[#E5E5EA] shadow-2xl flex flex-col">
        <div className="h-14 px-4 border-b border-[#E5E5EA] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 bg-[#0071E3] text-white flex items-center justify-center rounded-lg"><Bot className="w-4.5 h-4.5" /></div>
            <div className="min-w-0">
              <h2 className="text-sm font-extrabold text-[#1D1D1F]">ERP Operations Assistant</h2>
              <p className="text-[10px] text-[#86868B] truncate">
                {systemSettings.aiProvider === 'local' || !systemSettings.aiProvider ? 'Local live-data analysis' : `${systemSettings.aiProvider} · ${systemSettings.aiModel || 'default model'}`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button type="button" onClick={onOpenAiSettings} title="AI Provider Settings" className="p-2 text-[#86868B] hover:text-[#0071E3] hover:bg-[#F5F5F7] rounded-lg"><Settings2 className="w-4 h-4" /></button>
            <button type="button" onClick={onClose} title="Close Assistant" className="p-2 text-[#86868B] hover:text-[#1D1D1F] hover:bg-[#F5F5F7] rounded-lg"><X className="w-4 h-4" /></button>
          </div>
        </div>

        <div className="px-3 py-2.5 border-b border-[#E5E5EA] flex gap-1.5 overflow-x-auto no-scrollbar shrink-0">
          {QUICK_PROMPTS.map(({ label, prompt, icon: Icon }) => (
            <button key={label} type="button" onClick={() => sendMessage(prompt)} className="px-2.5 py-1.5 bg-[#F5F5F7] border border-[#E5E5EA] text-[#1D1D1F] rounded-lg text-[10px] font-bold flex items-center gap-1.5 shrink-0">
              <Icon className="w-3.5 h-3.5 text-[#0071E3]" /> {label}
            </button>
          ))}
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-[var(--bg)]">
          {messages.map((message) => (
            <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[88%] px-3 py-2.5 text-xs leading-relaxed whitespace-pre-wrap border ${
                message.role === 'user'
                  ? 'bg-[#0071E3] text-white border-[#0071E3] rounded-2xl rounded-br-md'
                  : 'bg-white text-[#1D1D1F] border-[#E5E5EA] rounded-2xl rounded-bl-md'
              }`}>
                {message.content}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="px-3 py-2.5 bg-white border border-[#E5E5EA] rounded-2xl rounded-bl-md text-xs text-[#86868B] flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-[#0071E3]" /> Analyzing live ERP data…
              </div>
            </div>
          )}
        </div>

        <form onSubmit={(event) => { event.preventDefault(); sendMessage(); }} className="p-3 border-t border-[#E5E5EA] bg-white shrink-0">
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
              rows={2}
              placeholder="Ask about tickets, parts, follow-ups, finance…"
              className="flex-1 min-h-[42px] max-h-28 resize-none border border-[#E5E5EA] bg-white rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#0071E3]"
            />
            <button type="submit" disabled={!input.trim() || isLoading} title="Send Message" className="w-10 h-10 bg-[#0071E3] text-white rounded-xl flex items-center justify-center disabled:opacity-40">
              <Send className="w-4 h-4" />
            </button>
          </div>
          <p className="mt-1.5 text-[9px] text-[#86868B] text-center">Uses current ERP records. Verify critical decisions before acting.</p>
        </form>
      </aside>
    </>
  );
};
