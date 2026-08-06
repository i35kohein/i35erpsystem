import React from 'react';
import { Button } from '../../ui';
import {AlignLeft, CheckCircle2, ChevronDown, ExternalLink, FileText, Globe, Mail, MapPin, Phone, Printer, QrCode, Store, Tag, Type} from 'lucide-react';
import type { SystemSettings } from '../../../types';

interface PosTabProps {
  formData: SystemSettings;
  setFormData: React.Dispatch<React.SetStateAction<SystemSettings>>;
  settings: SystemSettings;
  isSectionOpen: (key: string) => boolean;
  toggleSection: (key: string) => void;
  setIsDeviceTagPrinterOpen: (v: boolean) => void;
  setActiveSubTab: (t: any) => void;
  visibleStorePhones: string[];
  receiptFooterEditorRef: React.RefObject<HTMLTextAreaElement>;
  receiptFooterPreviewLines: string[];
  receiptFooterPreviewFontSize: any;
  selectedFooterAlignment: any;
  updateSelectedFooterLines: (editor: HTMLTextAreaElement | null) => void;
  handleReceiptFooterChange: (value: string, editor: HTMLTextAreaElement) => void;
  applyReceiptFooterAlignment: (a: any) => void;
  applyReceiptFooterTextSize: (s: any) => void;
  RECEIPT_FOOTER_ALIGNMENT_OPTIONS: readonly any[];
  RECEIPT_FOOTER_SIZE_OPTIONS: readonly any[];
  splitFooterTextBySize: (text: string, start: number, ranges: Array<{ start: number; end: number; size: 'small' | 'medium' | 'large' }>, fallback: 'small' | 'medium' | 'large') => Array<{ text: string; size: string }>;
}

const PosTab: React.FC<PosTabProps> = ({ formData, setFormData, isSectionOpen, toggleSection, setIsDeviceTagPrinterOpen, setActiveSubTab, visibleStorePhones, receiptFooterEditorRef, receiptFooterPreviewLines, receiptFooterPreviewFontSize, selectedFooterAlignment, updateSelectedFooterLines, handleReceiptFooterChange, applyReceiptFooterAlignment, applyReceiptFooterTextSize, RECEIPT_FOOTER_ALIGNMENT_OPTIONS, RECEIPT_FOOTER_SIZE_OPTIONS, splitFooterTextBySize }) => {
  return (
        <div className="space-y-6">
          {/* Top Banner Header */}
          <div className="bg-gradient-to-r from-brand/10 via-brand/5 to-transparent p-5 rounded-2xl border border-brand/20 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start space-x-3.5">
              <div className="w-10 h-10 rounded-xl bg-brand text-white flex items-center justify-center shrink-0 shadow-md">
                <Printer className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="text-base font-extrabold text-ink">POS & Document Print Layout Settings</h3>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-brand text-white uppercase tracking-wider">
                    A4 & 3"x2" Tag Ready
                  </span>
                </div>
                <p className="text-xs text-muted mt-0.5">A4 job sheets, invoices, and 3"×2" sticker tags.</p>
              </div>
            </div>

            <Button
              type="button"
              onClick={() => setIsDeviceTagPrinterOpen(true)}
              className="px-4 py-2 bg-brand hover:bg-brand-deep text-white font-extrabold text-xs rounded-xl flex items-center justify-center space-x-2 shadow-sm transition-all cursor-pointer active:scale-95 shrink-0"
            >
              <Printer className="w-4 h-4" />
              <span>Interactive Print Modal</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Button>
          </div>

          {/* Formats, Branding & Text Fields — collapsible (mobile-friendly) */}
          <div className="bg-white rounded-2xl border border-line-strong shadow-2xs overflow-hidden">
            <Button
              type="button"
              onClick={() => toggleSection('pos-formats')}
              className="w-full flex items-center justify-between gap-2 px-4 py-3 bg-[#F8F9FA] hover:bg-[#F0F1F4] transition-colors cursor-pointer"
              aria-expanded={isSectionOpen('pos-formats')}
            >
              <span className="text-xs font-extrabold text-ink flex items-center space-x-2">
                <Printer className="w-4 h-4 text-brand" />
                <span>Formats, Branding & Text Fields</span>
              </span>
              <ChevronDown className={`w-4 h-4 text-muted transition-transform ${isSectionOpen('pos-formats') ? '' : 'rotate-180'}`} />
            </Button>
            {isSectionOpen('pos-formats') && (
            <div className="space-y-6 p-4">
            {/* Connected Store Branding Status Card — sourced only from Shop Settings. */}
            <div className="bg-white p-4 rounded-2xl border border-line-strong shadow-2xs flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-start space-x-3.5">
                <div className="logo-chip w-12 h-12 rounded-xl bg-surface border border-line p-1 flex items-center justify-center shrink-0 shadow-2xs">
                  {formData.shopLogoUrl ? (
                    <img
                      src={formData.shopLogoUrl}
                      alt="Shop Logo"
                      className="w-full h-full object-contain rounded-lg"
                    />
                  ) : (
                    <Store className="w-6 h-6 text-brand" />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-xs font-extrabold text-muted uppercase tracking-wider">Connected Store Branding</span>
                    <span className="rounded-full bg-emerald-50 px-1.5 py-0.5 text-xs font-extrabold text-emerald-700">Shop Settings source</span>
                  </div>
                  <p className="font-extrabold text-sm text-ink">{formData.shopName || 'AppleRepair Pro'}</p>
                  <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1.5 text-xs text-muted">
                    {visibleStorePhones.length > 0 && (
                      <span className="inline-flex items-center gap-1">
                        <Phone className="h-3 w-3 shrink-0 text-brand" />
                        <span>{visibleStorePhones.join(' • ')}</span>
                      </span>
                    )}
                    {formData.shopEmail && (
                      <span className="inline-flex items-center gap-1">
                        <Mail className="h-3 w-3 shrink-0 text-brand" />
                        <span>{formData.shopEmail}</span>
                      </span>
                    )}
                    {formData.shopWebsite && (
                      <span className="inline-flex items-center gap-1">
                        <Globe className="h-3 w-3 shrink-0 text-brand" />
                        <span>{formData.shopWebsite}</span>
                      </span>
                    )}
                    {formData.shopAddress && (
                      <span className="inline-flex min-w-0 basis-full items-center gap-1">
                        <MapPin className="h-3 w-3 shrink-0 text-brand" />
                        <span className="truncate">{formData.shopAddress}</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <Button
                type="button"
                onClick={() => setActiveSubTab('shop')}
                className="px-3 py-1.5 bg-surface hover:bg-line text-brand font-extrabold text-xs rounded-xl border border-line-strong transition-all flex items-center space-x-1 shrink-0 cursor-pointer"
              >
                <Store className="w-3.5 h-3.5" />
                <span>Edit Shop Profile</span>
              </Button>
            </div>

            {/* Standard Format Selection Cards */}
            <div className="bg-white p-5 rounded-2xl border border-line-strong shadow-2xs space-y-4">
              <div className="flex items-center justify-between">
                <label className="font-extrabold text-ink text-xs flex items-center space-x-2">
                  <FileText className="w-4 h-4 text-brand" />
                  <span>Primary Print Layout Standards</span>
                </label>
                <span className="text-xs font-bold text-muted">No thermal printer required</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {/* Option 1: A4 Document */}
                <div 
                  className="p-4 rounded-xl border-2 border-brand bg-surface transition-all relative space-y-2 shadow-2xs"
                >
                  <div className="flex items-center justify-between">
                    <div className="w-8 h-8 rounded-lg bg-brand/10 text-brand-deep flex items-center justify-center font-bold">
                      <FileText className="w-4 h-4" />
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-xs font-black bg-brand text-white uppercase">
                      Active Standard
                    </span>
                  </div>
                  <div>
                    <span className="font-extrabold text-ink block text-xs">Standard A4 Workshop Sheet</span>
                    <p className="text-xs text-muted mt-1 leading-snug">
                      Itemized job sheets, diagnostic reports, and customer tax invoices on standard A4 paper.
                    </p>
                  </div>
                  <div className="pt-1 flex items-center space-x-2 text-xs font-bold text-brand">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Full 21-Point QA & Signatures</span>
                  </div>
                </div>

                {/* Option 2: 3"x2" Sticker Tag */}
                <div 
                  onClick={() => setIsDeviceTagPrinterOpen(true)}
                  className="p-4 rounded-xl border border-line-strong bg-white hover:border-brand hover:bg-surface transition-all cursor-pointer space-y-2 group shadow-2xs"
                >
                  <div className="flex items-center justify-between">
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold group-hover:bg-brand/10 group-hover:text-brand-deep transition-all">
                      <Tag className="w-4 h-4" />
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-xs font-extrabold bg-slate-100 text-slate-700 border border-slate-200">
                      Intake Tag
                    </span>
                  </div>
                  <div>
                    <span className="font-extrabold text-ink block text-xs group-hover:text-brand transition-colors">3" × 2" Device Sticker Label</span>
                    <p className="text-xs text-[#7F7F7F] mt-1 leading-snug">
                      Compact label sticker format with QR code and barcode for physical hardware tagging.
                    </p>
                  </div>
                  <div className="pt-1 flex items-center space-x-2 text-xs font-bold text-slate-600 group-hover:text-brand">
                    <QrCode className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Scannable IMEI & QR Tracking</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Text Fields: Receipt Header & Disclaimer */}
            <div className="bg-white p-5 rounded-2xl border border-line-strong shadow-2xs space-y-4">
              <h4 className="text-xs font-black text-ink uppercase tracking-wider">
                Voucher Text & Disclaimer Customization
              </h4>
              <p className="text-xs text-muted -mt-2">
                Used by POS receipts and every A4 Device Intake Print Voucher after you save all settings.
              </p>

              <div className="grid grid-cols-1 gap-4 text-xs">
                <div className="space-y-1">
                  <label className="font-extrabold text-ink">Receipt & Voucher Header Subtitle</label>
                  <input
                    type="text"
                    value={formData.receiptHeaderTitle}
                    onChange={(e) => setFormData({ ...formData, receiptHeaderTitle: e.target.value })}
                    className="w-full bg-surface text-ink font-bold px-3.5 py-2.5 rounded-xl border border-line-strong focus:bg-white focus:outline-none focus:border-brand transition-all"
                    placeholder="e.g. Official ACMT Certified Service Voucher"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-extrabold text-ink">Receipt Footer Terms & Warranty Note</label>
                  <textarea
                    ref={receiptFooterEditorRef}
                    value={formData.receiptFooterNote}
                    onChange={(e) => handleReceiptFooterChange(e.target.value, e.currentTarget)}
                    onClick={(e) => updateSelectedFooterLines(e.currentTarget)}
                    onKeyUp={(e) => updateSelectedFooterLines(e.currentTarget)}
                    onSelect={(e) => updateSelectedFooterLines(e.currentTarget)}
                    rows={2.5}
                    className="w-full bg-surface text-ink font-bold px-3.5 py-2.5 rounded-xl border border-line-strong focus:bg-white focus:outline-none focus:border-brand transition-all"
                    placeholder="e.g. Thank you for choosing AppleRepair! All repairs covered by warranty under standard terms."
                  />
                  <p className="text-xs text-muted">Select a line, then choose alignment.</p>

                  <div className="flex flex-col gap-1.5 rounded-lg border border-line bg-[#F8F9FA] p-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-1">
                      <span className="flex items-center gap-0.5 text-xs font-extrabold text-muted">
                        <AlignLeft className="h-3 w-3" />
                        Selected line
                      </span>
                      <div className="flex rounded-md border border-line-strong bg-white p-0.5">
                        {RECEIPT_FOOTER_ALIGNMENT_OPTIONS.map(({ value, label, Icon }) => {
                          const isActive = selectedFooterAlignment === value;
                          return (
                            <Button
                              key={value}
                              type="button"
                              onMouseDown={(event) => event.preventDefault()}
                              onClick={() => applyReceiptFooterAlignment(value)}
                              style={{ height: 24, minHeight: 24, fontSize: 9, lineHeight: 1 }}
                              className={`flex h-6 items-center gap-0.5 rounded px-1.5 text-xs font-bold transition-colors ${
                                isActive ? 'bg-brand text-white' : 'text-muted hover:bg-surface'
                              }`}
                              aria-pressed={isActive}
                              title={`Align selected line(s) ${label}`}
                            >
                              <Icon className="h-2.5 w-2.5" />
                              <span>{label}</span>
                            </Button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <span className="flex items-center gap-0.5 text-xs font-extrabold text-muted">
                        <Type className="h-3 w-3" />
                        Text size
                      </span>
                      <div className="flex rounded-md border border-line-strong bg-white p-0.5">
                        {RECEIPT_FOOTER_SIZE_OPTIONS.map(({ value, label }) => {
                          const isActive = (formData.receiptFooterFontSize || 'medium') === value;
                          return (
                            <Button
                              key={value}
                              type="button"
                              onMouseDown={(event) => event.preventDefault()}
                              onClick={() => applyReceiptFooterTextSize(value)}
                              style={{ height: 24, minHeight: 24, fontSize: 9, lineHeight: 1 }}
                              className={`h-6 rounded px-1.5 text-xs font-bold transition-colors ${
                                isActive ? 'bg-brand text-white' : 'text-muted hover:bg-surface'
                              }`}
                              aria-pressed={isActive}
                            >
                              {label}
                            </Button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  <div
                    data-testid="receipt-footer-live-preview"
                    className="min-h-[72px] rounded-lg border border-dashed border-line-strong bg-white px-3 py-2.5 shadow-inner"
                  >
                    <div className="mb-1.5 flex items-center justify-between gap-2 text-xs font-extrabold uppercase tracking-wide text-muted">
                      <span>Live A4 footer preview</span>
                      <span>Updates as you edit</span>
                    </div>
                    <div className="min-h-8 text-ink">
                      {receiptFooterPreviewLines.map((line, lineIndex) => {
                        const lineStart = receiptFooterPreviewLines.slice(0, lineIndex).reduce((offset, previousLine) => offset + previousLine.length + 1, 0);
                        return (
                        <p
                          key={`${lineIndex}-${line}`}
                          className="min-h-3 leading-tight"
                          style={{
                            fontSize: receiptFooterPreviewFontSize,
                            textAlign: formData.receiptFooterLineAlignments?.[lineIndex] || formData.receiptFooterTextAlign || 'left',
                          }}
                        >
                          {line ? splitFooterTextBySize(line, lineStart, formData.receiptFooterTextSizeRanges || [], formData.receiptFooterFontSize || 'medium').map((segment, segmentIndex) => (
                            <span key={`${segmentIndex}-${segment.text}`} style={{ fontSize: ({ small: 10, medium: 11, large: 12 } as const)[segment.size] }}>{segment.text}</span>
                          )) : '\u00A0'}
                        </p>
                      ); })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
            )}
          </div>

          {/* Dedicated A4 Print Voucher & Job Sheet Defaults Block */}
          <div className="bg-white p-5 rounded-2xl border border-line-strong shadow-2xs space-y-5">
            <div>
              <h4 className="text-xs font-black text-ink uppercase tracking-wider flex items-center space-x-2">
                <Printer className="w-4 h-4 text-brand" />
                <span>A4 Intake Print Voucher & Job Sheet Defaults</span>
              </h4>
              <p className="text-xs text-muted mt-0.5">Defaults for every Device Intake Print Voucher.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-bold text-ink block">Default Print Color Palette</label>
                <select aria-label="Black & White / Grayscale (Ink-Saver)"
                  value={formData.a4PrintColorMode || 'monochrome'}
                  onChange={(e) => setFormData({ ...formData, a4PrintColorMode: e.target.value as any })}
                  className="w-full bg-surface text-ink font-bold px-3 py-2 rounded-xl border border-line-strong focus:bg-white focus:outline-none focus:border-brand"
                >
                  <option value="monochrome">Black & White / Grayscale (Ink-Saver)</option>
                  <option value="color">Standard Color</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-ink block">Default A4 Sheet Layout</label>
                <select aria-label="Standard Single A4 Page"
                  value={formData.a4PrintLayoutDensity || 'compact'}
                  onChange={(e) => setFormData({ ...formData, a4PrintLayoutDensity: e.target.value as any })}
                  className="w-full bg-surface text-ink font-bold px-3 py-2 rounded-xl border border-line-strong focus:bg-white focus:outline-none focus:border-brand"
                >
                  <option value="standard">Standard Single A4 Page</option>
                  <option value="compact">Compact Single A4 Page</option>
                  <option value="dual_voucher">Dual Cut Voucher (Cust + Shop Copy)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-ink block">Voucher Header Subtitle</label>
                <input
                  type="text"
                  value={formData.a4CustomHeaderNote || 'Official Device Intake & Hardware Diagnostic Voucher'}
                  onChange={(e) => setFormData({ ...formData, a4CustomHeaderNote: e.target.value })}
                  className="w-full bg-surface text-ink font-bold px-3 py-2 rounded-xl border border-line-strong focus:bg-white focus:outline-none focus:border-brand"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-ink block">21-Point Diagnostic Layout</label>
                <select aria-label="Before vs After Table"
                  value={formData.a4DiagnosticDisplayFormat || 'comparison_table'}
                  onChange={(e) => setFormData({ ...formData, a4DiagnosticDisplayFormat: e.target.value as SystemSettings['a4DiagnosticDisplayFormat'] })}
                  className="w-full bg-surface text-ink font-bold px-3 py-2 rounded-xl border border-line-strong focus:bg-white focus:outline-none focus:border-brand"
                >
                  <option value="comparison_table">Before vs After Table</option>
                  <option value="dual_grid">Before & After Dual Cards</option>
                  <option value="before_only">Before Repair Only</option>
                  <option value="after_only">After QA Pass Only</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <label className="flex items-center space-x-2.5 p-3 bg-[#F8F9FA] rounded-xl border border-line cursor-pointer hover:border-brand transition-all">
                <input
                  type="checkbox"
                  checked={formData.a4ShowDiagnosticsTable ?? true}
                  onChange={(e) => setFormData({ ...formData, a4ShowDiagnosticsTable: e.target.checked })}
                  className="w-4 h-4 text-brand rounded focus:ring-0 cursor-pointer"
                />
                <div>
                  <span className="font-bold text-ink text-xs block">Include 21-Point Diagnostics</span>
                  <span className="text-xs text-muted">Print pre-repair diagnostic inspection grid.</span>
                </div>
              </label>

              <label className="flex items-center space-x-2.5 p-3 bg-[#F8F9FA] rounded-xl border border-line cursor-pointer hover:border-brand transition-all">
                <input
                  type="checkbox"
                  checked={formData.a4ShowPricingTable ?? true}
                  onChange={(e) => setFormData({ ...formData, a4ShowPricingTable: e.target.checked })}
                  className="w-4 h-4 text-brand rounded focus:ring-0 cursor-pointer"
                />
                <div>
                  <span className="font-bold text-ink text-xs block">Include Service & Price Matrix</span>
                  <span className="text-xs text-muted">Print requested repair charges & subtotal.</span>
                </div>
              </label>

              <label className="flex items-center space-x-2.5 p-3 bg-[#F8F9FA] rounded-xl border border-line cursor-pointer hover:border-brand transition-all">
                <input
                  type="checkbox"
                  checked={formData.a4ShowTermsDisclaimer ?? true}
                  onChange={(e) => setFormData({ ...formData, a4ShowTermsDisclaimer: e.target.checked })}
                  className="w-4 h-4 text-brand rounded focus:ring-0 cursor-pointer"
                />
                <div>
                  <span className="font-bold text-ink text-xs block">Include Terms & Signatures</span>
                  <span className="text-xs text-muted">Print disclaimer and authorization lines.</span>
                </div>
              </label>
            </div>
          </div>
        </div>
  );
};

export default PosTab;
