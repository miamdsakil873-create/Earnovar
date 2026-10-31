import React, { useState, useEffect } from 'react';
import { LanguageProvider } from './context/LanguageContext.tsx';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { Navbar } from './components/Navbar.tsx';
import { BottomNav, NavTab } from './components/BottomNav.tsx';
import { NoticeBanner } from './components/NoticeBanner.tsx';
import { DailyBonusModal } from './components/DailyBonusModal.tsx';
import { VoucherModal } from './components/VoucherModal.tsx';
import { AuthView } from './views/AuthView.tsx';
import { DashboardView } from './views/DashboardView.tsx';
import { WatchEarnView } from './views/WatchEarnView.tsx';
import { TasksView } from './views/TasksView.tsx';
import { ReferralView } from './views/ReferralView.tsx';
import { WalletView } from './views/WalletView.tsx';
import { ProfileView } from './views/ProfileView.tsx';
import { api } from './services/api.ts';
import { SiteSettings } from './types.ts';
import { onDataUpdated } from './services/liveSync.ts';
import { firebaseSettings } from './services/firebaseService.ts';
import { CheckCircle2, AlertCircle, X } from 'lucide-react';

interface ToastData {
  id: number;
  message: string;
  type: 'success' | 'error';
}

const MainContent: React.FC = () => {
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [dailyBonusOpen, setDailyBonusOpen] = useState(false);
  const [voucherModalOpen, setVoucherModalOpen] = useState(false);
  const [hasClaimedDaily, setHasClaimedDaily] = useState(false);
  const [todayWatchRemaining, setTodayWatchRemaining] = useState(0);
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [toasts, setToasts] = useState<ToastData[]>([]);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const removeToast = (id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Sync settings and daily stats
  const syncPublicData = async () => {
    try {
      const res = await api.getPublicSettings();
      if (res.success && res.settings) {
        setSettings(res.settings);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    syncPublicData();

    // Live Firebase Settings subscription for instantaneous notice updates
    const unsubSettings = firebaseSettings.subscribe((liveSettings) => {
      if (liveSettings) {
        setSettings(liveSettings);
      }
    });

    const unsubscribe = onDataUpdated(() => {
      syncPublicData();
    });
    const interval = setInterval(() => {
      syncPublicData();
    }, 12000);
    return () => {
      unsubSettings();
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400 gap-3">
        <div className="w-9 h-9 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-semibold text-slate-300">Earn-Watch-Bot লোড হচ্ছে...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <>
        {/* Floating Toasts */}
        <div className="fixed top-4 left-4 right-4 z-50 flex flex-col items-center gap-2 pointer-events-none">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className={`max-w-sm w-full p-3 rounded-xl shadow-xl flex items-center justify-between gap-2 text-xs font-bold pointer-events-auto transition-all animate-in slide-in-from-top ${
                toast.type === 'success'
                  ? 'bg-emerald-500 text-slate-950 shadow-emerald-500/20'
                  : 'bg-red-500 text-white shadow-red-500/20'
              }`}
            >
              <div className="flex items-center gap-2">
                {toast.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                <span>{toast.message}</span>
              </div>
              <button onClick={() => removeToast(toast.id)}>
                <X className="w-3.5 h-3.5 opacity-80 hover:opacity-100" />
              </button>
            </div>
          ))}
        </div>
        <AuthView onSuccessToast={(msg) => showToast(msg, 'success')} />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-emerald-500 selection:text-slate-950 font-sans w-full max-w-full overflow-x-hidden relative">
      {/* Floating Toasts */}
      <div className="fixed top-4 left-4 right-4 z-50 flex flex-col items-center gap-2 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`max-w-sm w-full p-3 rounded-xl shadow-xl flex items-center justify-between gap-2 text-xs font-bold pointer-events-auto transition-all animate-in slide-in-from-top ${
              toast.type === 'success'
                ? 'bg-emerald-500 text-slate-950 shadow-emerald-500/20'
                : 'bg-red-500 text-white shadow-red-500/20'
            }`}
          >
            <div className="flex items-center gap-2">
              {toast.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
              <span>{toast.message}</span>
            </div>
            <button onClick={() => removeToast(toast.id)}>
              <X className="w-3.5 h-3.5 opacity-80 hover:opacity-100" />
            </button>
          </div>
        ))}
      </div>

      {/* Top Navbar */}
      <Navbar
        onOpenDailyBonus={() => setDailyBonusOpen(true)}
        onNavigateToWallet={() => setActiveTab('wallet')}
        hasClaimedDaily={hasClaimedDaily}
      />

      {/* Notice Banner */}
      {settings && (
        <NoticeBanner
          notice={settings.siteNotice}
          active={settings.noticeActive}
        />
      )}

      {/* Main Container - constrained for clean mobile experience on all screens */}
      <main className="flex-1 max-w-md w-full mx-auto px-3 sm:px-4 pt-3 overflow-x-hidden box-border">
        {activeTab === 'dashboard' && (
          <DashboardView
            onNavigate={(tab) => setActiveTab(tab)}
            onOpenDailyBonus={() => setDailyBonusOpen(true)}
            onOpenVoucher={() => setVoucherModalOpen(true)}
          />
        )}

        {activeTab === 'watch' && (
          <WatchEarnView
            onSuccessToast={(msg) => showToast(msg, 'success')}
          />
        )}

        {activeTab === 'tasks' && (
          <TasksView
            onSuccessToast={(msg) => showToast(msg, 'success')}
          />
        )}

        {activeTab === 'referral' && (
          <ReferralView
            onSuccessToast={(msg) => showToast(msg, 'success')}
          />
        )}

        {activeTab === 'wallet' && (
          <WalletView
            onSuccessToast={(msg) => showToast(msg, 'success')}
          />
        )}

        {activeTab === 'profile' && (
          <ProfileView
            onSuccessToast={(msg) => showToast(msg, 'success')}
          />
        )}
      </main>

      {/* Mobile Bottom Navigation */}
      <BottomNav
        activeTab={activeTab}
        onChangeTab={setActiveTab}
        todayWatchRemaining={todayWatchRemaining}
      />

      {/* Daily Bonus Modal */}
      <DailyBonusModal
        isOpen={dailyBonusOpen}
        onClose={() => setDailyBonusOpen(false)}
        hasClaimed={hasClaimedDaily}
        onSuccess={(amount, message) => {
          setHasClaimedDaily(true);
          showToast(message, 'success');
        }}
      />

      {/* Redeem Voucher Modal */}
      <VoucherModal
        isOpen={voucherModalOpen}
        onClose={() => setVoucherModalOpen(false)}
        onSuccess={(message) => {
          showToast(message, 'success');
        }}
      />
    </div>
  );
};

export const UserPanelApp: React.FC = () => {
  return (
    <LanguageProvider>
      <AuthProvider>
        <MainContent />
      </AuthProvider>
    </LanguageProvider>
  );
};
