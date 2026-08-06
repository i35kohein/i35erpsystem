import React, { useEffect, useMemo, useRef, useState } from 'react';
import {Search, X, Package, Users, CornerDownLeft, TicketCheck} from 'lucide-react';
import type { WorkOrder } from '../../types';
import type { PartItem } from '../../types';
import type { Customer } from '../../types';

interface GlobalSearchModalProps {
  open: boolean;
  onClose: () => void;
  workOrders: WorkOrder[];
  parts: PartItem[];
  customers: Customer[];
  onNavigate: (tab: string) => void;
}

type ResultItem =
  | { kind: 'ticket'; id: string; label: string; sub: string; tab: string }
  | { kind: 'part'; id: string; label: string; sub: string; tab: string }
  | { kind: 'customer'; id: string; label: string; sub: string; tab: string };

const KIND_META = {
  ticket: { icon: TicketCheck, label: 'Tickets', tab: 'intake', color: 'text-brand bg-[#E5F1FF]' },
  part: { icon: Package, label: 'Parts', tab: 'inventory', color: 'text-[#AF52DE] bg-purple-50' },
  customer: { icon: Users, label: 'Customers', tab: 'crm', color: 'text-success bg-[#EAF8ED]' },
} as const;

/** Global Cmd/Ctrl+K search across tickets, parts and customers. */
export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
  open,
  onClose,
  workOrders,
  parts,
  customers,
  onNavigate,
}) => {
  const [query, setQuery] = useState('');
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      setQuery('');
      setCursor(0);
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [open]);

  const results = useMemo<ResultItem[]>(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];
    const inText = (...vals: (string | undefined)[]) => vals.some((v) => v && v.toLowerCase().includes(q));
    const items: ResultItem[] = [];
    workOrders.slice(0, 2000).forEach((wo) => {
      if (inText(wo.orderNumber, wo.customerName, wo.customerPhone, wo.imei, wo.serialNumber, wo.deviceModel)) {
        items.push({
          kind: 'ticket', id: wo.id,
          label: `${wo.orderNumber} — ${wo.customerName || '?'}`,
          sub: `${wo.deviceModel || 'Device'}${wo.imei ? ' · ' + wo.imei : ''}${wo.customerPhone ? ' · ' + wo.customerPhone : ''}`,
          tab: 'intake',
        });
      }
    });
    parts.slice(0, 2000).forEach((p) => {
      if (inText(p.name, p.sku, p.category)) {
        items.push({ kind: 'part', id: p.id, label: p.name, sub: `${p.sku || ''}${p.category ? ' · ' + p.category : ''} · ${p.quantityInStock} in stock`, tab: 'inventory' });
      }
    });
    customers.slice(0, 1000).forEach((c) => {
      if (inText(c.name, c.phone, c.email, c.company)) {
        items.push({ kind: 'customer', id: c.id, label: c.name || '?', sub: `${c.phone || ''}${c.email ? ' · ' + c.email : ''}`, tab: 'crm' });
      }
    });
    return items.slice(0, 30);
  }, [query, workOrders, parts, customers]);

  useEffect(() => setCursor(0), [query]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowDown') { e.preventDefault(); setCursor((c) => Math.min(c + 1, results.length - 1)); }
      if (e.key === 'ArrowUp') { e.preventDefault(); setCursor((c) => Math.max(c - 1, 0)); }
      if (e.key === 'Enter' && results[cursor]) {
        e.preventDefault();
        onNavigate(results[cursor].tab);
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, results, cursor, onClose, onNavigate]);

  useEffect(() => {
    const active = listRef.current?.querySelector('[data-active="true"]');
    active?.scrollIntoView({ block: 'nearest' });
  }, [cursor]);

  if (!open) return null;

  const grouped = (['ticket', 'part', 'customer'] as const).map((kind) => ({
    kind,
    meta: KIND_META[kind],
    items: results.filter((r) => r.kind === kind),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center bg-black/40 pt-[12vh] px-4" onMouseDown={onClose}>
      <div
        className="w-full max-w-xl rounded-2xl border border-line bg-white shadow-2xl overflow-hidden"
        onMouseDown={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Global search"
      >
        <div className="flex items-center gap-2 border-b border-line px-4">
          <Search className="h-4 w-4 shrink-0 text-muted" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search tickets, parts, customers…  (Esc to close)"
            className="h-12 w-full bg-transparent text-sm text-ink placeholder-muted focus:outline-none"
            aria-label="Search tickets, parts, customers"
          />
          <button type="button" onClick={onClose} aria-label="Close search" className="shrink-0 text-muted hover:text-ink cursor-pointer">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div ref={listRef} className="max-h-[52vh] overflow-y-auto p-2">
          {query.trim().length < 2 && (
            <p className="px-3 py-8 text-center text-xs text-muted">Type at least 2 characters — search covers tickets, parts & customers.</p>
          )}
          {query.trim().length >= 2 && results.length === 0 && (
            <p className="px-3 py-8 text-center text-xs text-muted">No matches for “{query}”.</p>
          )}
          {grouped.map((g) => (
            <div key={g.kind} className="mb-1">
              <div className="px-3 py-1.5 text-xs font-black uppercase tracking-wider text-muted">
                {g.meta.label} · {g.items.length}
              </div>
              {g.items.map((item) => {
                const idx = results.indexOf(item);
                const active = idx === cursor;
                return (
                  <button
                    key={item.kind + item.id}
                    type="button"
                    data-active={active}
                    onClick={() => { onNavigate(item.tab); onClose(); }}
                    onMouseEnter={() => setCursor(idx)}
                    className={`w-full flex items-center gap-3 rounded-xl px-3 py-2 text-left transition-colors cursor-pointer ${active ? 'bg-brand-soft' : 'hover:bg-surface'}`}
                  >
                    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${g.meta.color}`}>
                      <g.meta.icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-bold text-ink">{item.label}</span>
                      <span className="block truncate text-xs text-muted">{item.sub}</span>
                    </span>
                    {active && <CornerDownLeft className="h-3.5 w-3.5 shrink-0 text-brand" />}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
