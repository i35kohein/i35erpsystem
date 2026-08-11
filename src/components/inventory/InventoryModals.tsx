import React from 'react';
import {
  X,
  Smartphone,
  Printer,
  Check,
  MoreHorizontal,
  Edit2,
  Trash2,
  ShieldAlert,
} from 'lucide-react';
import { PartItem } from '../../types';
import { Button, DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, Input } from '../ui';
import { confirmDialog } from '../common/ConfirmDialog';
import { PRINT_SHELL_RESET, PartBarcode, paginateTags } from './inventoryUtils';

/** Modals + print sheets extracted from InventoryManagementModule (Ko Hein 2026-08-12). */

// ---------------------------------------------------------------------------
// Part Details
// ---------------------------------------------------------------------------
export interface PartDetailsModalProps {
  part: PartItem | null;
  currency: string;
  onUpdatePartStock: (partId: string, newStock: number) => void;
  onEdit: (part: PartItem) => void;
  onWarranty: (part: PartItem) => void;
  onDelete: (partId: string) => void;
  onClose: () => void;
}

export const PartDetailsModal: React.FC<PartDetailsModalProps> = ({
  part,
  currency,
  onUpdatePartStock,
  onEdit,
  onWarranty,
  onDelete,
  onClose,
}) => {
  if (!part) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg space-y-4 rounded-2xl border border-line bg-white p-5 text-xs shadow-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-line pb-3">
          <div className="min-w-0">
            <p className="font-mono text-xs font-extrabold text-brand">{part.sku}</p>
            <h3 className="mt-1 truncate text-sm font-extrabold text-ink">{part.name}</h3>
            <p className="mt-1 text-xs text-muted">{part.category} · {part.qualityTier}</p>
            {part.deviceCompatibility && part.deviceCompatibility.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {part.deviceCompatibility.map((device) => (
                  <span key={device} className="inline-flex items-center gap-0.5 rounded-full border border-brand/30 bg-brand-soft px-1.5 py-0.5 text-[10px] font-bold text-brand-deep">
                    <Smartphone className="h-2.5 w-2.5" />
                    {device}
                  </span>
                ))}
              </div>
            )}
          </div>
          <Button type="button" onClick={onClose} aria-label="Close part details" title="Close details" variant="iconGhost" className="p-1">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl border border-line bg-surface p-3">
            <p className="text-xs font-bold uppercase tracking-wide text-muted">In Stock</p>
            <p className="mt-1 font-mono text-xl font-black text-ink">{part.quantityInStock}</p>
            <div className="mt-2 flex gap-1.5">
              <Button variant="ghost" type="button" onClick={() => { onUpdatePartStock(part.id, Math.max(0, part.quantityInStock - 1)); }} aria-label="Subtract one from stock" title="Subtract one" className="flex h-10 w-10 lg:h-7 lg:w-7 items-center justify-center rounded-lg border border-line bg-white font-black hover:bg-danger/10 hover:text-danger">−</Button>
              <Button variant="ghost" type="button" onClick={() => { onUpdatePartStock(part.id, part.quantityInStock + 1); }} aria-label="Add one to stock" title="Add one" className="flex h-10 w-10 lg:h-7 lg:w-7 items-center justify-center rounded-lg border border-line bg-white font-black text-brand hover:bg-success/10 hover:text-success">+</Button>
              <span className="self-center text-xs font-bold text-muted">Min: {part.reorderPoint}</span>
            </div>
          </div>
          <div className="rounded-xl border border-line bg-surface p-3">
            <p className="text-xs font-bold uppercase tracking-wide text-muted">Price & Location</p>
            <p className="mt-1 font-mono text-xs font-bold text-ink">Cost {part.costPrice.toLocaleString()} {currency}</p>
            <p className="font-mono text-xs font-black text-success-deep">Sell {part.sellingPrice.toLocaleString()} {currency}</p>
            <p className="mt-2 text-xs font-semibold text-muted">Bin: {part.locationBin || '—'}</p>
          </div>
        </div>

        <div className="rounded-xl border border-line bg-surface p-3">
          <p className="text-xs font-bold uppercase tracking-wide text-muted">Supplier</p>
          <p className="mt-1 font-semibold text-ink">{part.supplierName || 'No supplier assigned'}</p>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-line pt-3">
          <Button variant="ghost" type="button" onClick={() => { onWarranty(part); onClose(); }} className="inline-flex h-10 lg:h-8 items-center gap-1.5 rounded-lg border border-warning/30 bg-warning/10 px-2.5 font-extrabold text-warning hover:bg-warning/15"><ShieldAlert className="h-3.5 w-3.5" /> Warranty</Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="iconGhost" size="icon" aria-label="Part actions" className="border border-line">
                <MoreHorizontal className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => { onEdit(part); onClose(); }}>
                <Edit2 className="h-4 w-4" /> Edit
              </DropdownMenuItem>
              <DropdownMenuItem destructive onSelect={async () => { const ok = await confirmDialog({ title: 'Delete Part', message: `Delete part "${part.name}" (${part.sku})?`, confirmLabel: 'Delete Part', danger: true }); if (ok) { onDelete(part.id); onClose(); } }}>
                <Trash2 className="h-4 w-4" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Ground Stock Checking matrix — A4 print
// ---------------------------------------------------------------------------
export interface MatrixPrintSheetProps {
  isOpen: boolean;
  ownerParts: PartItem[];
  matrixModels: string[];
  matrixCategories: string[];
  matrixMergeGroups: Record<string, Record<string, { isFirst: boolean; rowSpan: number } | undefined>>;
  matrixGrandTotal: number;
  matrixCategoryTotals: Record<string, number>;
  onClose: () => void;
}

export const MatrixPrintSheet: React.FC<MatrixPrintSheetProps> = ({
  isOpen,
  ownerParts,
  matrixModels,
  matrixCategories,
  matrixMergeGroups,
  matrixGrandTotal,
  matrixCategoryTotals,
  onClose,
}) => {
  if (!isOpen) return null;
  return (
    <div className="printable-print-root fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 p-2 backdrop-blur-sm sm:p-4">
      <style>{`${PRINT_SHELL_RESET}
          body:has(.printable-print-root) .basic-ui > *:not(:has(.printable-print-root)):not(.printable-print-root):not(.printable-print-root *),
          body:has(.printable-print-root) .basic-ui main *:not(:has(.printable-print-root)):not(.printable-print-root):not(.printable-print-root *) {
            display: none !important;
          }
          .printable-print-root,
          #matrix-print-sheet {
            position: static !important;
            display: block !important;
            width: 100% !important;
            max-width: 100% !important;
            min-width: 0 !important;
            height: auto !important;
            max-height: none !important;
            margin: 0 !important;
            padding: 0 !important;
            border: none !important;
            box-shadow: none !important;
            background: #ffffff !important;
            color: #000000 !important;
            overflow: visible !important;
          }
          #matrix-print-sheet .matrix-print-no-print {
            display: none !important;
          }
          #matrix-print-sheet .overflow-x-auto {
            overflow: visible !important;
            width: 100% !important;
          }
          #matrix-print-sheet .printable-box {
            border: none !important;
            padding: 0 !important;
            border-radius: 0 !important;
          }
          #matrix-print-sheet table {
            width: 100% !important;
            table-layout: fixed !important;
            border-collapse: collapse !important;
            font-size: 8px !important;
            line-height: 1.25 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          #matrix-print-sheet table th:first-child,
          #matrix-print-sheet table td:first-child {
            width: 21% !important;
          }
          #matrix-print-sheet table th:not(:first-child),
          #matrix-print-sheet table td:not(:first-child) {
            width: auto !important;
          }
          #matrix-print-sheet table th,
          #matrix-print-sheet table td {
            padding: 3px 4px !important;
            border: 1px solid #888 !important;
            overflow-wrap: break-word !important;
            word-break: break-word !important;
          }
          #matrix-print-sheet table td[rowspan] {
            border-top: 2px solid #555 !important;
            border-bottom: 2px solid #555 !important;
          }
          #matrix-print-sheet table th {
            font-size: 7px !important;
            font-weight: 700 !important;
            background: #eee !important;
          }
          #matrix-print-sheet h1 {
            font-size: 14px !important;
          }
          #matrix-print-sheet thead {
            display: table-header-group !important;
          }
          #matrix-print-sheet tr {
            break-inside: avoid !important;
          }
          @page { size: A4 landscape; margin: 6mm; }
        `}</style>

      <div id="matrix-print-sheet" className="matrix-print-sheet mx-auto my-4 w-full max-w-6xl rounded-2xl border border-line bg-white p-4 shadow-xl">
        <div className="matrix-print-no-print mb-4 flex items-center justify-between">
          <h3 className="text-sm font-extrabold text-ink">Ground Stock Checking Sheet</h3>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              onClick={() => window.print()}
              className="flex items-center gap-1.5 rounded-lg bg-brand px-3 py-2 text-xs font-extrabold text-white transition hover:bg-brand-deep"
            >
              <Printer className="h-3.5 w-3.5" /> Print
            </Button>
            <Button variant="ghost"
              type="button"
              onClick={onClose}
              className="rounded-lg border border-line bg-surface px-3 py-2 text-xs font-bold text-ink transition hover:bg-line"
            >
              Close
            </Button>
          </div>
        </div>

        <div className="printable-box rounded-xl border border-line p-4">
          <div className="mb-3 flex items-start justify-between border-b border-line pb-3">
            <div>
              <h1 className="text-base font-black text-ink">i35 Apple Service — Ground Stock Checking</h1>
              <p className="text-xs text-muted">Device Model × Component Stock Matrix</p>
            </div>
            <div className="text-right text-xs text-muted">
              <p>Date: <span className="font-bold text-ink">{new Date().toLocaleDateString()}</span></p>
              <p>Time: <span className="font-bold text-ink">{new Date().toLocaleTimeString()}</span></p>
              <p className="mt-1">Checker: ______________________</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="border-b-2 border-ink">
                  <th className="border border-line-strong bg-surface p-1.5 text-left font-black">Device Model</th>
                  {matrixCategories.map((category) => (
                    <th key={category} className="border border-line-strong bg-surface p-1.5 text-center font-black">{category}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {matrixModels.map((model) => (
                  <tr key={model} className="break-inside-avoid">
                    <td className="border border-line-strong p-1.5 font-bold text-ink">{model}</td>
                    {matrixCategories.map((category) => {
                      const merge = matrixMergeGroups[category]?.[model];
                      if (merge && !merge.isFirst) return null;
                      const matchingParts = ownerParts.filter((part) =>
                        part.category === category && part.deviceCompatibility.some((device) => device.toLowerCase() === model.toLowerCase())
                      );
                      const quantity = matchingParts.reduce((total, part) => total + part.quantityInStock, 0);
                      return (
                        <td key={category} rowSpan={merge?.rowSpan ?? 1} className="border border-line-strong p-1 text-center font-mono align-middle">
                          {matchingParts.length ? (
                            <span className={quantity === 0 ? 'font-black text-muted' : 'font-black'}>{quantity}</span>
                          ) : (
                            <span className="text-muted">—</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-ink">
                  <td className="border border-line-strong bg-surface p-1.5 font-black text-ink">
                    Total ({matrixGrandTotal.toLocaleString()})
                  </td>
                  {matrixCategories.map((category) => (
                    <td key={category} className="border border-line-strong bg-surface p-1 text-center font-mono font-black">
                      {matrixCategoryTotals[category]?.toLocaleString() ?? 0}
                    </td>
                  ))}
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="mt-3 flex justify-between text-xs text-muted">
            <span>i35 Apple Service · No 1031, Pyi Htaung Su Main Rd, North Dagon, Yangon</span>
            <span>Sheet generated {new Date().toLocaleString()}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// A4 Spare Parts Tags — print
// ---------------------------------------------------------------------------
export interface TagsPrintSheetProps {
  isOpen: boolean;
  parts: PartItem[];
  currency: string;
  selectedTagIds: Set<string>;
  setSelectedTagIds: (fn: (prev: Set<string>) => Set<string>) => void;
  onClose: () => void;
}

export const TagsPrintSheet: React.FC<TagsPrintSheetProps> = ({
  isOpen,
  parts,
  currency,
  selectedTagIds,
  setSelectedTagIds,
  onClose,
}) => {
  if (!isOpen) return null;
  return (
    <div className="printable-print-root fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 p-2 backdrop-blur-sm sm:p-4">
      <style>{`${PRINT_SHELL_RESET}
          body:has(.printable-print-root) .basic-ui > *:not(:has(.printable-print-root)):not(.printable-print-root):not(.printable-print-root *),
          body:has(.printable-print-root) .basic-ui main *:not(:has(.printable-print-root)):not(.printable-print-root):not(.printable-print-root *) {
            display: none !important;
          }
          .printable-print-root,
          #spare-tags-sheet {
            position: static !important;
            display: block !important;
            width: 100% !important;
            max-width: 100% !important;
            min-width: 0 !important;
            height: auto !important;
            max-height: none !important;
            margin: 0 !important;
            padding: 0 !important;
            border: none !important;
            box-shadow: none !important;
            background: #ffffff !important;
            color: #000000 !important;
            overflow: visible !important;
          }
          #spare-tags-sheet .tags-no-print { display: none !important; }
          #spare-tags-sheet .tags-page {
            display: grid !important;
            grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
            grid-template-rows: repeat(6, auto) !important;
            gap: 4mm !important;
            width: 100% !important;
            page-break-after: always !important;
            break-after: page !important;
          }
          #spare-tags-sheet .tags-page:last-child {
            page-break-after: auto !important;
            break-after: auto !important;
          }
          #spare-tags-sheet .tag-card {
            break-inside: avoid !important;
            border: 1.5px solid #000 !important;
            border-radius: 2mm !important;
            padding: 3mm !important;
            background: #fff !important;
            min-width: 0 !important;
            max-width: 100% !important;
            overflow-wrap: break-word !important;
            word-break: break-word !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          #spare-tags-sheet .tag-barcode {
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            min-height: 6mm !important;
            padding: 0.5mm 0 !important;
          }
          #spare-tags-sheet .tag-card {
            font-size: 7px !important;
            padding: 2mm !important;
          }
          #spare-tags-sheet .tag-card > p {
            margin: 0.5mm 0 !important;
            font-size: 7px !important;
          }
          #spare-tags-sheet .tag-card .tag-barcode svg {
            max-height: 6mm !important;
          }
          #spare-tags-sheet .tag-card [class*='font-black'] {
            font-size: 7px !important;
          }
          #spare-tags-sheet .tag-card [class*='font-mono'] {
            font-size: 6px !important;
          }
          #spare-tags-sheet.print-selected-only .tag-card:not(.tag-selected) {
            display: none !important;
          }
          #spare-tags-sheet .tag-card .tag-selector {
            display: none !important;
          }
          @page { size: A4 portrait; margin: 6mm; }
        `}</style>

      <div id="spare-tags-sheet" className="mx-auto my-4 w-full max-w-3xl rounded-2xl border border-line bg-white p-5 shadow-xl">
        <div className="tags-no-print mb-4 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-extrabold text-ink">
              Spare Parts Tags — A4 ({parts.length} parts)
            </h3>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                onClick={() => {
                  const sheet = document.getElementById('spare-tags-sheet');
                  if (sheet) sheet.classList.remove('print-selected-only');
                  window.print();
                }}
                className="flex items-center gap-1.5 rounded-lg bg-brand px-3 py-2 text-xs font-extrabold text-white transition hover:bg-brand-deep"
              >
                <Printer className="h-3.5 w-3.5" /> Print All
              </Button>
              <Button
                type="button"
                onClick={() => {
                  const sheet = document.getElementById('spare-tags-sheet');
                  if (sheet) sheet.classList.add('print-selected-only');
                  window.print();
                  if (sheet) sheet.classList.remove('print-selected-only');
                }}
                disabled={selectedTagIds.size === 0}
                className="flex items-center gap-1.5 rounded-lg bg-brand px-3 py-2 text-xs font-extrabold text-white transition hover:bg-brand-deep disabled:cursor-not-allowed disabled:bg-faint"
              >
                <Check className="h-3.5 w-3.5" /> Print Selected ({selectedTagIds.size})
              </Button>
              <Button variant="ghost"
                type="button"
                onClick={onClose}
                className="rounded-lg border border-line bg-surface px-3 py-2 text-xs font-bold text-ink transition hover:bg-line"
              >
                Close
              </Button>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs font-bold text-muted">
            <label className="flex cursor-pointer items-center gap-1.5">
              <Input
                type="checkbox"
                checked={selectedTagIds.size === parts.length && parts.length > 0}
                onChange={(e) => {
                  if (e.target.checked) setSelectedTagIds(() => new Set(parts.map((p) => p.id)));
                  else setSelectedTagIds(() => new Set());
                }}
                className="h-3.5 w-3.5 accent-brand"
              />
              Select All
            </label>
            <span>·</span>
            <span>Click a card to toggle its tag for selected printing</span>
          </div>
        </div>

        <div className="rounded-xl border border-line p-3">
          <div className="mb-3 flex items-start justify-between border-b border-line pb-2">
            <div>
              <h1 className="text-sm font-black text-ink">i35 Apple Service — Spare Parts Tags</h1>
              <p className="text-xs text-muted">{new Date().toLocaleDateString()}</p>
            </div>
            <span className="text-xs font-bold text-muted">{parts.length} parts</span>
          </div>

          {paginateTags(parts, 18).map((pageParts, pageIdx) => (
            <div key={pageIdx} className="tags-page mb-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
              {pageParts.map((part) => {
                const isSelected = selectedTagIds.has(part.id);
                const toggleSelect = () => {
                  setSelectedTagIds((prev) => {
                    const next = new Set(prev);
                    if (next.has(part.id)) next.delete(part.id);
                    else next.add(part.id);
                    return next;
                  });
                };
                return (
                  <div
                    key={part.id}
                    onClick={toggleSelect}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleSelect(); }
                    }}
                    className={`tag-card relative flex cursor-pointer flex-col rounded-lg border bg-white p-2.5 transition-colors ${
                      isSelected ? 'tag-selected border-brand ring-2 ring-brand/30' : 'border-ink hover:border-brand'
                    }`}
                  >
                    <div className="tag-selector absolute right-1 top-1 z-10 flex h-5 w-5 items-center justify-center rounded-full border bg-white shadow-xs">
                      <Input
                        type="checkbox"
                        checked={isSelected}
                        onChange={toggleSelect}
                        onClick={(e) => e.stopPropagation()}
                        className="h-3.5 w-3.5 accent-brand"
                      />
                    </div>
                    <div className="flex items-center justify-between border-b border-dashed border-line pb-1.5">
                      <span className="pr-1 text-xs font-black uppercase leading-tight text-ink">{part.category}</span>
                      <span className="ml-1 shrink-0 rounded bg-brand px-1.5 py-0.5 text-xs font-black uppercase text-white">{part.qualityTier}</span>
                    </div>
                    <p className="mt-1.5 text-xs font-extrabold leading-snug text-ink">{part.name}</p>
                    <p className="mt-0.5 truncate font-mono text-xs text-muted" title={part.sku}>SKU: {part.sku}</p>
                    <div className="mt-1.5 flex items-center justify-between gap-1">
                      <div className="min-w-0 text-xs leading-tight text-muted">
                        <p>Bin: <span className="font-bold text-ink">{part.locationBin || '—'}</span></p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-xs font-bold text-muted">Price</p>
                        <p className="font-mono text-base font-black leading-none text-ink">{Number(part.sellingPrice || 0).toLocaleString()} {currency}</p>
                      </div>
                    </div>
                    <div className="tag-barcode mt-1.5 border-t border-dashed border-line pt-1.5">
                      <PartBarcode value={part.sku || part.id} />
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
