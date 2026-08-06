import React from 'react';
import { Check, Circle, Palette, Square } from 'lucide-react';
import { useTheme, THEME_PRESETS } from '../../../context/ThemeContext';
import { useLanguage } from '../../../context/LanguageContext';
import { LanguageSwitcher } from '../../common/LanguageSwitcher';
import { Button } from '../../ui';

interface ThemeTabProps {}

const ThemeTab: React.FC<ThemeTabProps> = ({  }) => {
  const { theme, setTheme, geometry, setGeometry } = useTheme();
  const { language, setLanguage } = useLanguage();
  return (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-line shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-extrabold text-[#2C3E50] flex items-center space-x-2">
                  <Palette className="w-5 h-5 text-[#27B1AE]" />
                  <span>Application Visual Theme & Typography</span>
                </h3>
                <p className="text-xs text-[#7F7F7F] mt-1">
                  Choose your shop's visual theme and color palette. All modules, navigation bars, badges, and controls will update instantly.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-2">
              {THEME_PRESETS.map((preset) => {
                const isSelected = theme === preset.id;
                return (
                  <div
                    key={preset.id}
                    onClick={() => setTheme(preset.id)}
                    className={`p-5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between space-y-4 ${
                      isSelected
                        ? 'border-[#27B1AE] bg-[#F8FBFD] shadow-md ring-2 ring-[#27B1AE]/20'
                        : 'border-line bg-white hover:border-[#136F9A]/40 shadow-xs'
                    }`}
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black px-2.5 py-1 rounded-lg bg-[#2C3E50] text-white">
                          {preset.fontName}
                        </span>
                        {isSelected ? (
                          <span className="flex items-center space-x-1 text-xs font-extrabold text-[#27B1AE]">
                            <Check className="w-4 h-4" />
                            <span>Active Theme</span>
                          </span>
                        ) : (
                          <span className="text-xs font-bold text-[#7F7F7F]">Click to apply</span>
                        )}
                      </div>

                      <div>
                        <h4 className="text-sm font-black text-[#2C3E50]">{preset.name}</h4>
                        <p className="text-xs text-[#7F7F7F] mt-1 leading-relaxed">{preset.description}</p>
                      </div>

                      {/* Swatch Preview Grid */}
                      <div className="pt-2 space-y-2">
                        <span className="text-xs font-extrabold text-[#7F7F7F] uppercase tracking-wider block">Palette Colors</span>
                        <div className="grid grid-cols-4 gap-2">
                          <div className="space-y-1 text-center">
                            <div className="h-9 rounded-xl border border-black/10 shadow-2xs flex items-center justify-center text-xs font-bold text-white" style={{ backgroundColor: preset.colors.primary }}>
                              Blue
                            </div>
                            <span className="text-xs font-mono text-[#7F7F7F] block">{preset.colors.primary}</span>
                          </div>

                          <div className="space-y-1 text-center">
                            <div className="h-9 rounded-xl border border-black/10 shadow-2xs flex items-center justify-center text-xs font-bold text-white" style={{ backgroundColor: preset.colors.secondary }}>
                              Turquoise
                            </div>
                            <span className="text-xs font-mono text-[#7F7F7F] block">{preset.colors.secondary}</span>
                          </div>

                          <div className="space-y-1 text-center">
                            <div className="h-9 rounded-xl border border-black/10 shadow-2xs flex items-center justify-center text-xs font-bold text-white" style={{ backgroundColor: preset.colors.orange }}>
                              Orange
                            </div>
                            <span className="text-xs font-mono text-[#7F7F7F] block">{preset.colors.orange}</span>
                          </div>

                          <div className="space-y-1 text-center">
                            <div className="h-9 rounded-xl border border-black/10 shadow-2xs flex items-center justify-center text-xs font-bold text-white" style={{ backgroundColor: preset.colors.darkBlue }}>
                              Navy
                            </div>
                            <span className="text-xs font-mono text-[#7F7F7F] block">{preset.colors.darkBlue}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <Button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setTheme(preset.id);
                      }}
                      className={`w-full py-2.5 ${
                        isSelected
                          ? 'bg-[#27B1AE] text-white shadow-xs'
                          : 'bg-[#2C3E50] hover:bg-[#136F9A] text-white'
                      }`}
                    >
                      {isSelected ? 'Currently Selected' : `Activate ${preset.name}`}
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Component Geometry & Design System Architecture Card */}
          <div className="bg-white p-6 rounded-2xl border border-line shadow-xs space-y-4">
            <div>
              <h3 className="text-base font-extrabold text-[#2C3E50] flex items-center space-x-2">
                <Square className="w-5 h-5 text-brand" />
                <span>Component Geometry & Design System Architecture</span>
              </h3>
              <p className="text-xs text-[#7F7F7F] mt-1">
                Choose between a high-density Square / Rectangular Design System or a Soft Curved Geometry for all UI elements, cards, inputs, buttons, and tables.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
              <div
                onClick={() => setGeometry('square')}
                className={`p-5 rounded-none border-2 transition-all cursor-pointer flex flex-col justify-between space-y-3 ${
                  geometry === 'square'
                    ? 'border-brand bg-brand-soft ring-2 ring-brand/20 shadow-xs'
                    : 'border-line bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Square className="w-5 h-5 text-brand" />
                    <span className="font-extrabold text-sm text-[#2C3E50]">Square / Rectangular Design System</span>
                  </div>
                  {geometry === 'square' && (
                    <span className="text-xs font-black px-2.5 py-0.5 bg-brand text-white rounded-none">Active</span>
                  )}
                </div>
                <p className="text-xs text-[#526375] leading-relaxed">
                  Crisp 0px sharp rectangular borders for high-density engineering, maximum screen utilization, and modern structural architecture across all ERP modules.
                </p>
              </div>

              <div
                onClick={() => setGeometry('curved')}
                className={`p-5 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between space-y-3 ${
                  geometry === 'curved'
                    ? 'border-brand bg-brand-soft ring-2 ring-brand/20 shadow-xs'
                    : 'border-line bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Circle className="w-5 h-5 text-success" />
                    <span className="font-extrabold text-sm text-[#2C3E50]">Curved Soft Geometry</span>
                  </div>
                  {geometry === 'curved' && (
                    <span className="text-xs font-black px-2.5 py-0.5 bg-success text-white rounded-full">Active</span>
                  )}
                </div>
                <p className="text-xs text-[#526375] leading-relaxed">
                  Classic soft 12px-24px rounded corners and pill buttons for a smooth, relaxed interface appearance.
                </p>
              </div>
            </div>
          </div>

          {/* Language Selection Card */}
          <div className="bg-white p-6 rounded-2xl border border-line shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-extrabold text-[#2C3E50] flex items-center space-x-2">
                  <span className="text-xl">🇲🇲</span>
                  <span>System Language & Localization</span>
                </h3>
                <p className="text-xs text-[#7F7F7F] mt-1">
                  Select your preferred system interface language. Supports English and Burmese (မြန်မာဘာသာ). UI defaults to English; Burmese is used for customer-facing messages.
                </p>
              </div>
              <LanguageSwitcher variant="pills" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div
                onClick={() => setLanguage('en')}
                className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex items-center justify-between ${
                  language === 'en'
                    ? 'border-brand bg-brand-soft ring-2 ring-brand/20'
                    : 'border-line bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">🇺🇸</span>
                  <div>
                    <h4 className="text-sm font-extrabold text-ink">English (US)</h4>
                    <p className="text-xs text-muted">Standard English interface for ERP & Work Orders</p>
                  </div>
                </div>
                {language === 'en' && <Check className="w-5 h-5 text-brand" />}
              </div>

              <div
                onClick={() => setLanguage('mm')}
                className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex items-center justify-between ${
                  language === 'mm'
                    ? 'border-brand bg-brand-soft ring-2 ring-brand/20'
                    : 'border-line bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">🇲🇲</span>
                  <div>
                    <h4 className="text-sm font-extrabold text-ink">မြန်မာစာ (Myanmar / Burmese)</h4>
                    <p className="text-xs text-muted">ပြုပြင်ရေး ERP စနစ်တစ်ခုလုံး မြန်မာဘာသာဖြင့် သုံးစွဲရန်</p>
                  </div>
                </div>
                {language === 'mm' && <Check className="w-5 h-5 text-brand" />}
              </div>
            </div>
          </div>

        </div>
  );
};

export default ThemeTab;
