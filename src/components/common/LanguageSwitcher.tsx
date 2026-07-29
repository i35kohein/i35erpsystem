import React from 'react';
import { Languages, Check } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

interface LanguageSwitcherProps {
  variant?: 'pills' | 'dropdown' | 'compact';
  className?: string;
}

export const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({
  variant = 'pills',
  className = '',
}) => {
  const { language, setLanguage, t } = useLanguage();

  if (variant === 'compact') {
    return (
      <div className={`flex items-center bg-[#F5F5F7] p-1 rounded-xl border border-[#E5E5EA] ${className}`}>
        <button
          type="button"
          onClick={() => setLanguage('en')}
          className={`px-2 py-1 rounded-lg text-[11px] font-extrabold transition-all cursor-pointer ${
            language === 'en'
              ? 'bg-[#0071E3] text-white shadow-xs'
              : 'text-[#1D1D1F] hover:bg-slate-200/60'
          }`}
          title="English"
        >
          EN
        </button>
        <button
          type="button"
          onClick={() => setLanguage('mm')}
          className={`px-2 py-1 rounded-lg text-[11px] font-extrabold transition-all cursor-pointer ${
            language === 'mm'
              ? 'bg-[#0071E3] text-white shadow-xs'
              : 'text-[#1D1D1F] hover:bg-slate-200/60'
          }`}
          title="မြန်မာဘာသာ"
        >
          မြန်မာ
        </button>
      </div>
    );
  }

  return (
    <div className={`flex items-center space-x-1 bg-slate-100 p-1 rounded-xl border border-slate-200/80 ${className}`}>
      <div className="flex items-center px-2 py-0.5 text-slate-500 font-bold text-[10px] space-x-1">
        <Languages className="w-3.5 h-3.5 text-[#0071E3]" />
      </div>
      <button
        type="button"
        onClick={() => setLanguage('en')}
        className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
          language === 'en'
            ? 'bg-white text-[#0071E3] shadow-xs border border-[#E5E5EA]'
            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
        }`}
      >
        <span>🇺🇸 EN</span>
      </button>
      <button
        type="button"
        onClick={() => setLanguage('mm')}
        className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
          language === 'mm'
            ? 'bg-white text-[#0071E3] shadow-xs border border-[#E5E5EA]'
            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
        }`}
      >
        <span>🇲🇲 မြန်မာ</span>
      </button>
    </div>
  );
};
