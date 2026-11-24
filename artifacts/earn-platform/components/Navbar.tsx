import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { useLanguage, LANGUAGE_OPTIONS } from '../context/LanguageContext.tsx';
import { Sparkles, Gift, Wallet, Globe, Check, X } from 'lucide-react';

interface NavbarProps {
  onOpenDailyBonus: () => void;
  onNavigateToWallet: () => void;
  hasClaimedDaily: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenDailyBonus,
  onNavigateToWallet,
  hasClaimedDaily,
}) => {
  const { user } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const [langModalOpen, setLangModalOpen] = useState(false);

  const currentLang = LANGUAGE_OPTIONS.find((l) => l.code === language) || LANGUAGE_OPTIONS[0];

  return (
    <header className="sticky top-0 z-30 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 text-white px-4 py-3 select-none">
      <div className="max-w-md mx-auto flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500 via-teal-400 to-cyan-400 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <Sparkles className="w-5 h-5 text-slate-950 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-emerald-400 via-teal-300 to-amber-300 bg-clip-text text-transparent">
                Earnova
              </span>
              <span className="text-[9px] uppercase font-black tracking-wider px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                OFFICIAL
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-medium">
              {t('verifiedEarning')}
            </p>
          </div>
        </div>

        {/* Right Action Chips */}
        <div className="flex items-center gap-2">
          {/* Language Selector Button */}
          <button
            onClick={() => setLangModalOpen(true)}
            className="flex items-center gap-1 px-2 py-1.5 rounded-xl bg-slate-800/90 hover:bg-slate-700/80 border border-slate-700 text-slate-200 text-xs font-medium transition active:scale-95"
            title="Change Language"
          >
            <span className="text-sm">{currentLang.flag}</span>
            <span className="text-[11px] font-bold uppercase">{currentLang.code}</span>
          </button>

          {user && (
            <>
              {/* Daily Bonus Button */}
              <button
                onClick={onOpenDailyBonus}
                className={`relative flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all active:scale-95 ${
                  hasClaimedDaily
                    ? 'bg-slate-800/80 text-slate-400 border border-slate-700/60'
                    : 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-bold shadow-md shadow-amber-500/20 animate-pulse'
                }`}
                title={hasClaimedDaily ? t('claimed') : t('bonus')}
              >
                <Gift className="w-3.5 h-3.5" />
                <span>{hasClaimedDaily ? t('claimed') : t('bonus')}</span>
                {!hasClaimedDaily && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-slate-900" />
                )}
              </button>

              {/* Quick Balance Chip */}
              <button
                onClick={onNavigateToWallet}
                className="flex items-center gap-1.5 bg-slate-800/90 hover:bg-slate-700/80 border border-emerald-500/30 text-emerald-400 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all active:scale-95 shadow-sm"
              >
                <Wallet className="w-3.5 h-3.5 text-emerald-400" />
                <span>৳{user.balance.toFixed(2)}</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Language Selection Modal */}
      {langModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-xs overflow-hidden shadow-2xl text-slate-100">
            <div className="flex items-center justify-between p-3.5 border-b border-slate-800 bg-slate-950">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-emerald-400" />
                <h3 className="text-xs font-bold text-white">{t('selectLanguage')}</h3>
              </div>
              <button
                onClick={() => setLangModalOpen(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 space-y-1.5 max-h-72 overflow-y-auto no-scrollbar">
              {LANGUAGE_OPTIONS.map((opt) => (
                <button
                  key={opt.code}
                  onClick={() => {
                    setLanguage(opt.code);
                    setLangModalOpen(false);
                  }}
                  className={`w-full p-2.5 rounded-xl flex items-center justify-between text-xs transition ${
                    language === opt.code
                      ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-bold'
                      : 'hover:bg-slate-800 text-slate-300 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-base">{opt.flag}</span>
                    <span>{opt.label}</span>
                  </div>
                  {language === opt.code && <Check className="w-4 h-4 text-emerald-400" />}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
