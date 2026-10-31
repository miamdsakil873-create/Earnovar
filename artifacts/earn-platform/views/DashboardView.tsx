import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { useLanguage } from '../context/LanguageContext.tsx';
import { api } from '../services/api.ts';
import { DashboardStats, TransactionItem, SiteSettings } from '../types.ts';
import { onDataUpdated } from '../services/liveSync.ts';
import { firebaseSettings } from '../services/firebaseService.ts';
import {
  Wallet,
  TrendingUp,
  PlaySquare,
  CheckSquare,
  Users,
  CreditCard,
  ArrowDownRight,
  ArrowUpRight,
  RefreshCw,
  ChevronRight,
  Clock,
  ShieldCheck,
  Ticket,
  Send,
  Gift,
} from 'lucide-react';

interface DashboardViewProps {
  onNavigate: (tab: 'watch' | 'tasks' | 'referral' | 'wallet' | 'profile') => void;
  onOpenDailyBonus: () => void;
  onOpenVoucher?: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onNavigate,
  onOpenVoucher,
}) => {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentTransactions, setRecentTransactions] = useState<TransactionItem[]>([]);
  const [siteNotice, setSiteNotice] = useState<string>('');
  const [noticeActive, setNoticeActive] = useState<boolean>(true);
  const [supportTelegram, setSupportTelegram] = useState<string>('https://t.me/EarnWatchBotSupport');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadDashboard = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const res = await api.getDashboard();
      if (res.success) {
        setStats(res.stats);
        setRecentTransactions(res.recentTransactions);
        if (res.settings) {
          if (!siteNotice) setSiteNotice(res.settings.siteNotice || '');
          if (res.settings.supportTelegram) setSupportTelegram(res.settings.supportTelegram);
        }
      }
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadDashboard();

    // Live Firebase settings subscription
    const unsubSettings = firebaseSettings.subscribe((settings) => {
      if (settings) {
        setSiteNotice(settings.siteNotice || '');
        setNoticeActive(settings.noticeActive ?? true);
        if (settings.supportTelegram) setSupportTelegram(settings.supportTelegram);
      }
    });

    const unsubscribe = onDataUpdated(() => {
      loadDashboard();
    });
    const interval = setInterval(() => {
      loadDashboard();
    }, 10000);
    return () => {
      unsubSettings();
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-slate-400 gap-3">
        <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs">Loading...</p>
      </div>
    );
  }

  const todayWatchCount = stats?.todayWatchCount ?? user?.dailyWatchCount ?? 0;
  const dailyAdLimit = stats?.dailyAdLimit ?? 12;
  const progressPercent = Math.min(100, Math.round((todayWatchCount / dailyAdLimit) * 100));

  return (
    <div className="space-y-4 pb-20">
      {/* User Greeting & Refresh */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-slate-950 font-bold text-base shadow-md shadow-emerald-500/20">
            {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h2 className="font-bold text-white text-base leading-tight">
                {user?.name || 'User'}
              </h2>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            </div>
            <p className="text-xs text-slate-400 font-mono">
              {user?.phone}
            </p>
          </div>
        </div>

        <button
          onClick={() => loadDashboard(true)}
          disabled={refreshing}
          className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition active:scale-95"
          title="Refresh"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-emerald-400' : ''}`} />
        </button>
      </div>

      {/* Live Site Notice Announcement */}
      {siteNotice && noticeActive && (
        <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-500/15 via-teal-500/10 to-slate-900 border border-emerald-500/30 flex items-start gap-3 text-xs text-emerald-200 shadow-md">
          <span className="text-base shrink-0">📢</span>
          <p className="leading-relaxed font-medium">{siteNotice}</p>
        </div>
      )}

      {/* Main Balance Hero Card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-600 via-teal-700 to-slate-900 p-5 text-white shadow-xl shadow-emerald-950/40 border border-emerald-500/30">
        <div className="absolute -right-8 -top-8 w-36 h-36 rounded-full bg-emerald-400/10 blur-2xl pointer-events-none" />
        <div className="absolute -left-8 -bottom-8 w-36 h-36 rounded-full bg-teal-400/10 blur-2xl pointer-events-none" />

        <div className="relative z-10 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-100 flex items-center gap-1.5 bg-black/20 backdrop-blur-md px-2.5 py-1 rounded-full border border-emerald-300/20">
              <Wallet className="w-3.5 h-3.5 text-emerald-300" />
              {t('mainBalance')}
            </span>
            <span className="text-[11px] font-mono font-bold text-emerald-200">
              {t('bdtUnit')}
            </span>
          </div>

          <div>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-black tracking-tight text-white drop-shadow">
                ৳{user?.balance.toFixed(2)}
              </span>
            </div>
            <p className="text-[11px] text-emerald-100/80 mt-0.5">
              {t('withdrawEligibility')}
            </p>
          </div>

          {/* Quick CTA Buttons inside Card */}
          <div className="grid grid-cols-2 gap-2.5 pt-1">
            <button
              onClick={() => onNavigate('wallet')}
              className="py-2.5 px-3 rounded-xl bg-white text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-black/20 hover:bg-slate-100 active:scale-95 transition"
            >
              <CreditCard className="w-4 h-4 text-emerald-700" />
              <span>{t('withdrawMoney')}</span>
            </button>
            <button
              onClick={() => onNavigate('watch')}
              className="py-2.5 px-3 rounded-xl bg-emerald-950/60 hover:bg-emerald-950/80 border border-emerald-300/40 text-emerald-100 font-bold text-xs flex items-center justify-center gap-1.5 backdrop-blur-sm active:scale-95 transition"
            >
              <PlaySquare className="w-4 h-4 text-emerald-300" />
              <span>{t('watchVideos')}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Financial Snapshot Cards */}
      <div className="grid grid-cols-3 gap-2.5">
        <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-400 font-medium">{t('todayEarnings')}</span>
            <TrendingUp className="w-3 h-3 text-emerald-400" />
          </div>
          <p className="text-sm font-bold text-emerald-400 font-mono">
            ৳{stats?.todayEarnings.toFixed(2) ?? '0.00'}
          </p>
        </div>

        <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-400 font-medium">{t('totalEarned')}</span>
            <ArrowUpRight className="w-3 h-3 text-teal-400" />
          </div>
          <p className="text-sm font-bold text-teal-400 font-mono">
            ৳{user?.totalEarned.toFixed(2) ?? '0.00'}
          </p>
        </div>

        <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-400 font-medium">{t('totalWithdrawn')}</span>
            <ArrowDownRight className="w-3 h-3 text-amber-400" />
          </div>
          <p className="text-sm font-bold text-amber-400 font-mono">
            ৳{user?.totalWithdrawn.toFixed(2) ?? '0.00'}
          </p>
        </div>
      </div>

      {/* Daily Video Watch Progress Card */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/15 flex items-center justify-center text-emerald-400">
              <PlaySquare className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white">{t('dailyAdQuota')}</h4>
              <p className="text-[10px] text-slate-400">{t('dailyLimitSubtitle')}</p>
            </div>
          </div>
          <span className="text-xs font-mono font-bold text-emerald-400">
            {todayWatchCount}/{dailyAdLimit}
          </span>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
          <div
            className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500 rounded-full"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-[11px] text-slate-400">
          <span>{dailyAdLimit - todayWatchCount > 0 ? `${dailyAdLimit - todayWatchCount} ${t('remainingVideos')}` : t('quotaFinished')}</span>
          <button
            onClick={() => onNavigate('watch')}
            className="text-emerald-400 font-semibold hover:underline flex items-center gap-0.5"
          >
            <span>{t('watchVideos')}</span>
            <ChevronRight className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Quick Action Navigation Grid */}
      <div className="space-y-2">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">
          {t('earningOptions')}
        </h3>

        <div className="grid grid-cols-2 gap-2.5">
          {/* Watch Ads */}
          <button
            onClick={() => onNavigate('watch')}
            className="p-3.5 rounded-2xl bg-slate-900 hover:bg-slate-850 border border-slate-800 text-left transition active:scale-98 group flex flex-col justify-between"
          >
            <div className="w-9 h-9 rounded-xl bg-red-500/15 border border-red-500/30 flex items-center justify-center text-red-400 mb-2 group-hover:scale-105 transition">
              <PlaySquare className="w-5 h-5" />
            </div>
            <div>
              <p className="font-bold text-xs text-white">{t('watchAndEarn')}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">{t('watchRate')}</p>
            </div>
          </button>

          {/* Micro Tasks */}
          <button
            onClick={() => onNavigate('tasks')}
            className="p-3.5 rounded-2xl bg-slate-900 hover:bg-slate-850 border border-slate-800 text-left transition active:scale-98 group flex flex-col justify-between"
          >
            <div className="w-9 h-9 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400 mb-2 group-hover:scale-105 transition">
              <CheckSquare className="w-5 h-5" />
            </div>
            <div>
              <p className="font-bold text-xs text-white">{t('microTasks')}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">{t('taskRate')}</p>
            </div>
          </button>

          {/* Refer Program */}
          <button
            onClick={() => onNavigate('referral')}
            className="p-3.5 rounded-2xl bg-slate-900 hover:bg-slate-850 border border-slate-800 text-left transition active:scale-98 group flex flex-col justify-between"
          >
            <div className="w-9 h-9 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400 mb-2 group-hover:scale-105 transition">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <p className="font-bold text-xs text-white">{t('referAndEarn')}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">{t('referRate')}</p>
            </div>
          </button>

          {/* Withdraw */}
          <button
            onClick={() => onNavigate('wallet')}
            className="p-3.5 rounded-2xl bg-slate-900 hover:bg-slate-850 border border-slate-800 text-left transition active:scale-98 group flex flex-col justify-between"
          >
            <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-2 group-hover:scale-105 transition">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <p className="font-bold text-xs text-white">{t('withdrawOption')}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">{t('withdrawMethods')}</p>
            </div>
          </button>
        </div>
      </div>

      {/* Voucher / Redeem Code Banner */}
      {onOpenVoucher && (
        <div
          onClick={onOpenVoucher}
          className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/20 via-orange-500/15 to-emerald-500/10 border border-amber-500/40 flex items-center justify-between cursor-pointer hover:border-amber-400 transition active:scale-98 shadow-md"
        >
          <div className="flex items-center gap-3">
            <span className="p-2.5 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 text-slate-950 font-bold shadow-md shadow-amber-500/25">
              <Ticket className="w-5 h-5 fill-current" />
            </span>
            <div>
              <div className="flex items-center gap-1.5">
                <h4 className="text-xs font-black text-white">🎟️ রিডিম কোড / ভাউচার আছে?</h4>
                <span className="text-[9px] font-black uppercase px-1.5 py-0.2 bg-amber-500 text-slate-950 rounded-full">
                  INSTANT
                </span>
              </div>
              <p className="text-[10px] text-amber-200/90 font-medium mt-0.5">
                কোড প্রবেশ করিয়ে সাথে সাথে ওয়ালেটে ক্যাশ ব্যালেন্স নিন
              </p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-amber-400 shrink-0" />
        </div>
      )}

      {/* Official Telegram Support Channel Banner */}
      <a
        href={supportTelegram}
        target="_blank"
        rel="noopener noreferrer"
        className="p-3.5 rounded-2xl bg-gradient-to-r from-sky-600/20 via-blue-600/15 to-indigo-600/10 border border-sky-500/40 flex items-center justify-between hover:border-sky-400 transition active:scale-98 shadow-md"
      >
        <div className="flex items-center gap-3">
          <span className="p-2.5 rounded-xl bg-gradient-to-tr from-sky-400 to-blue-600 text-white font-bold shadow-md shadow-sky-500/25">
            <Send className="w-5 h-5 fill-current" />
          </span>
          <div>
            <div className="flex items-center gap-1.5">
              <h4 className="text-xs font-black text-white">অফিশিয়াল টেলিগ্রাম চ্যানেল ও সাপোর্ট</h4>
              <span className="text-[9px] font-black uppercase px-1.5 py-0.2 bg-sky-500 text-slate-950 rounded-full">
                ACTIVE
              </span>
            </div>
            <p className="text-[10px] text-sky-200/90 font-medium mt-0.5">
              পেমেন্ট প্রুফ, ফ্রি রিডিম কোড ও ২৪/৭ সাপোর্টের জন্য যুক্ত হোন
            </p>
          </div>
        </div>
        <ChevronRight className="w-4 h-4 text-sky-400 shrink-0" />
      </a>


      {/* Recent Activity / Transactions Ledger */}
      <div className="space-y-2 pt-2">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            {t('recentTransactions')}
          </h3>
          <button
            onClick={() => onNavigate('wallet')}
            className="text-[11px] text-emerald-400 hover:underline font-semibold"
          >
            {t('viewAll')}
          </button>
        </div>

        {recentTransactions.length === 0 ? (
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 text-center text-xs text-slate-500">
            {t('noTransactions')}
          </div>
        ) : (
          <div className="space-y-2">
            {recentTransactions.map((tx) => {
              const isDebit = tx.type === 'WITHDRAWAL';
              return (
                <div
                  key={tx.id}
                  className="p-3 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center gap-2.5 overflow-hidden">
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                        isDebit
                          ? 'bg-amber-500/15 text-amber-400'
                          : 'bg-emerald-500/15 text-emerald-400'
                      }`}
                    >
                      {isDebit ? (
                        <ArrowDownRight className="w-4 h-4" />
                      ) : (
                        <ArrowUpRight className="w-4 h-4" />
                      )}
                    </div>
                    <div className="overflow-hidden">
                      <p className="font-semibold text-slate-200 truncate">
                        {tx.description}
                      </p>
                      <p className="text-[10px] text-slate-500 flex items-center gap-1 font-mono">
                        <Clock className="w-3 h-3" />
                        {new Date(tx.createdAt).toLocaleDateString(language === 'bn' ? 'bn-BD' : 'en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <p
                      className={`font-bold font-mono text-sm ${
                        isDebit ? 'text-amber-400' : 'text-emerald-400'
                      }`}
                    >
                      {isDebit ? '-' : '+'}৳{tx.amount.toFixed(2)}
                    </p>
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                        tx.status === 'COMPLETED'
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : tx.status === 'PENDING'
                          ? 'bg-amber-500/20 text-amber-300'
                          : 'bg-red-500/20 text-red-400'
                      }`}
                    >
                      {tx.status === 'COMPLETED'
                        ? t('statusCompleted')
                        : tx.status === 'PENDING'
                        ? t('statusPending')
                        : t('statusRejected')}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Security Assurance Banner */}
      <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 text-[11px] text-slate-400 flex items-center gap-2.5">
        <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
        <p>
          {t('verifiedEarning')} — Instant withdrawal & anti-fraud protected ledger.
        </p>
      </div>
    </div>
  );
};
