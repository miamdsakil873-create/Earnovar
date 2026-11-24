import React, { useState, useEffect } from 'react';
import { api } from '../services/api.ts';
import {
  ShieldCheck,
  Lock,
  RefreshCw,
  PlusCircle,
  Trash2,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Coins,
  Users,
  Settings,
  Tv,
  CheckSquare,
  ArrowLeft,
  Search,
  AlertCircle,
  Save,
  Send,
  Eye,
  Wallet,
  Download,
} from 'lucide-react';
import { firebaseUsers } from '../services/firebaseService.ts';

interface AdminPanelViewProps {
  onClose: () => void;
  onSuccessToast: (msg: string) => void;
}

export const AdminPanelView: React.FC<AdminPanelViewProps> = ({ onClose, onSuccessToast }) => {
  const [pin, setPin] = useState('');
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [pinError, setPinError] = useState<string | null>(null);

  // Live Data
  const [loading, setLoading] = useState(false);
  const [liveData, setLiveData] = useState<{
    stats: any;
    users: any[];
    withdrawals: any[];
    tasks: any[];
    taskSubmissions: any[];
    ads: any[];
    settings: any;
  } | null>(null);

  // Active Admin Tab
  const [activeTab, setActiveTab] = useState<'tasks' | 'proofs' | 'withdrawals' | 'ads' | 'users' | 'settings'>('tasks');

  // Form states for creating a task
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskCategory, setNewTaskCategory] = useState('TELEGRAM');
  const [newTaskReward, setNewTaskReward] = useState('15');
  const [newTaskUrl, setNewTaskUrl] = useState('');
  const [newTaskDesc, setNewTaskDesc] = useState('');
  const [newTaskProofPlaceholder, setNewTaskProofPlaceholder] = useState('');
  const [creatingTask, setCreatingTask] = useState(false);

  // Form states for creating an Ad
  const [newAdTitle, setNewAdTitle] = useState('');
  const [newAdSponsor, setNewAdSponsor] = useState('');
  const [newAdReward, setNewAdReward] = useState('3.5');
  const [newAdDuration, setNewAdDuration] = useState('15');
  const [newAdThumbnail, setNewAdThumbnail] = useState('https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=600&q=80');
  const [creatingAd, setCreatingAd] = useState(false);

  // Settings form states
  const [siteNotice, setSiteNotice] = useState('');
  const [noticeActive, setNoticeActive] = useState(true);
  const [minWithdrawal, setMinWithdrawal] = useState('50');
  const [minReferralsToWithdraw, setMinReferralsToWithdraw] = useState('0');
  const [monetagZoneId, setMonetagZoneId] = useState('9537184');
  const [dailyBonusAmount, setDailyBonusAmount] = useState('5');
  const [referralBonus, setReferralBonus] = useState('10');
  const [savingSettings, setSavingSettings] = useState(false);

  // User search
  const [userSearch, setUserSearch] = useState('');

  // Fetch Live Data
  const fetchAdminData = async () => {
    setLoading(true);
    try {
      const res = await api.adminGetData(pin);
      if (res.success) {
        setLiveData(res);
        if (res.settings) {
          setSiteNotice(res.settings.siteNotice || '');
          setNoticeActive(res.settings.noticeActive ?? true);
          setMinWithdrawal(String(res.settings.minWithdrawal || '50'));
          setMinReferralsToWithdraw(String(res.settings.minReferralsToWithdraw ?? '0'));
          setMonetagZoneId(res.settings.monetag?.zoneId || '9537184');
          setDailyBonusAmount(String(res.settings.dailyBonusAmount || '5'));
          setReferralBonus(String(res.settings.referralDirectBonus || '10'));
        }
      }
    } catch (err: any) {
      console.error('Failed to load admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUnlock = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const entered = pin.trim();
    if (entered === 'Earnova017@' || entered === '889900') {
      setIsUnlocked(true);
      setPinError(null);
      fetchAdminData();
    } else {
      setPinError('ভুল পাসওয়ার্ড বা পিন! সঠিক অ্যাডমিন তথ্য দিন।');
    }
  };

  // --- Handlers ---
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim() || !newTaskReward) {
      alert('টাস্কের শিরোনাম এবং টাকার পরিমাণ দিন');
      return;
    }

    setCreatingTask(true);
    try {
      const res = await api.adminAddTask(
        {
          title: newTaskTitle.trim(),
          category: newTaskCategory,
          rewardAmount: Number(newTaskReward),
          taskUrl: newTaskUrl.trim(),
          description: newTaskDesc.trim(),
          proofPlaceholder: newTaskProofPlaceholder.trim() || 'প্রমাণ লিখুন',
        },
        pin
      );

      if (res.success) {
        onSuccessToast('🎉 নতুন টাস্ক সফলভাবে তৈরি ও লাইভ সেভ হয়েছে!');
        setNewTaskTitle('');
        setNewTaskUrl('');
        setNewTaskDesc('');
        setNewTaskProofPlaceholder('');
        fetchAdminData();
      } else {
        alert(res.message || 'টাস্ক তৈরি ব্যর্থ হয়েছে।');
      }
    } catch (err: any) {
      alert(err.message || 'সার্ভার এরর');
    } finally {
      setCreatingTask(false);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm('আপনি কি নিশ্চিতভাবে এই টাস্কটি ডিলিট করতে চান? এটি সাথে সাথে সাইট থেকে মুছে যাবে।')) return;
    try {
      const res = await api.adminDeleteTask(taskId, pin);
      if (res.success) {
        onSuccessToast('🗑️ টাস্কটি মুছে ফেলা হয়েছে।');
        fetchAdminData();
      }
    } catch (err: any) {
      alert(err.message || 'ডিলিট করতে সমস্যা হয়েছে');
    }
  };

  const handleWithdrawAction = async (id: string, action: 'APPROVE' | 'REJECT') => {
    const confirmMsg =
      action === 'APPROVE'
        ? 'আপনি কি এই উত্তোলনের টাকা বিকাশ/নগদে পাঠানো নিশ্চিত করেছেন?'
        : 'আপনি কি এই উত্তোলনটি বাতিল করতে চান? টাকার পরিমাণ ইউজারের ব্যালেন্সে ফেরত যাবে।';
    if (!confirm(confirmMsg)) return;

    try {
      const res = await api.adminWithdrawalAction(id, action, undefined, pin);
      if (res.success) {
        onSuccessToast(
          action === 'APPROVE'
            ? '✅ উত্তোলন সফলভাবে পেইড (COMPLETED) করা হয়েছে!'
            : '❌ উত্তোলন বাতিল করা হয়েছে এবং ইউজারের ব্যালেন্স রিফান্ড হয়েছে।'
        );
        fetchAdminData();
      }
    } catch (err: any) {
      alert(err.message || 'উত্তোলন আপডেট ব্যর্থ হয়েছে');
    }
  };

  const handleTaskProofAction = async (id: string, action: 'APPROVED' | 'REJECTED') => {
    try {
      const res = await api.adminTaskProofAction(id, action, undefined, pin);
      if (res.success) {
        onSuccessToast(
          action === 'APPROVED'
            ? '✅ প্রমাণ অনুমোদিত হয়েছে এবং ইউজারের ব্যালেন্সে রিওয়ার্ড যোগ হয়েছে!'
            : '❌ প্রমাণ বাতিল করা হয়েছে।'
        );
        fetchAdminData();
      }
    } catch (err: any) {
      alert(err.message || 'আপডেট ব্যর্থ হয়েছে');
    }
  };

  const handleCreateAd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdTitle.trim() || !newAdReward) return;

    setCreatingAd(true);
    try {
      const res = await api.adminAddAd(
        {
          title: newAdTitle.trim(),
          sponsorName: newAdSponsor.trim() || 'Partner Sponsor',
          rewardAmount: Number(newAdReward),
          durationSeconds: Number(newAdDuration) || 15,
          thumbnail: newAdThumbnail.trim(),
        },
        pin
      );

      if (res.success) {
        onSuccessToast('🎉 নতুন বিজ্ঞাপন যুক্ত হয়েছে!');
        setNewAdTitle('');
        setNewAdSponsor('');
        fetchAdminData();
      }
    } catch (err: any) {
      alert(err.message || 'অ্যাড তৈরি ব্যর্থ হয়েছে');
    } finally {
      setCreatingAd(false);
    }
  };

  const handleDeleteAd = async (adId: string) => {
    if (!confirm('বিজ্ঞাপনটি ডিলিট করতে চান?')) return;
    try {
      const res = await api.adminDeleteAd(adId, pin);
      if (res.success) {
        onSuccessToast('🗑️ বিজ্ঞাপন ডিলিট করা হয়েছে।');
        fetchAdminData();
      }
    } catch (err: any) {
      alert(err.message || 'ডিলিট ব্যর্থ');
    }
  };

  const handleAddBalance = async (userId: string, amount: number) => {
    try {
      const targetUser = (liveData?.users || []).find((u) => u.id === userId || u.phone === userId || u.phoneKey === userId);
      const userPhone = targetUser?.phone || targetUser?.phoneKey || userId;
      const currentBal = Number(targetUser?.balance) || 0;
      const currentEarned = Number(targetUser?.totalEarned) || 0;
      const newBal = currentBal + amount;
      const newEarned = currentEarned + amount;

      await firebaseUsers.updateBalance(userPhone, newBal, newEarned);
      const res = await api.adminModifyUserBalance(userId, amount, pin).catch(() => ({ success: true }));
      if (res.success) {
        onSuccessToast(`💰 ব্যবহারকারীর ব্যালেন্সে ৳${amount} যোগ হয়েছে!`);
        fetchAdminData();
      }
    } catch (err: any) {
      alert(err.message || 'ব্যালেন্স আপডেট ব্যর্থ');
    }
  };

  const handleToggleStatus = async (userId: string) => {
    try {
      const targetUser = (liveData?.users || []).find((u) => u.id === userId || u.phone === userId || u.phoneKey === userId);
      const userPhone = targetUser?.phone || targetUser?.phoneKey || userId;
      const newStatus = targetUser?.status === 'ACTIVE' ? 'BANNED' : 'ACTIVE';

      await firebaseUsers.toggleStatus(userPhone, newStatus);
      const res = await api.adminToggleUserStatus(userId, pin).catch(() => ({ success: true }));
      if (res.success) {
        onSuccessToast('ইউজার স্ট্যাটাস পরিবর্তন হয়েছে!');
        fetchAdminData();
      }
    } catch (err: any) {
      alert(err.message || 'স্ট্যাটাস পরিবর্তন ব্যর্থ');
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      const res = await api.adminUpdateSettings(
        {
          siteNotice: siteNotice.trim(),
          noticeActive,
          minWithdrawal: Number(minWithdrawal),
          minReferralsToWithdraw: Number(minReferralsToWithdraw) || 0,
          dailyBonusAmount: Number(dailyBonusAmount),
          referralDirectBonus: Number(referralBonus),
          monetagZoneId: monetagZoneId.trim(),
        },
        pin
      );
      if (res.success) {
        onSuccessToast('⚙️ সেটিংস সফলভাবে আপডেট হয়েছে!');
        fetchAdminData();
      }
    } catch (err: any) {
      alert(err.message || 'সেটিংস সেভ ব্যর্থ');
    } finally {
      setSavingSettings(false);
    }
  };

  // If locked, show PIN prompt
  if (!isUnlocked) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-950 flex items-center justify-center p-4">
        <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-500 via-teal-400 to-amber-300 p-0.5 mx-auto shadow-lg shadow-emerald-500/20">
            <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center text-emerald-400 font-black text-2xl">
              👑
            </div>
          </div>
          <div>
            <h2 className="text-xl font-black text-white">Earnova Master Admin</h2>
            <p className="text-xs text-slate-400 mt-1">গোপন অ্যাডমিন পিন দিয়ে আনলক করুন</p>
          </div>

          <form onSubmit={handleUnlock} className="space-y-3 pt-2">
            <input
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="অ্যাডমিন পাসওয়ার্ড বা পিন লিখুন"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-center text-sm text-white font-mono tracking-widest focus:outline-none focus:border-emerald-500"
            />
            {pinError && <p className="text-xs text-red-400 font-semibold">{pinError}</p>}
            <button
              type="submit"
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:brightness-110 active:scale-95 text-slate-950 font-bold text-xs uppercase tracking-wider transition cursor-pointer"
            >
              আনলক করুন (Unlock)
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-full py-2 text-xs text-slate-400 hover:text-white"
            >
              বাতিল ও ফিরে যান
            </button>
          </form>
        </div>
      </div>
    );
  }

  const users = liveData?.users || [];
  const withdrawals = liveData?.withdrawals || [];
  const tasks = liveData?.tasks || [];
  const submissions = liveData?.taskSubmissions || [];
  const ads = liveData?.ads || [];
  const stats = liveData?.stats;

  const filteredUsers = userSearch.trim()
    ? users.filter(
        (u) =>
          u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
          u.phone.includes(userSearch)
      )
    : users;

  const pendingWithdrawals = withdrawals.filter((w) => w.status === 'PENDING');
  const pendingProofs = submissions.filter((s) => s.status === 'PENDING');

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col overflow-hidden text-slate-100">
      {/* Top Navbar */}
      <header className="bg-slate-900 border-b border-slate-800 px-4 py-3 shrink-0 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer flex items-center gap-1.5 text-xs font-bold"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>ইউজার প্যানেলে ফিরুন</span>
          </button>

          <div className="flex items-center gap-2">
            <span className="text-lg">👑</span>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="font-extrabold text-sm sm:text-base text-white">Earnova Master Admin</h1>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold border border-emerald-500/30 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  ১০০% লাইভ সংযুক্ত
                </span>
              </div>
              <p className="text-[10px] text-slate-400 hidden sm:block">ডাটাবেজে যেকোনো পরিবর্তন সাথে সাথে ইউজার প্যানেলে কার্যকর হবে</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchAdminData}
            disabled={loading}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
            title="রিফ্রেশ"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
          </button>
        </div>
      </header>

      {/* Quick Metrics Bar */}
      <div className="bg-slate-900/50 border-b border-slate-800 px-4 py-2 text-xs overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-4 min-w-max">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400">মোট ইউজার:</span>
            <span className="font-bold text-white font-mono">{stats?.totalUsers ?? users.length}</span>
          </div>
          <span className="text-slate-700">•</span>
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400">পেন্ডিং উইথড্রয়াল:</span>
            <span className="font-bold text-amber-400 font-mono">
              {pendingWithdrawals.length} টি (৳{stats?.pendingWithdrawalsAmount ?? 0})
            </span>
          </div>
          <span className="text-slate-700">•</span>
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400">পেন্ডিং টাস্ক প্রুফ:</span>
            <span className="font-bold text-sky-400 font-mono">{pendingProofs.length} টি</span>
          </div>
          <span className="text-slate-700">•</span>
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400">মোট পেইড:</span>
            <span className="font-bold text-emerald-400 font-mono">৳{stats?.paidWithdrawalsAmount ?? 0}</span>
          </div>
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="bg-slate-900 border-b border-slate-800 px-2 sm:px-4 py-1.5 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0 text-xs font-bold">
        <button
          onClick={() => setActiveTab('tasks')}
          className={`px-3 py-2 rounded-xl flex items-center gap-1.5 transition ${
            activeTab === 'tasks' ? 'bg-emerald-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
          }`}
        >
          <CheckSquare className="w-4 h-4" />
          <span>টাস্ক কন্ট্রোল ({tasks.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('proofs')}
          className={`px-3 py-2 rounded-xl flex items-center gap-1.5 transition relative ${
            activeTab === 'proofs' ? 'bg-emerald-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
          }`}
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>প্রমাণ যাচাই</span>
          {pendingProofs.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-sky-500 text-slate-950 text-[10px] font-black">
              {pendingProofs.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('withdrawals')}
          className={`px-3 py-2 rounded-xl flex items-center gap-1.5 transition relative ${
            activeTab === 'withdrawals' ? 'bg-emerald-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Wallet className="w-4 h-4" />
          <span>উত্তোলন রিকোয়েস্ট</span>
          {pendingWithdrawals.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-slate-950 text-[10px] font-black">
              {pendingWithdrawals.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('ads')}
          className={`px-3 py-2 rounded-xl flex items-center gap-1.5 transition ${
            activeTab === 'ads' ? 'bg-emerald-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Tv className="w-4 h-4" />
          <span>বিজ্ঞাপন ({ads.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('users')}
          className={`px-3 py-2 rounded-xl flex items-center gap-1.5 transition ${
            activeTab === 'users' ? 'bg-emerald-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>ইউজার ({users.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          className={`px-3 py-2 rounded-xl flex items-center gap-1.5 transition ${
            activeTab === 'settings' ? 'bg-emerald-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Settings className="w-4 h-4" />
          <span>সেটিংস ও মনিট্যাগ</span>
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-5 max-w-4xl w-full mx-auto space-y-5">
        {/* ================= 1. TASKS TAB ================= */}
        {activeTab === 'tasks' && (
          <div className="space-y-5">
            {/* Create Task Form */}
            <div className="p-4 sm:p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
              <div className="flex items-center gap-2 text-white font-bold text-sm">
                <PlusCircle className="w-4 h-4 text-emerald-400" />
                <span>নতুন টাস্ক তৈরি করুন (Create Task)</span>
              </div>

              <form onSubmit={handleCreateTask} className="space-y-3 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-400 block mb-1">টাস্কের শিরোনাম *</label>
                    <input
                      type="text"
                      required
                      placeholder="যেমন: অফিসিয়াল টেলিগ্রাম চ্যানেলে জয়েন করুন"
                      value={newTaskTitle}
                      onChange={(e) => setNewTaskTitle(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="text-slate-400 block mb-1">ক্যাটাগরি</label>
                    <select
                      value={newTaskCategory}
                      onChange={(e) => setNewTaskCategory(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-emerald-500"
                    >
                      <option value="TELEGRAM">📢 টেলিগ্রাম চ্যানেল/গ্রুপ</option>
                      <option value="SOCIAL">🌐 ফেসবুক / ইউটিউব / টিকটক</option>
                      <option value="APP">📱 অ্যাপ ইন্সটল ও রিভিউ</option>
                      <option value="SURVEY">📝 সার্ভে / কুইজ</option>
                      <option value="WEBSITE">💻 ওয়েবসাইট ভিজিট</option>
                      <option value="OTHER">⚡ অন্যান্য</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-400 block mb-1">রিওয়ার্ড পরিমাণ (টাকা ৳) *</label>
                    <input
                      type="number"
                      step="0.5"
                      required
                      placeholder="15"
                      value={newTaskReward}
                      onChange={(e) => setNewTaskReward(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-mono focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="text-slate-400 block mb-1">টাস্কের লিংক (URL)</label>
                    <input
                      type="url"
                      placeholder="https://t.me/yourchannel"
                      value={newTaskUrl}
                      onChange={(e) => setNewTaskUrl(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">টাস্কের বিবরণ / কাজের নির্দেশ</label>
                  <textarea
                    rows={2}
                    placeholder="কাজের নিয়ম সংক্ষেপে লিখুন..."
                    value={newTaskDesc}
                    onChange={(e) => setNewTaskDesc(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">ইউজার থেকে প্রুফ / প্রমাণ চাওয়া (Placeholder)</label>
                  <input
                    type="text"
                    placeholder="যেমন: আপনার টেলিগ্রাম ইউজারনেম দিন (@username)"
                    value={newTaskProofPlaceholder}
                    onChange={(e) => setNewTaskProofPlaceholder(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={creatingTask}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:brightness-110 active:scale-95 text-slate-950 font-bold text-xs uppercase tracking-wider transition cursor-pointer shadow-md shadow-emerald-500/20"
                >
                  {creatingTask ? 'তৈরি হচ্ছে...' : '➕ সরাসরি লাইভ সেভ করুন (Add Task Now)'}
                </button>
              </form>
            </div>

            {/* Active Tasks List */}
            <div className="space-y-2">
              <h3 className="font-bold text-white text-xs uppercase tracking-wider">
                বর্তমানে চলমান টাস্কসমূহ ({tasks.length})
              </h3>

              {tasks.length === 0 ? (
                <div className="p-8 rounded-2xl bg-slate-900 border border-slate-800 text-center text-slate-500 text-xs">
                  কোনো টাস্ক তৈরি করা নেই।
                </div>
              ) : (
                tasks.map((task) => (
                  <div
                    key={task.id}
                    className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white">{task.title}</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-300">
                          {task.category}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400">{task.description}</p>
                      {task.taskUrl && (
                        <a
                          href={task.taskUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[10px] text-emerald-400 underline font-mono flex items-center gap-1"
                        >
                          <span>{task.taskUrl}</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      )}
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span className="font-bold font-mono text-emerald-400 text-sm">
                        ৳{Number(task.rewardAmount).toFixed(2)}
                      </span>
                      <button
                        onClick={() => handleDeleteTask(task.id)}
                        className="p-2 rounded-xl bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-400 transition cursor-pointer"
                        title="ডিলিট"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ================= 2. PROOFS TAB ================= */}
        {activeTab === 'proofs' && (
          <div className="space-y-4">
            <h3 className="font-bold text-white text-xs uppercase tracking-wider">
              ইউজারদের সাবমিট করা প্রমাণসমূহ ({submissions.length})
            </h3>

            {submissions.length === 0 ? (
              <div className="p-8 rounded-2xl bg-slate-900 border border-slate-800 text-center text-slate-500 text-xs">
                কোনো পেন্ডিং টাস্ক প্রমাণ জমা নেই।
              </div>
            ) : (
              submissions.map((sub) => (
                <div
                  key={sub.id}
                  className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-sm">{sub.taskTitle}</span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          sub.status === 'APPROVED'
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : sub.status === 'REJECTED'
                            ? 'bg-red-500/20 text-red-400'
                            : 'bg-amber-500/20 text-amber-300'
                        }`}
                      >
                        {sub.status}
                      </span>
                    </div>

                    <p className="text-slate-400">
                      ইউজার: <strong className="text-slate-200">{sub.userName || 'User'}</strong> ({sub.userPhone || '—'})
                    </p>

                    <div className="p-2 rounded-xl bg-slate-950 border border-slate-850">
                      <span className="text-[10px] text-slate-400 block">জমা দেওয়া প্রমাণ:</span>
                      <span className="font-mono text-emerald-300 font-bold">{sub.proofData}</span>
                    </div>

                    <p className="text-[10px] text-slate-500 font-mono">
                      {new Date(sub.submittedAt).toLocaleString()}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    <span className="font-mono font-bold text-emerald-400 text-sm mr-2">
                      ৳{Number(sub.rewardAmount).toFixed(2)}
                    </span>

                    {sub.status === 'PENDING' && (
                      <>
                        <button
                          onClick={() => handleTaskProofAction(sub.id, 'APPROVED')}
                          className="px-3 py-1.5 rounded-xl bg-emerald-500 text-slate-950 font-bold hover:brightness-110 transition active:scale-95 cursor-pointer shadow-md"
                        >
                          অনুমোদন ✅
                        </button>
                        <button
                          onClick={() => handleTaskProofAction(sub.id, 'REJECTED')}
                          className="px-3 py-1.5 rounded-xl bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-400 font-bold transition active:scale-95 cursor-pointer"
                        >
                          বাতিল ❌
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* ================= 3. WITHDRAWALS TAB ================= */}
        {activeTab === 'withdrawals' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-white text-xs uppercase tracking-wider">
                উত্তোলন রিকোয়েস্ট তালিকা ({withdrawals.length})
              </h3>
            </div>

            {withdrawals.length === 0 ? (
              <div className="p-8 rounded-2xl bg-slate-900 border border-slate-800 text-center text-slate-500 text-xs">
                কোনো উত্তোলন রিকোয়েস্ট জমা নেই।
              </div>
            ) : (
              withdrawals.map((w) => (
                <div
                  key={w.id}
                  className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-sm">{w.userName || 'User'}</span>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20">
                        {w.method}
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 text-[10px]">
                        {w.accountType}
                      </span>
                    </div>

                    <p className="font-mono text-slate-300 font-bold text-sm">{w.accountNumber}</p>
                    <p className="text-[10px] text-slate-500 font-mono">
                      {new Date(w.requestedAt).toLocaleString()}
                    </p>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                    <div className="text-right">
                      <p className="font-mono font-black text-emerald-400 text-base">৳{Number(w.amount).toFixed(2)}</p>
                      <span
                        className={`text-[9px] font-bold px-2 py-0.5 rounded ${
                          w.status === 'COMPLETED'
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : w.status === 'REJECTED'
                            ? 'bg-red-500/20 text-red-400'
                            : 'bg-amber-500/20 text-amber-300'
                        }`}
                      >
                        {w.status}
                      </span>
                    </div>

                    {w.status === 'PENDING' && (
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleWithdrawAction(w.id, 'APPROVE')}
                          className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:brightness-110 text-slate-950 font-bold text-xs shadow-md transition active:scale-95 cursor-pointer"
                        >
                          পেইড করুন ✅
                        </button>
                        <button
                          onClick={() => handleWithdrawAction(w.id, 'REJECT')}
                          className="px-3 py-1.5 rounded-xl bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-400 font-bold text-xs transition active:scale-95 cursor-pointer"
                        >
                          বাতিল ❌
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* ================= 4. ADS TAB ================= */}
        {activeTab === 'ads' && (
          <div className="space-y-5">
            {/* Create Ad Form */}
            <div className="p-4 sm:p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
              <div className="flex items-center gap-2 text-white font-bold text-sm">
                <PlusCircle className="w-4 h-4 text-emerald-400" />
                <span>নতুন বিজ্ঞাপন যুক্ত করুন</span>
              </div>

              <form onSubmit={handleCreateAd} className="space-y-3 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-400 block mb-1">বিজ্ঞাপনের শিরোনাম *</label>
                    <input
                      type="text"
                      required
                      placeholder="যেমন: প্রিমিয়াম গ্যাজেট অফার"
                      value={newAdTitle}
                      onChange={(e) => setNewAdTitle(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="text-slate-400 block mb-1">স্পনসর নাম</label>
                    <input
                      type="text"
                      placeholder="যেমন: TechGadget BD"
                      value={newAdSponsor}
                      onChange={(e) => setNewAdSponsor(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-400 block mb-1">রিওয়ার্ড পরিমাণ (৳) *</label>
                    <input
                      type="number"
                      step="0.5"
                      required
                      placeholder="3.5"
                      value={newAdReward}
                      onChange={(e) => setNewAdReward(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-mono focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="text-slate-400 block mb-1">বিজ্ঞাপনের স্থায়িত্ব (সেকেন্ড)</label>
                    <input
                      type="number"
                      placeholder="15"
                      value={newAdDuration}
                      onChange={(e) => setNewAdDuration(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-mono focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">ছবি বা থাম্বনেইল লিংক</label>
                  <input
                    type="url"
                    value={newAdThumbnail}
                    onChange={(e) => setNewAdThumbnail(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={creatingAd}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:brightness-110 active:scale-95 text-slate-950 font-bold text-xs uppercase tracking-wider transition cursor-pointer shadow-md"
                >
                  {creatingAd ? 'যুক্ত হচ্ছে...' : '➕ বিজ্ঞাপন লাইভ যোগ করুন'}
                </button>
              </form>
            </div>

            {/* Ads List */}
            <div className="space-y-2">
              <h3 className="font-bold text-white text-xs uppercase tracking-wider">
                চলমান বিজ্ঞাপনসমূহ ({ads.length})
              </h3>

              {ads.map((ad) => (
                <div
                  key={ad.id}
                  className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center gap-3">
                    <img src={ad.thumbnail} alt="" className="w-12 h-10 object-cover rounded-lg bg-slate-950" />
                    <div>
                      <p className="font-bold text-white">{ad.title}</p>
                      <p className="text-[11px] text-slate-400">
                        {ad.sponsorName} • {ad.durationSeconds} সেকেন্ড
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className="font-mono font-bold text-amber-400">৳{Number(ad.rewardAmount).toFixed(2)}</span>
                    <button
                      onClick={() => handleDeleteAd(ad.id)}
                      className="p-2 rounded-xl bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-400 transition cursor-pointer"
                      title="ডিলিট"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ================= 5. USERS TAB ================= */}
        {activeTab === 'users' && (
          <div className="space-y-4">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
              <input
                type="text"
                placeholder="নাম বা মোবাইল নম্বর দিয়ে ইউজার খুঁজুন..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="space-y-2">
              {filteredUsers.map((u) => (
                <div
                  key={u.id}
                  className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white">{u.name}</span>
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          u.status === 'ACTIVE'
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : 'bg-red-500/20 text-red-400'
                        }`}
                      >
                        {u.status}
                      </span>
                    </div>
                    <p className="text-slate-400 font-mono">
                      {u.phone} {u.email ? `• ${u.email}` : ''}
                    </p>
                  </div>

                  <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                    <div className="text-right">
                      <p className="font-mono font-bold text-emerald-400">ব্যালেন্স: ৳{Number(u.balance || 0).toFixed(2)}</p>
                      <p className="text-[10px] text-slate-500">মোট আয়: ৳{Number(u.totalEarned || 0).toFixed(2)}</p>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleAddBalance(u.id, 50)}
                        className="px-2.5 py-1 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 font-bold text-[11px] hover:bg-emerald-500/30 cursor-pointer"
                      >
                        +৳৫০
                      </button>
                      <button
                        onClick={() => handleToggleStatus(u.id)}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 text-[11px] hover:bg-slate-700 cursor-pointer"
                      >
                        {u.status === 'ACTIVE' ? 'ব্যান 🚫' : 'আনব্যান 🟢'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ================= 6. SETTINGS TAB ================= */}
        {activeTab === 'settings' && (
          <div className="p-4 sm:p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
            <h3 className="font-bold text-white text-sm flex items-center gap-2">
              <Settings className="w-4 h-4 text-emerald-400" />
              <span>প্ল্যাটফর্ম নোটিশ ও মনিট্যাগ কনফিগারেশন</span>
            </h3>

            <form onSubmit={handleSaveSettings} className="space-y-4 text-xs">
              <div>
                <label className="text-slate-300 block mb-1 font-semibold">সাইট নোটিশ (মারকুই স্ক্রোল ব্যানার)</label>
                <textarea
                  rows={2}
                  value={siteNotice}
                  onChange={(e) => setSiteNotice(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="noticeActive"
                  checked={noticeActive}
                  onChange={(e) => setNoticeActive(e.target.checked)}
                  className="rounded bg-slate-950 border-slate-800 text-emerald-500 focus:ring-0"
                />
                <label htmlFor="noticeActive" className="text-slate-300 cursor-pointer">
                  নোটিশ ব্যানার সক্রিয় রাখুন
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <div>
                  <label className="text-slate-300 block mb-1">সর্বনিম্ন উত্তোলন (টাকা ৳)</label>
                  <input
                    type="number"
                    value={minWithdrawal}
                    onChange={(e) => setMinWithdrawal(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-slate-300 block mb-1">সর্বনিম্ন রেফার সংখ্যা</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="০"
                    value={minReferralsToWithdraw}
                    onChange={(e) => setMinReferralsToWithdraw(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-slate-300 block mb-1">দৈনিক বোনাস (টাকা ৳)</label>
                  <input
                    type="number"
                    value={dailyBonusAmount}
                    onChange={(e) => setDailyBonusAmount(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 block mb-1">রেফারেল ডিরেক্ট বোনাস (টাকা ৳)</label>
                  <input
                    type="number"
                    value={referralBonus}
                    onChange={(e) => setReferralBonus(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-slate-300 block mb-1">Monetag Zone ID (মনিট্যাগ জোন)</label>
                  <input
                    type="text"
                    value={monetagZoneId}
                    onChange={(e) => setMonetagZoneId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={savingSettings}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:brightness-110 active:scale-95 text-slate-950 font-bold text-xs uppercase tracking-wider transition cursor-pointer shadow-md flex items-center justify-center gap-1.5"
              >
                <Save className="w-4 h-4" />
                <span>{savingSettings ? 'সেভ হচ্ছে...' : 'সেটিংস সেভ করুন (Save Settings)'}</span>
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
