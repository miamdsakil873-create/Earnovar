import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import { api } from '../services/api.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { useLanguage } from '../context/LanguageContext.tsx';
import { X, Gift, Sparkles, CheckCircle2, AlertCircle } from 'lucide-react';

interface DailyBonusModalProps {
  isOpen: boolean;
  onClose: () => void;
  hasClaimed: boolean;
  onSuccess: (amount: number, message: string) => void;
}

export const DailyBonusModal: React.FC<DailyBonusModalProps> = ({
  isOpen,
  onClose,
  hasClaimed,
  onSuccess,
}) => {
  const { updateUserLocally } = useAuth();
  const { t } = useLanguage();
  const [claiming, setClaiming] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleClaim = async () => {
    if (hasClaimed || claiming) return;

    setClaiming(true);
    setError(null);

    try {
      const res = await api.claimDailyBonus();
      if (res.success) {
        if (res.newBalance !== undefined) {
          updateUserLocally((prev) => ({
            ...prev,
            balance: res.newBalance!,
            totalEarned: prev.totalEarned + res.amount,
          }));
        }

        confetti({
          particleCount: 80,
          spread: 60,
          origin: { y: 0.6 },
        });

        onSuccess(res.amount, res.message);
        onClose();
      }
    } catch (err: any) {
      setError(err.message || 'Daily bonus claim failed.');
    } finally {
      setClaiming(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl flex flex-col text-slate-100 p-5 text-center relative">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Gift Icon Hero */}
        <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-400 flex items-center justify-center shadow-lg shadow-amber-500/30">
          <Gift className="w-9 h-9 text-slate-950" />
        </div>

        <h3 className="text-lg font-bold text-white mb-1">
          {hasClaimed ? t('claimed') : t('dailyBonusTitle')}
        </h3>

        <p className="text-xs text-slate-300 mb-4 max-w-xs mx-auto leading-relaxed">
          {hasClaimed
            ? 'You have already claimed your daily bonus today. Please check back tomorrow!'
            : t('dailyBonusDesc')}
        </p>

        {error && (
          <div className="p-2.5 mb-3 rounded-xl bg-red-500/15 border border-red-500/30 text-red-300 text-xs flex items-center gap-2 text-left">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        <button
          onClick={handleClaim}
          disabled={hasClaimed || claiming}
          className={`w-full py-3 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all duration-200 active:scale-95 shadow-lg ${
            !hasClaimed && !claiming
              ? 'bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-slate-950 shadow-amber-500/25 hover:brightness-110 cursor-pointer'
              : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/60'
          }`}
        >
          {claiming ? (
            <>
              <span className="w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
              <span>Depositing bonus...</span>
            </>
          ) : hasClaimed ? (
            <>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>{t('claimed')}</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              <span>{t('dailyBonusClaimBtn')} (+৳৫.০০)</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
