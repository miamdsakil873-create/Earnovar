import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import { TaskItem } from '../types.ts';
import { api } from '../services/api.ts';
import { useAuth } from '../context/AuthContext.tsx';
import {
  X,
  CheckCircle2,
  Clock,
  Coins,
  Sparkles,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  Check,
} from 'lucide-react';

interface TaskModalProps {
  task: TaskItem | null;
  onClose: () => void;
  onSuccess: (message: string) => void;
}

export const TaskModal: React.FC<TaskModalProps> = ({
  task,
  onClose,
  onSuccess,
}) => {
  const { updateUserLocally } = useAuth();
  const [visitedLink, setVisitedLink] = useState<boolean>(false);
  const [proofNote, setProofNote] = useState<string>('');
  const [claiming, setClaiming] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!task) return null;

  const taskUrl = (task as any).taskUrl || (task as any).url || 'https://rb.gy/omtj8b';
  // Reward capped at max ৳10
  const reward = Math.min(10, Math.max(1, Number(task.rewardAmount) || 5));

  const handleOpenTaskUrl = () => {
    try {
      window.open(taskUrl, '_blank', 'noopener,noreferrer');
      setVisitedLink(true);
    } catch (e) {
      console.warn('Failed to open task url:', e);
    }
  };

  const handleAutoClaim = async () => {
    if (claiming) return;
    setClaiming(true);
    setError(null);

    try {
      // Auto-credit reward directly to user balance
      const res = await api.completeTask(task.id, reward, task.title);
      if (res.success) {
        if (res.newBalance !== undefined) {
          updateUserLocally((prev) => ({
            ...prev,
            balance: res.newBalance!,
            totalEarned: (prev.totalEarned || 0) + (res.rewardAmount || reward),
          }));
        }

        confetti({
          particleCount: 80,
          spread: 60,
          origin: { y: 0.6 },
        });

        onSuccess(res.message || `🎉 অভিনন্দন! টাস্ক সম্পন্ন হয়েছে এবং ৳${reward.toFixed(2)} ওয়ালেটে যোগ হয়েছে!`);
        onClose();
      } else {
        setError(res.message || 'টাস্ক সম্পন্ন হতে সমস্যা হয়েছে।');
      }
    } catch (err: any) {
      setError(err.message || 'টাস্ক সম্পন্ন হতে ব্যর্থ হয়েছে।');
    } finally {
      setClaiming(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl flex flex-col text-slate-100 max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-950/70">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              {task.category} টাস্ক
            </span>
            <span className="text-[10px] text-amber-400 font-bold flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-400" />
              ইনস্ট্যান্ট ব্যালেন্স
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 sm:p-5 overflow-y-auto space-y-4">
          {/* Title & Description */}
          <div className="space-y-1.5">
            <h3 className="font-extrabold text-base text-white leading-snug">
              {task.title}
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              {task.description}
            </p>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="p-3 rounded-2xl bg-slate-950 border border-emerald-500/30 flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                <Coins className="w-4 h-4 text-emerald-400" />
              </div>
              <div>
                <p className="text-[10px] text-slate-400 font-medium">নিশ্চিত পুরস্কার</p>
                <p className="text-base font-black text-emerald-400 font-mono">+৳{reward.toFixed(2)}</p>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-slate-950 border border-amber-500/30 flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
                <Clock className="w-4 h-4 text-amber-400" />
              </div>
              <div>
                <p className="text-[10px] text-slate-400 font-medium">সময় লাগবে</p>
                <p className="text-sm font-bold text-amber-300 font-mono">~{task.estimatedMinutes || 1} মিনিট</p>
              </div>
            </div>
          </div>

          {/* Action Step 1: Visit Link */}
          <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-4 h-4 rounded-full bg-blue-500/30 text-blue-300 text-[10px] flex items-center justify-center font-bold">1</span>
                <span>স্পনসর সাইট বা লিংকে প্রবেশ করুন:</span>
              </span>
              {visitedLink && (
                <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1 bg-emerald-500/10 px-2 py-0.5 rounded-md">
                  <Check className="w-3 h-3" /> ভিজিট সম্পন্ন
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={handleOpenTaskUrl}
              className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:brightness-110 active:scale-95 text-white font-bold text-xs flex items-center justify-center gap-2 transition shadow-md shadow-blue-500/20 cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>টাস্কের লিঙ্কে প্রবেশ করুন (Open Task Link)</span>
            </button>
            <p className="text-[10px] text-slate-400 text-center">
              লিংকে ক্লিক করে বিজ্ঞাপন বা সাইটটি ব্রাউজ করুন।
            </p>
          </div>

          {/* Action Step 2: Auto-Credit Reward */}
          <div className="space-y-3 pt-1">
            <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 font-medium bg-emerald-500/10 p-2.5 rounded-xl border border-emerald-500/20">
              <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>অটোমেটিক ব্যালেন্স যোগ হবে — কোনো অপেক্ষা বা পর্যালোচনার প্রয়োজন নেই।</span>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="button"
              onClick={handleAutoClaim}
              disabled={claiming}
              className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:brightness-110 active:scale-95 text-slate-950 font-black text-xs uppercase tracking-wider transition shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {claiming ? (
                <>
                  <span className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  <span>ব্যালেন্স যোগ হচ্ছে...</span>
                </>
              ) : (
                <>
                  <Coins className="w-4 h-4 fill-current" />
                  <span>টাস্ক সম্পন্ন হয়েছে — ৳{reward.toFixed(2)} ব্যালেন্স নিন</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
