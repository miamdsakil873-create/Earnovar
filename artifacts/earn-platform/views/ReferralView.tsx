import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { api } from '../services/api.ts';
import {
  Users,
  Copy,
  Check,
  Share2,
  Gift,
  Coins,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';

import { firebaseSettings } from '../services/firebaseService.ts';
import { SiteSettings } from '../types.ts';

interface ReferralViewProps {
  onSuccessToast: (msg: string) => void;
}

export const ReferralView: React.FC<ReferralViewProps> = ({ onSuccessToast }) => {
  const { user } = useAuth();
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .getReferralStats()
      .then((res) => {
        if (res.success) setStats(res);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));

    const unsub = firebaseSettings.subscribe((s) => {
      if (s) setSettings(s);
    });
    return () => unsub();
  }, []);

  const referralCode = user?.referralCode || stats?.referralCode || 'EARN123';
  const referralUrl = `${window.location.origin}/?ref=${referralCode}`;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(referralCode);
    setCopiedCode(true);
    onSuccessToast('রেফার কোড কপি করা হয়েছে!');
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(referralUrl);
    setCopiedLink(true);
    onSuccessToast('রেফারেল লিঙ্ক কপি করা হয়েছে!');
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const shareMessage = `🎁 Join Earnova & Get an Instant Welcome Bonus!\n\nWatch short videos, complete quick jobs, and withdraw real money directly to bKash, Nagad, USDT Crypto, Binance, or PayPal.\n\n🔥 Use my Invite Code: ${referralCode}\n👉 Claim bonus here: ${referralUrl}`;

  const handleWhatsAppShare = () => {
    const text = encodeURIComponent(shareMessage);
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  const handleTelegramShare = () => {
    const text = encodeURIComponent(shareMessage);
    window.open(`https://t.me/share/url?url=${encodeURIComponent(referralUrl)}&text=${text}`, '_blank');
  };

  return (
    <div className="space-y-4 pb-20">
      {/* Hero Banner */}
      <div className="p-5 rounded-3xl bg-gradient-to-br from-purple-600 via-indigo-700 to-slate-900 border border-purple-500/30 text-white shadow-xl relative overflow-hidden">
        <div className="absolute -right-8 -top-8 w-36 h-36 rounded-full bg-purple-400/20 blur-2xl pointer-events-none" />

        <div className="relative z-10 space-y-3">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-xl bg-purple-500/30 text-purple-200 border border-purple-400/30">
              <Users className="w-4 h-4" />
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-purple-200">
              রেফারেল রিওয়ার্ড প্রোগ্রাম
            </span>
          </div>

          <div>
            <h2 className="text-xl font-black text-white leading-tight">
              বন্ধুদের ইনভাইট করুন, <br />
              <span className="text-amber-300">আজীবন {settings?.referralCommissionPercent ?? 10}% কমিশন পান!</span>
            </h2>
            <p className="text-xs text-purple-100/80 mt-1">
              প্রতি রেফারে তাৎক্ষণিক ৳{(settings?.referralDirectBonus ?? 10).toFixed(2)} বোনাস + বন্ধু যত কাজ বা ভিডিও দেখবে তার {settings?.referralCommissionPercent ?? 10}% লাইফটাইম কমিশন।
            </p>
          </div>
        </div>
      </div>

      {/* Referral Link & Code Box */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
        <h3 className="text-xs font-bold text-slate-300">আপনার ইউনিক রেফারেল কোড ও লিঙ্ক</h3>

        {/* Code Box */}
        <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-700">
          <div>
            <p className="text-[10px] text-slate-400 uppercase font-semibold">রেফারেল কোড</p>
            <p className="font-mono font-black text-base text-emerald-400 tracking-wider">
              {referralCode}
            </p>
          </div>
          <button
            onClick={handleCopyCode}
            className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold flex items-center gap-1.5 transition active:scale-95"
          >
            {copiedCode ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedCode ? 'কপি হয়েছে' : 'কোড কপি'}</span>
          </button>
        </div>

        {/* Link Box */}
        <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-700">
          <div className="truncate mr-2">
            <p className="text-[10px] text-slate-400 uppercase font-semibold">রেফারেল লিঙ্ক</p>
            <p className="font-mono text-xs text-slate-300 truncate">
              {referralUrl}
            </p>
          </div>
          <button
            onClick={handleCopyLink}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold flex items-center gap-1.5 shrink-0 transition active:scale-95 border border-slate-600"
          >
            {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedLink ? 'কপি হয়েছে' : 'লিঙ্ক কপি'}</span>
          </button>
        </div>

        {/* Social Share Buttons */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            onClick={handleWhatsAppShare}
            className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 active:scale-95 transition"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>হোয়াটসঅ্যাপে শেয়ার</span>
          </button>
          <button
            onClick={handleTelegramShare}
            className="py-2.5 px-3 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs flex items-center justify-center gap-2 active:scale-95 transition"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>টেলিগ্রামে শেয়ার</span>
          </button>
        </div>
      </div>

      {/* Referral Stats Cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">মোট রেফার</span>
            <Users className="w-4 h-4 text-purple-400" />
          </div>
          <p className="text-xl font-black text-white font-mono">
            {stats?.totalReferrals || 0} জন
          </p>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">রেফারেল বোনাস আয়</span>
            <Coins className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-xl font-black text-emerald-400 font-mono">
            ৳{stats?.totalBonusEarned?.toFixed(2) || '0.00'}
          </p>
        </div>
      </div>

      {/* Qualification & Referral Rules */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
        <h4 className="font-bold text-xs text-slate-200 uppercase tracking-wider flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span>রেফারেল নিয়মনীতি ও শর্তাবলী:</span>
        </h4>
        <div className="space-y-2 text-xs text-slate-300">
          <div className="flex items-start gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
            <span>
              আপনার রেফারেল কোড বা লিঙ্ক দিয়ে নতুন কেউ একাউন্ট খুললেই সাথে সাথে আপনার একাউন্টে ৳১০.০০ ডিরেক্ট বোনাস জমা হবে।
            </span>
          </div>
          <div className="flex items-start gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
            <span>
              আপনার রেফার করা বন্ধু যতবার ভিডিও দেখে বা টাস্ক করে আর্ন করবে, তার ১০% কমিশন অটোমেটিক আপনার ব্যালেন্সে যোগ হবে।
            </span>
          </div>
          <div className="flex items-start gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
            <span>
              রেফারের কোনো সর্বোচ্চ সীমা নেই — যত বেশি বন্ধু জয়েন করাবেন, তত বেশি প্যাসিভ ইনকাম!
            </span>
          </div>
        </div>
      </div>

      {/* Referred Friends Table */}
      <div className="space-y-2">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">
          জয়েন করা বন্ধুদের তালিকা
        </h3>

        {loading ? (
          <div className="p-4 rounded-xl bg-slate-900 text-center text-xs text-slate-400">
            তালিকা লোড হচ্ছে...
          </div>
        ) : stats?.referrals && stats.referrals.length > 0 ? (
          <div className="space-y-2">
            {stats.referrals.map((friend: any) => (
              <div
                key={friend.id}
                className="p-3 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between text-xs"
              >
                <div>
                  <p className="font-bold text-white">{friend.name}</p>
                  <p className="text-[10px] text-slate-400 font-mono">{friend.phone}</p>
                </div>
                <div className="text-right">
                  <span className="font-mono font-bold text-emerald-400 text-xs">
                    +৳{friend.bonusAmount?.toFixed(2)}
                  </span>
                  <p className="text-[9px] text-slate-500 font-mono">
                    {new Date(friend.createdAt).toLocaleDateString('bn-BD')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 text-center text-xs text-slate-500">
            এখনও কেউ আপনার কোড ব্যবহার করে জয়েন করেনি। বন্ধুদের ইনভাইট করুন!
          </div>
        )}
      </div>
    </div>
  );
};
