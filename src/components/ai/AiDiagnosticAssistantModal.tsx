import React, { useMemo, useRef, useState, useEffect } from 'react';
import { Button } from '../ui';
import { Bot, Send, Sparkles, X, AlertTriangle, PackageSearch, PhoneCall, Activity, Settings2, Copy, Database, RotateCcw } from 'lucide-react';
import { Customer, PartItem, Supplier, SystemSettings, Technician, TechnicianPayoutRecord, WorkOrder } from '../../types';
import { ModelRepairPrice as PriceCatalogItem } from '../../types/priceCatalog';

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
  technicianPayouts?: TechnicianPayoutRecord[];
  priceCatalog?: PriceCatalogItem[];
  systemSettings: SystemSettings;
  onOpenAiSettings: () => void;
  currentUserId?: string;
}

const QUICK_PROMPTS = [
  { label: 'ဒီနေ့ ဦးစားပေးများ', prompt: 'Give me a concise operations brief and priorities for today.', icon: Activity },
  { label: 'Repair ကြန့်ကြားမှုများ', prompt: 'What are the current repair bottlenecks and what should the team do next?', icon: AlertTriangle },
  { label: 'Follow-up များ', prompt: 'Which customers and devices need follow-up first?', icon: PhoneCall },
  { label: 'ပစ္စည်း & stock', prompt: 'Which parts are top used and which stock needs attention?', icon: PackageSearch },
  { label: 'ဒီလ စာရင်း', prompt: 'How many repairs were completed this month, per technician?', icon: Database },
];

const WELCOME_MESSAGE: ChatMessage = {
  id: 'welcome',
  role: 'assistant',
  source: 'local',
  content: 'မင်္ဂလာပါ — ကျွန်တော်က မင်းရဲ့ ERP Operations Copilot ပါ။ ဒီနေ့ရဲ့ ticket, ပစ္စည်းစာရင်း (stock), follow-up, ပညာရှင်တွေရဲ့အလုပ် နဲ့ ငွေရေးကြေးရေး data တွေကို ရှင်းရှင်းလင်းလင်း နောက်တစ်ဆင့်အလုပ်တွေအဖြစ် ပြောပြနိုင်ပါတယ်။ ဘာကိုကြည့်ချင်လဲ — မေးလိုက်ပါ။',
};

export const AiDiagnosticAssistantModal: React.FC<AiDiagnosticAssistantModalProps> = ({
  isOpen,
  onClose,
  workOrders,
  parts,
  customers,
  technicians,
  suppliers,
  technicianPayouts = [],
  priceCatalog = [],
  systemSettings,
  onOpenAiSettings,
  currentUserId,
}) => {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_MESSAGE]);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Per-account chat history: each logged-in user keeps their own conversation
  // (localStorage keyed by user id). Loaded when the assistant opens.
  const historyKey = currentUserId ? `i35_ai_chat_${currentUserId}` : '';
  useEffect(() => {
    if (!isOpen || !historyKey) return;
    try {
      const raw = localStorage.getItem(historyKey);
      if (raw) {
        const stored = JSON.parse(raw) as ChatMessage[];
        if (Array.isArray(stored) && stored.length > 0) {
          setMessages([WELCOME_MESSAGE, ...stored]);
        }
      }
    } catch {
      // ignore corrupt history
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !historyKey) return;
    if (messages.length <= 1) return;
    const persist = messages
      .filter((m) => m.id !== 'welcome' && m.role !== 'system')
      .slice(-50);
    try {
      localStorage.setItem(historyKey, JSON.stringify(persist));
    } catch {
      // storage full / unavailable — history best-effort
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, isOpen]);

  // Shared date helper: is the ISO timestamp on today's calendar date?
  const isToday = (value?: string) => {
    if (!value) return false;
    const date = new Date(value);
    const now = new Date();
    return !Number.isNaN(date.getTime())
      && date.getFullYear() === now.getFullYear()
      && date.getMonth() === now.getMonth()
      && date.getDate() === now.getDate();
  };

  const context = useMemo(() => {
    const now = Date.now();
    const today = new Date(now);
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
    // MONTHLY REPORT — the ERP's real monthly report (technicianPayouts records,
    // shown in Finance → Commissions). Authoritative for "ဒီလ ဘယ်နှစ်လုံး" answers.
    const currentPeriod = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    const monthlyReport = technicianPayouts.map((p) => ({
      period: p.period,
      technicianName: p.technicianName,
      technicianId: p.technicianId,
      totalTicketsClosed: p.totalTicketsClosed ?? p.totalJobsCompleted ?? 0,
      totalLaborRevenue: p.totalLaborRevenue ?? p.grossLaborRevenue ?? 0,
      commissionAmount: p.commissionAmount ?? 0,
      netPayout: p.netPayout ?? p.payoutAmount ?? 0,
      status: p.status,
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
      currentPeriod,
      monthlyReport,
      // Per-technician work history (answers "ဘာတွေပြင်ထားလဲ" / what did X fix).
      technicianWorkHistory: technicians.map((tech) => {
        const techOrders = workOrders
          .filter((o) => o.assignedTechId === tech.id || o.assignedTechName === tech.name)
          .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')))
          .map((o) => {
            const repairs = (o.selectedRepairs || []).map((r) => r.name).filter(Boolean).join(', ');
            return `${o.orderNumber} ${o.deviceModel}${repairs ? ' — ' + repairs : ''} ${o.status}`;
          });
        return { name: tech.name, totalWorkOrders: techOrders.length, workOrders: techOrders };
      }),
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
      // PRICE LIST — full repair price catalog so the assistant quotes real prices.
      priceList: priceCatalog.map((p) => {
        const priced = Object.entries(p.prices || {})
          .filter(([, v]) => v != null && Number(v) > 0)
          .map(([key, value]) => `${key}: ${Number(value).toLocaleString()} ${systemSettings.currencySymbol || 'MMK'}`);
        return `${p.model}: ${priced.length ? priced.join(', ') : 'no prices'}`;
      }),
    };
  }, [workOrders, parts, customers, technicians, suppliers, technicianPayouts, priceCatalog]);

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
    const asksToday = normalized.includes('today') || question.includes('ဒီနေ့');
    const asksThisMonth = normalized.includes('this month') || normalized.includes('monthly') || question.includes('ဒီလ');
    const asksCompletedRepair =
      normalized.includes('completed') || normalized.includes('finished') || normalized.includes('repaired') || normalized.includes('repair')
      || question.includes('ပြင်ပြီး') || question.includes('ပြင်') || question.includes('ပြီးလဲ') || question.includes('ပြီး');

    // Technician-specific: "<name> ဘာတွေပြင်ထားလဲ" → full work history;
    // "<name> ဒီလ ဘယ်နှစ်လုံး" → ERP monthly report (technicianPayouts).
    const askedTech = technicians.find((t) => question.toLowerCase().includes((t.name || '').toLowerCase()));
    if (askedTech) {
      const techOrders = workOrders.filter((o) => o.assignedTechId === askedTech.id || o.assignedTechName === askedTech.name);
      const todayDone = techOrders.filter((o) => ['Finished', 'Taken Out'].includes(o.status) && isToday(o.completedAt || o.updatedAt || o.createdAt));
      const activeNow = techOrders.filter((o) => !['Finished', 'Taken Out', 'Cant Repair', 'Customer Not Repair'].includes(o.status));
      const asksWhatRepaired = question.includes('ဘာတွေ') || question.includes('ဘယ်ဟာ') || normalized.includes('what did') || normalized.includes('fixed') || normalized.includes('repaired') || normalized.includes('ပြင်ထား');
      // Full work history — answers "ဘာတွေပြင်ထားလဲ".
      if (asksWhatRepaired) {
        const history = [...techOrders]
          .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')))
          .map((o) => {
            const repairs = (o.selectedRepairs || []).map((r) => r.name).filter(Boolean).join(', ');
            return `• ${o.orderNumber} — ${o.deviceModel}${repairs ? ` — ${repairs}` : ''} (${o.status}, ${(o.completedAt || o.updatedAt || o.createdAt || '').slice(0, 10)})`;
          });
        if (!history.length) return `${askedTech.name} ရဲ့ work order မရှိသေးပါ။`;
        return `${askedTech.name} ပြင်ထားတဲ့အလုပ်များ (${techOrders.length} ခု):\n${history.join('\n')}\n\nအသေးစိတ်ကို Work Orders → Ticket History မှာ ကြည့်ပါ။`;
      }
      const todayLine = todayDone.length
        ? `ဒီနေ့ ပြီးစီး: ${todayDone.length} စောင် (${todayDone.map((o) => o.orderNumber).join(', ')})`
        : 'ဒီနေ့ ပြီးစီးတဲ့ ticket မရှိသေးပါ။';
      // Monthly answer comes from the ERP monthly report record, never computed.
      const monthlyRecord = context.monthlyReport.find((m) => m.technicianId === askedTech.id || m.technicianName === askedTech.name);
      const monthlyLine = monthlyRecord
        ? `\n\nဒီလ (${monthlyRecord.period}) ပြီးစီး: ${monthlyRecord.totalTicketsClosed} စောင် (ERP monthly report — labor ${monthlyRecord.totalLaborRevenue.toLocaleString()} MMK, commission ${monthlyRecord.commissionAmount.toLocaleString()} MMK, payout ${monthlyRecord.netPayout.toLocaleString()} MMK, ${monthlyRecord.status})`
        : asksThisMonth
          ? `\n\nဒီလ (${context.currentPeriod}) စာရင်းက ကျွန်တော့် monthly report ထဲမှာ ${askedTech.name} အတွက် မရှိသေးပါ — Finance → Commissions မှာ ကြည့်ပေးပါ။`
          : '';
      return `${askedTech.name} ရဲ့ စာရင်း:\n• ${todayLine}\n• လက်ရှိ active: ${activeNow.length} စောင်${monthlyLine}`;
    }

    if (asksThisMonth && asksCompletedRepair) {
      const monthRecords = context.monthlyReport.filter((m) => m.period === context.currentPeriod);
      if (monthRecords.length) {
        const perTech = monthRecords
          .map((m) => `• ${m.technicianName}: ${m.totalTicketsClosed} စောင် (payout ${m.netPayout.toLocaleString()} MMK, ${m.status})`)
          .join('\n');
        const total = monthRecords.reduce((s, m) => s + m.totalTicketsClosed, 0);
        return `ဒီလ (${context.currentPeriod}) ပြီးစီးစာရင်း (ERP monthly report):\nစုစုပေါင်း ${total} စောင်\n${perTech}\n\nအသေးစိတ်ကို Finance → Commissions tab မှာ ကြည့်ပါ။`;
      }
      return `ဒီလ (${context.currentPeriod}) စာရင်းက ကျွန်တော့် monthly report ထဲမှာ မရှိသေးပါ — Finance → Commissions tab မှာ ကြည့်ပေးပါ။`;
    }
    if (asksToday && asksCompletedRepair) {
      const completedList = context.completedToday.length
        ? `\n${context.completedToday.slice(0, 8).map((item) => `• ${item.ticket} — ${item.device} (${item.status})`).join('\n')}`
        : '';
      return `ဒီနေ့ ပြီးစီးထားတဲ့ repair ticket ${context.summary.completedToday} လုံးရှိပါတယ်။${completedList}\n\nFinished / Taken Out status ဖြစ်ပြီး ဒီနေ့ update လုပ်ထားတဲ့ ticket တွေကိုတွက်ထားတာပါ။`;
    }
    if (normalized.includes('bottleneck') || normalized.includes('stuck') || normalized.includes('delay')) {
      if (!context.bottlenecks.length) return 'နာရီ ၄၈ နာရီထက် update မရှိတဲ့ active ticket မရှိပါ။ Repair pipeline မှာ လက်ရှိ ကြန့်ကြာနေတဲ့ bottleneck မရှိပါဘူး။';
      return `ကြန့်ကြာနေတဲ့ ticket ${context.bottlenecks.length} ခုရှိပါတယ်:\n${context.bottlenecks
        .slice(0, 8)
        .map((item) => `• ${item.ticket} — ${item.device}, ${item.status}, ${item.hoursWithoutUpdate}နာရီ, ${item.technician}`)
        .join('\n')}`;
    }
    if (normalized.includes('part') || normalized.includes('selling') || normalized.includes('stock') || question.includes('ပစ္စည်း')) {
      const top = context.topUsedParts.length
        ? context.topUsedParts.map((item, index) => `${index + 1}. ${item.name}: ${item.quantity} ခုသုံး`).join('\n')
        : 'Non-labor part usage မှတ်တမ်းမရှိသေးပါ။';
      const low = context.lowStockParts.length
        ? `\n\nပစ္စည်းနည်းနေတဲ့စာရင်း:\n${context.lowStockParts.slice(0, 8).map((item) => `• ${item.name}: ကျန် ${item.stock} (reorder ${item.reorderPoint})`).join('\n')}`
        : '\n\nလက်ရှိ reorder point အောက်ရောက်နေတဲ့ ပစ္စည်းမရှိပါ။';
      return `အသုံးအများဆုံး ပစ္စည်းများ:\n${top}${low}`;
    }
    if (normalized.includes('follow') || normalized.includes('call') || normalized.includes('customer') || question.includes('နောက်လိုက်')) {
      if (!context.followUps.length) return 'လက်ရှိ follow-up လိုအပ်နေတဲ့ ပြီးစီးထားတဲ့ device မရှိပါ။';
      return `Follow-up လိုတဲ့ device ${context.followUps.length} ခုရှိပါတယ်:\n${context.followUps
        .slice(0, 10)
        .map((item) => `• ${item.ticket} — ${item.customer}, ${item.device}, ${item.followUpStatus}`)
        .join('\n')}`;
    }
    if (
      normalized.includes('finance') ||
      normalized.includes('revenue') ||
      normalized.includes('balance') ||
      normalized.includes('unpaid') ||
      normalized.includes('money') ||
      question.includes('ငွေ')
    ) {
      const collectionPriority =
        context.finance.outstanding > 0
          ? `ဦးစားပေး: unpaid ticket ${context.summary.unpaidTickets} ခုက ကျန်နေတဲ့ ${context.finance.outstanding.toLocaleString()} ${systemSettings.currencySymbol} ကို သွားရှင်းသင့်ပါတယ်။`
          : 'ကျန်နေတဲ့ ရရန်ငွေ မရှိပါဘူး။';
      return `ငွေရေးကြေးရေး အကျဉ်းချုပ်:\n• ရရှိငွေ: ${context.finance.totalRevenue.toLocaleString()} ${systemSettings.currencySymbol}.\n• ကျန်ရှိငွေ: ${context.finance.outstanding.toLocaleString()} ${systemSettings.currencySymbol}.\n• Unpaid ticket: ${context.summary.unpaidTickets}.\n\n${collectionPriority}`;
    }
    // Price lookup: when the user names a device model, quote real prices.
    const modelMatch = priceCatalog.find((p) =>
      (p.model || '').toLowerCase().split(/\s+/).every((tok) =>
        tok.length > 1 && normalized.includes(tok.toLowerCase())
      )
    );
    if (modelMatch && (normalized.includes('price') || normalized.includes('cost') || normalized.includes('ဘယ်လောက်') || normalized.includes('ဈေး') || normalized.includes('နှုန်း') || normalized.includes('ကျသင့်') || normalized.includes('ဖိုး'))) {
      const priced = Object.entries(modelMatch.prices || {})
        .filter(([, v]) => v != null && Number(v) > 0)
        .map(([key, value]) => `• ${key}: ${Number(value).toLocaleString()} ${systemSettings.currencySymbol || 'MMK'}`);
      if (!priced.length) return `${modelMatch.model} အတွက် စျေးနှုန်းစာရင်း မရှိသေးပါ။`;
      return `${modelMatch.model} ပြင်ဆင်ခများ:\n${priced.join('\n')}\n\nအသေးစိတ် warranty နဲ့ စျေးနှုန်းအတွက် Price List ကို ကြည့်ပါ။`;
    }
    return `ဆိုင်ရဲ့ အကျဉ်းချုပ်:\n• Active ticket ${context.summary.activeTickets} ခု; ပြီးစီး ${context.summary.completedTickets} ခု.\n• နာရီ ၄၈ ကျော် ကြန့်ကြာနေတဲ့ ticket ${context.bottlenecks.length} ခု.\n• Follow-up လိုတဲ့ device ${context.followUps.length} ခု.\n• Reorder အောက် ပစ္စည်း ${context.lowStockParts.length} ခု.\n• ရရှိငွေ: ${context.finance.totalRevenue.toLocaleString()} ${systemSettings.currencySymbol}.\n• ကျန်ရှိငွေ: ${context.finance.outstanding.toLocaleString()} ${systemSettings.currencySymbol}.\n\nBottlenecks, ပစ္စည်းစာရင်း, follow-up, ငွေရေးကြေးရေး အသေးစိတ် မေးချင်ရင် မေးလိုက်ပါ။`;
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
    if (historyKey) {
      try {
        localStorage.removeItem(historyKey);
      } catch {
        // ignore
      }
    }
  };

  const copyMessage = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
    } catch {
      // Clipboard support is not guaranteed in every browser context.
    }
  };

  return (
    <aside
      role="dialog"
      aria-modal="true"
      aria-label="Operations Copilot chat"
      className="fixed bottom-0 left-0 right-0 sm:left-auto sm:right-4 sm:bottom-4 sm:w-[400px] sm:max-w-[calc(100vw-2rem)] h-[82dvh] sm:h-[min(70vh,560px)] z-50 bg-white border-t sm:border border-line rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-i35-slide-up"
    >
        <div className="px-4 py-3 border-b border-line flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 bg-brand text-white flex items-center justify-center rounded-lg"><Bot className="w-4 h-4" /></div>
            <div className="min-w-0">
              <h2 className="text-sm font-extrabold text-ink">Operations Copilot</h2>
              <p className="text-xs text-muted truncate flex items-center gap-1"><span className={`w-1.5 h-1.5 rounded-full ${isExternalAi ? 'bg-success' : 'bg-brand'}`} />{providerLabel}</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button type="button" onClick={clearConversation} disabled={isLoading} title="New conversation" aria-label="New conversation" className="p-2 text-muted hover:text-brand hover:bg-brand-soft rounded-lg disabled:opacity-40"><RotateCcw className="w-4 h-4" /></Button>
            <Button type="button" onClick={onOpenAiSettings} title="AI provider settings" aria-label="AI provider settings" className="p-2 text-muted hover:text-brand hover:bg-brand-soft rounded-lg"><Settings2 className="w-4 h-4" /></Button>
            <Button type="button" onClick={onClose} title="Close assistant" aria-label="Close assistant" className="p-2 text-muted hover:text-ink hover:bg-brand-soft rounded-lg"><X className="w-4 h-4" /></Button>
          </div>
        </div>

        <div className="px-4 py-2.5 border-b border-line shrink-0">
          <div className="flex items-center gap-1.5 text-xs text-muted mb-2">
            <Database className="w-3.5 h-3.5 text-brand" />
            <span>Live context: <strong className="text-ink">{context.summary.activeTickets} active</strong> · <strong className="text-ink">{context.lowStockParts.length} low stock</strong> · <strong className="text-ink">{context.followUps.length} follow-ups</strong></span>
          </div>
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
          {QUICK_PROMPTS.map(({ label, prompt, icon: Icon }) => (
            <Button key={label} type="button" disabled={isLoading} onClick={() => sendMessage(prompt)} className="px-2.5 py-1.5 bg-surface border border-line text-ink rounded-lg text-xs font-bold flex items-center gap-1.5 shrink-0 hover:border-brand hover:bg-brand-soft disabled:opacity-50">
              <Icon className="w-3.5 h-3.5 text-brand" /> {label}
            </Button>
          ))}
          </div>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-surface [scrollbar-gutter:stable]">
          {messages.map((message) => (
            message.role === 'system' ? (
              <div key={message.id} className="mx-auto max-w-[92%] px-2.5 py-1.5 text-xs text-warning bg-warning/10 border border-warning/30 rounded-lg text-center">{message.content}</div>
            ) : (
            <div key={message.id} className={`group flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`relative max-w-[90%] px-3 py-2.5 text-xs leading-relaxed whitespace-pre-wrap border ${
                message.role === 'user'
                  ? 'bg-brand text-white border-brand rounded-2xl rounded-br-md'
                  : 'bg-white text-ink border-line rounded-2xl rounded-bl-md shadow-sm'
              }`}>
                {message.role === 'assistant' && <span className="block mb-1 text-xs font-bold uppercase tracking-wide text-muted">{message.source === 'ai' ? 'AI analysis' : 'Live ERP analysis'}</span>}
                {message.content}
                {message.role === 'assistant' && (
                  <Button type="button" onClick={() => void copyMessage(message.content)} aria-label="Copy response" title="Copy response" className="absolute -right-8 top-1.5 p-1 text-muted opacity-0 group-hover:opacity-100 hover:text-brand">
                    <Copy className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>
            </div>
            )
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="px-3 py-2.5 bg-white border border-line rounded-2xl rounded-bl-md text-xs text-muted flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-brand animate-pulse" /> Reviewing live ERP data…
              </div>
            </div>
          )}
        </div>

        <form onSubmit={(event) => { event.preventDefault(); sendMessage(); }} className="p-3 border-t border-line bg-white shrink-0">
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
              className="flex-1 min-h-[42px] max-h-28 resize-none border border-line bg-white rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-brand"
            />
            <Button type="submit" disabled={!input.trim() || isLoading} title="Send message" aria-label="Send message" className="w-10 h-10 bg-brand text-white rounded-xl flex items-center justify-center disabled:opacity-40">
              <Send className="w-4 h-4" />
            </Button>
          </div>
          <p className="mt-1.5 text-xs text-muted text-center">Enter sends · Shift+Enter new line.</p>
        </form>
      </aside>
  );
};
