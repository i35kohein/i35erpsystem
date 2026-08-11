import React, { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';
import { PartItem } from '../../types';

/** Shared helpers extracted from InventoryManagementModule (Ko Hein 2026-08-12). */

export const isSameDeviceModel = (left: string, right: string) =>
  left.trim().toLocaleLowerCase() === right.trim().toLocaleLowerCase();

// Small sort-direction indicator for sortable table headers
export const SortArrow: React.FC<{ dir: 'asc' | 'desc' }> = ({ dir }) => (
  <svg
    className={`w-3 h-3 shrink-0 ${dir === 'asc' ? 'text-brand' : 'text-brand rotate-180'}`}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M6 9l6-6 6 6" />
  </svg>
);

export const DEFAULT_QUALITY_TIERS = ['Original', 'OEM', 'Genuine'];

// audit C-P2/C-P3: numeric sanitizer shared by the inline editor and the
// add/edit part forms — rejects NaN and clamps negatives so a typo can never
// silently zero out or corrupt stock/price figures (NaN was serialized to null
// in Supabase and reloaded as 0, destroying the real stock count).
export const sanitizeNonNegativeNumber = (value: unknown, fallback: number): number => {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
};

// audit C-P3: stock-bar width — reorderPoint 0 used to produce Infinity/NaN
// CSS widths (bar pinned at 100% or blank). Fall back to a full/empty bar.
export const stockBarWidthPercent = (part: PartItem): number => {
  if (!(part.reorderPoint > 0)) return part.quantityInStock > 0 ? 100 : 0;
  return Math.min(100, Math.max(8, (part.quantityInStock / (part.reorderPoint * 3)) * 100));
};

// audit C-P3: RMA numbers come from a monotonically increasing sequence
// (year + running counter seeded by the clock) instead of 900 random values,
// which collided across modules and confused RMA lookups.
let rmaSeqCounter = 0;
export const generateRmaNumber = () => {
  rmaSeqCounter = Math.max(rmaSeqCounter + 1, Number(String(Date.now()).slice(-4)));
  return `RMA-${new Date().getFullYear()}-${String(rmaSeqCounter).padStart(4, '0')}`;
};

export type InlineDraft = {
  quantityInStock?: string;
  reorderPoint?: string;
  costPrice?: string;
  sellingPrice?: string;
  locationBin?: string;
  supplierId?: string;
};

export const PRINT_SHELL_RESET = `
            @media print {
              html, body, #root, #main-content-scroll, main, .basic-ui {
                background: #ffffff !important;
                color: #000000 !important;
                margin: 0 !important;
                padding: 0 !important;
                width: 100% !important;
                min-width: 0 !important;
                max-width: 100% !important;
                overflow: visible !important;
              }`;

/** Renders a scannable CODE128 barcode for a part (SKU fallback id). */
export const PartBarcode: React.FC<{ value: string; height?: number }> = ({ value, height = 22 }) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  useEffect(() => {
    if (!svgRef.current || !value) return;
    try {
      JsBarcode(svgRef.current, value, {
        format: 'CODE128',
        width: 1,
        height,
        displayValue: false,
        margin: 0,
        background: '#ffffff',
        lineColor: '#000000',
      });
    } catch {
      // Invalid barcode value — leave blank
    }
  }, [value, height]);
  return <svg ref={svgRef} className="h-full w-full" preserveAspectRatio="xMidYMid meet" />;
};

/** Split parts into A4 pages of at most 18 tags (3 cols x 6 rows). */
export function paginateTags(parts: PartItem[], perPage = 18): PartItem[][] {
  const pages: PartItem[][] = [];
  for (let i = 0; i < parts.length; i += perPage) {
    pages.push(parts.slice(i, i + perPage));
  }
  return pages;
}

/** Stock owner badge — APP (shop, brand blue) vs KZH (Ko Hein, green). */
export const OwnerBadge = ({ owner }: { owner?: string }) => {
  const o = owner || 'APP';
  return o === 'KZH' ? (
    <span className="inline-flex items-center gap-1 rounded-md border border-success/30 bg-success/10 px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wide text-success-deep">
      KZH
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-md border border-brand/30 bg-brand-soft px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wide text-brand">
      APP
    </span>
  );
};
