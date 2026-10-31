import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import { api } from '../services/api.ts';
import { useAuth } from '../context/AuthContext.tsx';
import {
  X,
  Gift,
  Ticket,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
} from 'lucide-react';

interface VoucherModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (msg: string) => void;
}

export const VoucherModal: React.FC<VoucherModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { updateUserLocally } = useAuth();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleRedeem = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = code.trim().toUpperCase();
    if (!cleanCode || loading) return;

    setLoading(true);
    setError(null);

    try {
      const res = await api.redeemVoucher(cleanCode);
      if (res.success) {
        if (res.newBalance !== undefined) {
          updateUserLocally((prev) => ({
            ...prev,
            balance: res.newBalance!,
            totalEarned: (prev.totalEarned || 0) + (res.amount || 0),
          }));
        }

        confetti({
          particleCount: 90,
          spread: 70,
          origin: { y: 0.6 },
        });

        onSuccess(res.message || 'ভাউচার কোড সফলভাবে রিডিম হয়েছে!');
        setCode('');
        onClose();
      } else {
        setError(res.message || 'ভাউচার কোড সঠিক নয়।');
      }
    } catch (err: any) {
      setError(err.message || 'ভাউচার কোড রিডিম করতে ব্যর্থ হয়েছে।');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl text-slate-100 animate-in zoom-in-95 duration-200">
        {/* Top Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-950/50">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 text-slate-950 shadow-md">
              <Ticket className="w-4 h-4 fill-current" />
            </span>
            <div>
              <h3 className="font-black text-sm text-white">রিডিম / ভাউচার কোড</h3>
              <p className="text-[11px] text-amber-300 font-medium">ইনস্ট্যান্ট ক্যাশ ব্যালেন্স পান</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleRedeem} className="p-5 space-y-4">
          <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200/90 leading-relaxed flex items-start gap-2.5">
            <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <span>অ্যাডমিনের টেলিগ্রাম চ্যানেল বা অফিশিয়াল গ্রুপে দেওয়া রিডিম কোড দিয়ে সাথে সাথে ব্যালেন্স যোগ করুন।</span>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">
              আপনার ভাউচার কোডটি লিখুন:
            </label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="যেমন: EARNOVA50 বা BONUS20"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-center text-base text-amber-400 font-mono font-bold tracking-widest uppercase focus:outline-none focus:border-amber-500 transition shadow-inner"
              autoFocus
              required
            />
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !code.trim()}
            className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:brightness-110 active:scale-95 text-slate-950 font-black text-xs uppercase tracking-wider transition shadow-lg shadow-amber-500/25 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <span>যাচাই হচ্ছে...</span>
            ) : (
              <>
                <Gift className="w-4 h-4 fill-current" />
                <span>রিডিম করুন ও ব্যালেন্স নিন</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
