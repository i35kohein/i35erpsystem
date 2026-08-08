import React from 'react';
import type { SystemSettings } from '../../../types';
import { Building2, CheckCircle2, Globe, Hash, Image as ImageIcon, Mail, Phone, Plus, Save, Store, Trash2, Upload } from 'lucide-react';
import { Button , Input } from '../../ui';

interface ShopTabProps {
  formData: SystemSettings;
  setFormData: React.Dispatch<React.SetStateAction<SystemSettings>>;
  handleSaveSettings: () => void;
}

const ShopTab: React.FC<ShopTabProps> = ({ formData, setFormData, handleSaveSettings }) => {
  return (

        <div className="space-y-6">
          {/* Shop Branding & Logo Card */}
          <div className="bg-white p-6 rounded-2xl border border-line shadow-xs space-y-6">
            <div>
              <h3 className="text-base font-extrabold text-ink flex items-center space-x-2">
                <Store className="w-5 h-5 text-brand" />
                <span>Shop Identity & Logo Settings</span>
              </h3>
              <p className="text-xs text-muted mt-1">Store name and logo — applied across the app.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
              {/* Logo Upload & Preview Box (4 cols) */}
              <div className="md:col-span-4 bg-surface p-5 rounded-2xl border border-line space-y-4 text-center">
                <label className="block text-xs font-bold text-ink">Shop Logo Preview</label>
                
                <div className="flex flex-col items-center justify-center space-y-3">
                  <div className="w-24 h-24 rounded-2xl bg-white border-2 border-dashed border-brand/40 p-2 flex items-center justify-center shadow-xs relative group overflow-hidden">
                    {formData.shopLogoUrl ? (
                      <img
                        src={formData.shopLogoUrl}
                        alt="Shop Logo Preview"
                        className="w-full h-full object-contain rounded-xl"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-muted space-y-1">
                        <ImageIcon className="w-8 h-8 text-brand/60" />
                        <span className="text-xs font-bold">No Logo Set</span>
                      </div>
                    )}
                  </div>

                  {formData.shopLogoUrl && (
                    <Button
                      type="button"
                      onClick={() => setFormData({ ...formData, shopLogoUrl: '' })}
                      className="text-xs font-bold text-red-500 hover:text-danger flex items-center space-x-1 cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Remove Logo</span>
                    </Button>
                  )}
                </div>

                {/* Upload File Input */}
                <div className="space-y-2">
                  <label className="w-full py-2.5 px-3 bg-brand hover:bg-brand-deep text-white font-bold text-xs rounded-xl transition-all shadow-2xs flex items-center justify-center space-x-2 cursor-pointer">
                    <Upload className="w-4 h-4" />
                    <span>Upload Logo Image</span>
                    <Input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            setFormData({ ...formData, shopLogoUrl: reader.result as string });
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                  </label>
                  <p className="text-xs text-muted">PNG, JPG, SVG or WEBP up to 2MB</p>
                </div>
              </div>

              {/* Logo URL & Shop Name Inputs (8 cols) */}
              <div className="md:col-span-8 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-ink mb-1.5">
                    Shop Name <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="text"
                    value={formData.shopName || ''}
                    onChange={(e) => setFormData({ ...formData, shopName: e.target.value })}
                    placeholder="e.g. AppleRepair Pro Lab"
                    className="w-full p-2.5 bg-white border border-line rounded-xl text-xs font-bold text-ink focus:outline-none focus:border-brand"
                  />
                  <p className="text-xs text-muted mt-1">
                    Appears in top sidebar brand header, repair tickets, and customer documents.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-ink mb-1.5">
                    Shop Logo Image URL (Alternative to File Upload)
                  </label>
                  <Input
                    type="text"
                    value={formData.shopLogoUrl || ''}
                    onChange={(e) => setFormData({ ...formData, shopLogoUrl: e.target.value })}
                    placeholder="https://example.com/logo.png or data:image/png..."
                    className="w-full p-2.5 bg-white border border-line rounded-xl text-xs text-ink focus:outline-none focus:border-brand"
                  />
                </div>

                {/* Quick Preset Logos */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-muted">
                    Quick Preset Icons / Badges:
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      onClick={() => setFormData({ 
                        ...formData, 
                        shopLogoUrl: 'https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?w=120&auto=format&fit=crop&q=80' 
                      })}
                      className="px-2.5 py-1 bg-surface hover:bg-line border border-line-strong rounded-lg text-xs font-bold text-ink transition-all flex items-center space-x-1.5 cursor-pointer"
                    >
                      <span> Apple Metallic Badge</span>
                    </Button>
                    <Button
                      type="button"
                      onClick={() => setFormData({ 
                        ...formData, 
                        shopLogoUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=120&auto=format&fit=crop&q=80' 
                      })}
                      className="px-2.5 py-1 bg-surface hover:bg-line border border-line-strong rounded-lg text-xs font-bold text-ink transition-all flex items-center space-x-1.5 cursor-pointer"
                    >
                      <span>⚡ Tech Circuit Chip</span>
                    </Button>
                    <Button
                      type="button"
                      onClick={() => setFormData({ 
                        ...formData, 
                        shopLogoUrl: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=120&auto=format&fit=crop&q=80' 
                      })}
                      className="px-2.5 py-1 bg-surface hover:bg-line border border-line-strong rounded-lg text-xs font-bold text-ink transition-all flex items-center space-x-1.5 cursor-pointer"
                    >
                      <span>🛡️ Cyber Lab Shield</span>
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Shop Contact & Store Location Card */}
          <div className="bg-white p-6 rounded-2xl border border-line shadow-xs space-y-4">
            <div>
              <h3 className="text-base font-extrabold text-ink flex items-center space-x-2">
                <Building2 className="w-5 h-5 text-brand" />
                <span>Store Contact & Location Information</span>
              </h3>
              <p className="text-xs text-muted mt-1">Store details shown on receipts, vouchers, SMS, invoices.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Multiple Store Phone Numbers Section */}
              <div className="sm:col-span-2 lg:col-span-3 space-y-2.5 bg-surface p-4 rounded-xl border border-line">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-extrabold text-ink flex items-center space-x-1.5">
                    <Phone className="w-3.5 h-3.5 text-success" />
                    <span>Store Contact Phone Lines (Multiple Numbers Supported)</span>
                  </label>
                  <Button
                    type="button"
                    onClick={() => {
                      const currentPhones = formData.shopPhones && formData.shopPhones.length > 0 
                        ? [...formData.shopPhones] 
                        : [formData.shopPhone || ''];
                      const updated = [...currentPhones, ''];
                      setFormData({
                        ...formData,
                        shopPhones: updated,
                        shopPhone: updated[0] || '',
                      });
                    }}
                    className="px-2.5 py-1 bg-brand hover:bg-brand-deep text-white font-extrabold text-xs rounded-lg transition-all flex items-center space-x-1 cursor-pointer shrink-0"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Contact Phone Number</span>
                  </Button>
                </div>

                <div className="space-y-2">
                  {((formData.shopPhones && formData.shopPhones.length > 0) 
                    ? formData.shopPhones 
                    : [formData.shopPhone || '']
                  ).map((phoneNum, idx) => (
                    <div key={idx} className="flex items-center space-x-2">
                      <span className="text-xs font-extrabold font-mono text-muted w-20 shrink-0">
                        {idx === 0 ? 'Primary Line:' : `Line #${idx + 1}:`}
                      </span>
                      <Input
                        type="text"
                        value={phoneNum}
                        onChange={(e) => {
                          const currentPhones = formData.shopPhones && formData.shopPhones.length > 0 
                            ? [...formData.shopPhones] 
                            : [formData.shopPhone || ''];
                          currentPhones[idx] = e.target.value;
                          setFormData({
                            ...formData,
                            shopPhones: currentPhones,
                            shopPhone: currentPhones[0] || '',
                          });
                        }}
                        placeholder={idx === 0 ? "+95 9 790 000 000 (Primary Customer Service)" : "+95 9 440 000 000 (Hotline / Viber / WhatsApp)"}
                        className="flex-1 p-2.5 bg-white border border-line rounded-xl text-xs font-bold text-ink focus:outline-none focus:border-brand"
                      />
                      {((formData.shopPhones?.length || 1) > 1) && (
                        <Button
                          type="button"
                          onClick={() => {
                            const currentPhones = formData.shopPhones && formData.shopPhones.length > 0 
                              ? [...formData.shopPhones] 
                              : [formData.shopPhone || ''];
                            currentPhones.splice(idx, 1);
                            setFormData({
                              ...formData,
                              shopPhones: currentPhones,
                              shopPhone: currentPhones[0] || '',
                            });
                          }}
                          className="p-2 text-muted hover:text-danger hover:bg-danger/10 rounded-lg transition-all cursor-pointer"
                          title="Remove Phone Line"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted">Primary phone is the main contact; extras show on prints.</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-ink mb-1 flex items-center space-x-1">
                  <Mail className="w-3.5 h-3.5 text-brand" />
                  <span>Shop Support Email Address</span>
                </label>
                <Input
                  type="email"
                  value={formData.shopEmail || ''}
                  onChange={(e) => setFormData({ ...formData, shopEmail: e.target.value })}
                  placeholder="support@applerepairpro.com"
                  className="w-full p-2.5 bg-white border border-line rounded-xl text-xs text-ink focus:outline-none focus:border-brand"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-ink mb-1 flex items-center space-x-1">
                  <Globe className="w-3.5 h-3.5 text-brand" />
                  <span>Shop Official Website URL</span>
                </label>
                <Input
                  type="text"
                  value={formData.shopWebsite || ''}
                  onChange={(e) => setFormData({ ...formData, shopWebsite: e.target.value })}
                  placeholder="www.applerepairpro.com"
                  className="w-full p-2.5 bg-white border border-line rounded-xl text-xs text-ink focus:outline-none focus:border-brand"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-ink mb-1 flex items-center space-x-1">
                  <Hash className="w-3.5 h-3.5 text-brand" />
                  <span>Tax ID / Business Reg No</span>
                </label>
                <Input
                  type="text"
                  value={formData.taxId || ''}
                  onChange={(e) => setFormData({ ...formData, taxId: e.target.value })}
                  placeholder="MMK-TAX-90210"
                  className="w-full p-2.5 bg-white border border-line rounded-xl text-xs text-ink focus:outline-none focus:border-brand"
                />
              </div>

              <div className="sm:col-span-2 lg:col-span-3">
                <label className="block text-xs font-bold text-ink mb-1 flex items-center space-x-1">
                  <Building2 className="w-3.5 h-3.5 text-brand" />
                  <span>Store Physical Address</span>
                </label>
                <Input
                  type="text"
                  value={formData.shopAddress || ''}
                  onChange={(e) => setFormData({ ...formData, shopAddress: e.target.value })}
                  placeholder="No. 123 Sule Pagoda Road, Downtown Tech Plaza, Yangon"
                  className="w-full p-2.5 bg-white border border-line rounded-xl text-xs text-ink focus:outline-none focus:border-brand"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-ink mb-1">
                Shop Business Info & Operating Hours / Disclaimer Note
              </label>
              <textarea
                rows={3}
                value={formData.shopInfo || ''}
                onChange={(e) => setFormData({ ...formData, shopInfo: e.target.value })}
                placeholder="Authorized Apple Hardware Repair Center. Open Mon-Sat 9:00 AM - 6:30 PM."
                className="w-full p-2.5 bg-white border border-line rounded-xl text-xs text-ink focus:outline-none focus:border-brand"
              />
            </div>
          </div>

          {/* Live ERP Preview Banner */}
          <div className="bg-surface p-5 rounded-2xl border border-line space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase text-brand tracking-widest flex items-center space-x-1.5">
                <CheckCircle2 className="w-4 h-4 text-success" />
                <span>Live Navigation & Header Preview</span>
              </span>
              <span className="text-xs font-bold text-muted">Synced with active settings</span>
            </div>

            <div className="p-4 bg-white rounded-xl border border-line flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {formData.shopLogoUrl ? (
                  <img
                    src={formData.shopLogoUrl}
                    alt="Logo"
                    className="logo-chip w-9 h-9 rounded-xl object-contain bg-white border border-line p-0.5 shrink-0"
                  />
                ) : (
                  <div className="w-9 h-9 rounded-xl bg-brand flex items-center justify-center text-white shrink-0 font-bold text-sm">
                    
                  </div>
                )}
                <div>
                  <h4 className="font-extrabold text-sm text-ink">
                    {formData.shopName || 'AppleRepair Pro'}
                  </h4>
                  <p className="text-xs text-muted font-medium">
                    {formData.shopPhone} • {formData.shopAddress}
                  </p>
                </div>
              </div>

              <Button
                type="button"
                onClick={handleSaveSettings}
                className="bg-brand hover:bg-brand-deep text-white flex items-center space-x-1.5"
              >
                <Save className="w-4 h-4" />
                <span>Save Shop Settings</span>
              </Button>
            </div>
          </div>
        </div>
  );
};

export default ShopTab;
