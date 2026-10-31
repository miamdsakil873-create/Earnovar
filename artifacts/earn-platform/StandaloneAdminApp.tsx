import React, { useState, useEffect } from 'react';
import { api } from './services/api.ts';
import { notifyDataUpdated } from './services/liveSync.ts';
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
  Search,
  AlertCircle,
  Save,
  Send,
  Eye,
  Wallet,
  ArrowRight,
  LogOut,
  Globe,
  Bell,
  HelpCircle,
  Ticket,
  MoreHorizontal,
  Sparkles,
} from 'lucide-react';

import {
  firebaseTasks,
  firebaseSettings,
  firebaseAds,
  firebaseWithdrawals,
  firebaseSubmissions,
  firebaseUsers,
  firebaseVouchers,
  firebaseSeedCatalog,
} from './services/firebaseService.ts';

interface StandaloneAdminAppProps {
  onBackToUser?: () => void;
}

export const StandaloneAdminApp: React.FC<StandaloneAdminAppProps> = ({ onBackToUser }) => {
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

  // Active Admin Tab: Essential tabs on top, other features in 3-dots menu
  const [activeTab, setActiveTab] = useState<'tasks' | 'ads' | 'withdrawals' | 'vouchers' | 'users' | 'proofs' | 'settings'>('tasks');
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);

  // Form states for creating a task
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskCategory, setNewTaskCategory] = useState('TELEGRAM');
  const [newTaskReward, setNewTaskReward] = useState('10');
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

  // Form states for Vouchers / Redeem Codes
  const [newVoucherCode, setNewVoucherCode] = useState('');
  const [newVoucherAmount, setNewVoucherAmount] = useState('20');
  const [newVoucherMaxUses, setNewVoucherMaxUses] = useState('100');
  const [creatingVoucher, setCreatingVoucher] = useState(false);
  const [vouchersList, setVouchersList] = useState<any[]>([]);

  // Settings form states
  const [siteNotice, setSiteNotice] = useState('');
  const [noticeActive, setNoticeActive] = useState(true);
  const [supportTelegram, setSupportTelegram] = useState('https://t.me/EarnWatchBotSupport');
  const [minWithdrawal, setMinWithdrawal] = useState('50');
  const [minReferralsToWithdraw, setMinReferralsToWithdraw] = useState('0');
  const [monetagZoneId, setMonetagZoneId] = useState('9537184');
  const [dailyBonusAmount, setDailyBonusAmount] = useState('5');
  const [referralBonus, setReferralBonus] = useState('10');
  const [savingSettings, setSavingSettings] = useState(false);

  // User search
  const [userSearch, setUserSearch] = useState('');

  // Toast notification
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  // Fetch Live Data
  const fetchAdminData = async () => {
    setLoading(true);
    try {
      let res: any = null;
      try {
        res = await api.adminGetData(pin);
      } catch (e) {}

      // Fetch Firebase live documents including all cloud users
      const [fbUsers, fbTasks, fbSettings, fbAds, fbWithdrawals, fbSubmissions, fbVouchers] = await Promise.all([
        firebaseUsers.getAll().catch(() => []),
        firebaseTasks.getAll().catch(() => []),
        firebaseSettings.get().catch(() => null),
        firebaseAds.getAll ? firebaseAds.getAll().catch(() => []) : Promise.resolve([]),
        firebaseWithdrawals.getAll ? firebaseWithdrawals.getAll().catch(() => []) : Promise.resolve([]),
        firebaseSubmissions.getAll ? firebaseSubmissions.getAll().catch(() => []) : Promise.resolve([]),
        firebaseVouchers.getAll ? firebaseVouchers.getAll().catch(() => []) : Promise.resolve([]),
      ]);

      setVouchersList(fbVouchers || []);

      const tasks = (fbTasks && fbTasks.length > 0) ? fbTasks : (res?.tasks || []);
      const ads = (fbAds && fbAds.length > 0) ? fbAds : (res?.ads || []);
      const settings = fbSettings || res?.settings;

      // Merge cloud users and local users
      const userMap = new Map();
      fbUsers.forEach((u) => userMap.set(u.phone || u.id, u));
      (res?.users || []).forEach((u: any) => {
        const k = u.phone || u.id;
        if (!userMap.has(k)) userMap.set(k, u);
      });
      const allUsers = Array.from(userMap.values());

      const withdrawalsList = (fbWithdrawals && fbWithdrawals.length > 0) ? fbWithdrawals : (res?.withdrawals || []);
      const proofsList = (fbSubmissions && fbSubmissions.length > 0) ? fbSubmissions : (res?.taskSubmissions || []);

      const pendingW = withdrawalsList.filter((w: any) => w.status === 'PENDING');
      const paidW = withdrawalsList.filter((w: any) => w.status === 'COMPLETED');

      setLiveData({
        stats: res?.stats || {
          totalUsers: allUsers.length || 0,
          totalBalance: allUsers.reduce((s, u: any) => s + (Number(u.balance) || 0), 0),
          totalWithdrawn: allUsers.reduce((s, u: any) => s + (Number(u.totalWithdrawn) || 0), 0),
          pendingWithdrawalsCount: pendingW.length,
          pendingWithdrawalsAmount: pendingW.reduce((s: number, w: any) => s + (Number(w.amount) || 0), 0),
          paidWithdrawalsAmount: paidW.reduce((s: number, w: any) => s + (Number(w.amount) || 0), 0),
        },
        users: allUsers,
        withdrawals: withdrawalsList,
        tasks,
        taskSubmissions: proofsList,
        ads,
        settings,
      });

      if (settings) {
        setSiteNotice(settings.siteNotice || '');
        setNoticeActive(settings.noticeActive ?? true);
        if (settings.supportTelegram) setSupportTelegram(settings.supportTelegram);
        setMinWithdrawal(String(settings.minWithdrawal || '50'));
        setMinReferralsToWithdraw(String(settings.minReferralsToWithdraw ?? '0'));
        setMonetagZoneId(settings.monetag?.zoneId || '9537184');
        setDailyBonusAmount(String(settings.dailyBonusAmount || '5'));
        setReferralBonus(String(settings.referralDirectBonus || '10'));
      }
    } catch (err: any) {
      console.error('Failed to load admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateVoucher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVoucherCode.trim()) return;
    setCreatingVoucher(true);
    try {
      const res = await firebaseVouchers.add({
        code: newVoucherCode.trim().toUpperCase(),
        amount: parseFloat(newVoucherAmount) || 20,
        maxUses: parseInt(newVoucherMaxUses, 10) || 100,
      });
      if (res.success) {
        showToast(`🎉 নতুন ভাউচার কোড "${newVoucherCode.trim().toUpperCase()}" সফলভাবে যুক্ত হয়েছে!`);
        setNewVoucherCode('');
        fetchAdminData();
      } else {
        showToast(res.message || 'ভাউচার তৈরি ব্যর্থ', 'error');
      }
    } catch (err: any) {
      showToast('ভাউচার তৈরি ব্যর্থ', 'error');
    } finally {
      setCreatingVoucher(false);
    }
  };

  const handleDeleteVoucher = async (code: string) => {
    if (!window.confirm(`ভাউচার কোড "${code}" ডিলিট করতে চান?`)) return;
    try {
      await firebaseVouchers.delete(code);
      showToast(`ভাউচার কোড "${code}" ডিলিট করা হয়েছে`);
      fetchAdminData();
    } catch (e) {
      showToast('ডিলিট ব্যর্থ', 'error');
    }
  };

  const handleSeedCatalog = async () => {
    if (!window.confirm('আপনি কি নিশ্চিত যে ৪০টি মনিট্যাগ টাস্ক ও ৩০টি ভিডিও বিজ্ঞাপন Firebase RTDB-তে সিঙ্ক করতে চান?')) return;
    setLoading(true);
    try {
      const res = await firebaseSeedCatalog();
      if (res.success) {
        showToast('🎉 ৪০টি টাস্ক এবং ৩০টি ভিডিও বিজ্ঞাপন সফলভাবে Firebase-এ সিঙ্ক হয়েছে!');
        fetchAdminData();
      } else {
        showToast('সিঙ্ক ব্যর্থ হয়েছে', 'error');
      }
    } catch (e: any) {
      showToast('সিঙ্ক ত্রুটি: ' + (e.message || ''), 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isUnlocked) {
      fetchAdminData();
      const interval = setInterval(fetchAdminData, 10000);
      return () => clearInterval(interval);
    }
  }, [isUnlocked, pin]);

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinError(null);
    setLoading(true);
    const entered = pin.trim();
    const isDirectMatch = entered === 'Earnova017@' || entered === '889900';

    try {
      let isVerified = isDirectMatch;
      let res: any = null;
      try {
        res = await api.adminGetData(entered);
        if (res && res.success) {
          isVerified = true;
        }
      } catch (err) {}

      if (isVerified) {
        setIsUnlocked(true);
        if (res && res.settings) {
          setSiteNotice(res.settings.siteNotice || '');
          setNoticeActive(res.settings.noticeActive ?? true);
          setMinWithdrawal(String(res.settings.minWithdrawal || '50'));
          setMonetagZoneId(res.settings.monetag?.zoneId || '9537184');
          setDailyBonusAmount(String(res.settings.dailyBonusAmount || '5'));
          setReferralBonus(String(res.settings.referralDirectBonus || '10'));
        }
        showToast('🎉 অ্যাডমিন প্যানেল সফলভাবে আনলক হয়েছে!');
      } else {
        setPinError('ভুল অ্যাডমিন পাসওয়ার্ড বা পিন প্রদান করা হয়েছে!');
      }
    } catch (err: any) {
      setPinError('যাচাই ব্যর্থ হয়েছে। অনুগ্রহ করে পাসওয়ার্ড চেক করুন।');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setIsUnlocked(false);
    setPin('');
  };

  // Create Task Action (Saves to Firebase Firestore and local API)
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim() || !newTaskUrl.trim()) {
      showToast('টাস্কের শিরোনাম ও লিংক দেওয়া আবশ্যক', 'error');
      return;
    }
    setCreatingTask(true);
    try {
      const taskData = {
        title: newTaskTitle.trim(),
        category: newTaskCategory,
        rewardAmount: parseFloat(newTaskReward) || 10,
        taskUrl: newTaskUrl.trim(),
        url: newTaskUrl.trim(),
        description: newTaskDesc.trim() || 'টাস্ক সম্পন্ন করুন এবং নির্ধারিত রিওয়ার্ড পান।',
        proofPlaceholder: newTaskProofPlaceholder.trim() || 'প্রমাণ হিসেবে আপনার তথ্য লিখুন',
        instructions: ['টাস্কের লিংকে যান', 'প্রমাণ হিসেবে আপনার ইউজারনেম বা তথ্য দিন'],
        active: true,
      };

      // 1. Add to Firebase Firestore (Realtime global sync for Vercel users)
      await firebaseTasks.add(taskData);

      // 2. Also save to server API
      await api.adminAddTask(pin, taskData).catch(() => {});

      showToast('🎉 নতুন টাস্ক Firebase ডাটাবেসে সেভ হয়েছে এবং Vercel ইউজারদের জন্য লাইভ হয়েছে!');
      setNewTaskTitle('');
      setNewTaskUrl('');
      setNewTaskDesc('');
      setNewTaskProofPlaceholder('');
      notifyDataUpdated({ action: 'TASK_CREATED' });
      fetchAdminData();
    } catch (err: any) {
      showToast(err.message || 'টাস্ক তৈরি ব্যর্থ হয়েছে', 'error');
    } finally {
      setCreatingTask(false);
    }
  };

  // Delete Task Action
  const handleDeleteTask = async (taskId: string) => {
    if (!window.confirm('আপনি কি সত্যিই এই টাস্কটি ডিলিট করতে চান?')) return;
    try {
      await firebaseTasks.delete(taskId).catch(() => {});
      await api.adminDeleteTask(pin, taskId).catch(() => {});
      showToast('টাস্ক সফলভাবে ডিলিট করা হয়েছে!');
      notifyDataUpdated({ action: 'TASK_DELETED', taskId });
      fetchAdminData();
    } catch (err: any) {
      showToast('টাস্ক ডিলিট করা যায়নি', 'error');
    }
  };

  // Approve / Reject Proof Action
  const handleProofAction = async (submissionId: string, action: 'APPROVE' | 'REJECT') => {
    try {
      await firebaseSubmissions.updateStatus(submissionId, action === 'APPROVE' ? 'APPROVED' : 'REJECTED').catch(() => {});
      if (action === 'APPROVE') {
        await api.adminApproveTaskProof(pin, submissionId).catch(() => ({ success: true }));
      } else {
        await api.adminRejectTaskProof(pin, submissionId).catch(() => ({ success: true }));
      }
      showToast(action === 'APPROVE' ? '✅ প্রুফ অনুমোদিত ও ব্যালেন্স যোগ হয়েছে!' : '❌ প্রুফ বাতিল করা হয়েছে');
      notifyDataUpdated({ action: 'PROOF_REVIEWED', submissionId });
      fetchAdminData();
    } catch (err: any) {
      showToast('সার্ভার সমস্যা', 'error');
    }
  };

  // Withdrawal Action (Approve / Reject)
  const handleWithdrawalAction = async (withdrawalId: string, action: 'APPROVE' | 'REJECT') => {
    try {
      await firebaseWithdrawals.updateStatus(withdrawalId, action === 'APPROVE' ? 'COMPLETED' : 'REJECTED').catch(() => {});
      await api.adminWithdrawalAction(pin, withdrawalId, action).catch(() => ({ success: true }));
      showToast(action === 'APPROVE' ? '✅ উত্তোলন সফল (COMPLETED) করা হয়েছে!' : 'উত্তোলন বাতিল ও টাকা ফেরত দেওয়া হয়েছে');
      notifyDataUpdated({ action: 'WITHDRAWAL_ACTION', withdrawalId });
      fetchAdminData();
    } catch (err: any) {
      showToast('সার্ভার সমস্যা', 'error');
    }
  };

  // Create Ad Action (Saves to Firebase & API)
  const handleCreateAd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdTitle.trim()) return;
    setCreatingAd(true);
    try {
      const adData = {
        title: newAdTitle.trim(),
        sponsorName: newAdSponsor.trim() || 'Earnova Partner',
        rewardAmount: parseFloat(newAdReward) || 3,
        durationSeconds: parseInt(newAdDuration, 10) || 15,
        thumbnail: newAdThumbnail.trim() || 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=600&q=80',
        active: true,
      };

      await firebaseAds.add(adData).catch(() => {});
      await api.adminAddAd(pin, adData).catch(() => {});

      showToast('🎉 নতুন ভিডিও বিজ্ঞাপন Firebase-এ যুক্ত হয়েছে!');
      setNewAdTitle('');
      setNewAdSponsor('');
      notifyDataUpdated({ action: 'AD_CREATED' });
      fetchAdminData();
    } catch (err: any) {
      showToast('বিজ্ঞাপন তৈরি ব্যর্থ', 'error');
    } finally {
      setCreatingAd(false);
    }
  };

  // Delete Ad Action
  const handleDeleteAd = async (adId: string) => {
    if (!window.confirm('বিজ্ঞাপনটি ডিলিট করতে চান?')) return;
    try {
      await firebaseAds.delete(adId).catch(() => {});
      await api.adminDeleteAd(pin, adId).catch(() => {});
      showToast('বিজ্ঞাপন ডিলিট করা হয়েছে');
      notifyDataUpdated({ action: 'AD_DELETED', adId });
      fetchAdminData();
    } catch (err: any) {
      showToast('ডিলিট ব্যর্থ', 'error');
    }
  };

  // Save Settings Action (Saves to Firebase & API)
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      const settingsPayload = {
        siteNotice,
        noticeActive,
        supportTelegram: (supportTelegram || '').trim(),
        minWithdrawal: parseFloat(minWithdrawal) || 50,
        minReferralsToWithdraw: parseInt(minReferralsToWithdraw, 10) || 0,
        monetag: {
          zoneId: monetagZoneId,
          active: true,
        },
        dailyBonusAmount: parseFloat(dailyBonusAmount) || 5,
        referralDirectBonus: parseFloat(referralBonus) || 10,
      };

      await firebaseSettings.update(settingsPayload).catch(() => {});
      await api.adminUpdateSettings(pin, settingsPayload).catch(() => {});

      showToast('🎉 সেটিংস ও সাইট নোটিশ Firebase-এ লাইভ আপডেট হয়েছে!');
      notifyDataUpdated({ action: 'SETTINGS_UPDATED' });
      fetchAdminData();
    } catch (err: any) {
      showToast('সেটিংস আপডেট ব্যর্থ', 'error');
    } finally {
      setSavingSettings(false);
    }
  };

  // Add Bonus to User (Updates Firebase cloud and local API)
  const handleAddBonus = async (userId: string, amount: number) => {
    try {
      const targetUser = (liveData?.users || []).find((u) => u.id === userId || u.phone === userId || u.phoneKey === userId);
      const userPhone = targetUser?.phone || targetUser?.phoneKey || userId;
      const currentBal = Number(targetUser?.balance) || 0;
      const currentEarned = Number(targetUser?.totalEarned) || 0;
      const newBal = currentBal + amount;
      const newEarned = currentEarned + amount;

      // 1. Live update in Firebase cloud under settings/users/{phone}.json
      await firebaseUsers.updateBalance(userPhone, newBal, newEarned);

      // 2. Also call API
      await api.adminUpdateUserBalance(pin, userId, amount).catch(() => {});

      showToast(`৳${amount} টাকা ${targetUser?.name || 'ইউজার'}-এর অ্যাকাউন্টে যোগ হয়েছে!`);
      notifyDataUpdated({ action: 'USER_BALANCE_UPDATED', userId });
      fetchAdminData();
    } catch (err: any) {
      showToast('ব্যালেন্স আপডেট ব্যর্থ', 'error');
    }
  };

  // Ban/Unban user (Updates Firebase cloud and local API)
  const handleToggleUserStatus = async (userId: string) => {
    try {
      const targetUser = (liveData?.users || []).find((u) => u.id === userId || u.phone === userId || u.phoneKey === userId);
      const userPhone = targetUser?.phone || targetUser?.phoneKey || userId;
      const newStatus = targetUser?.status === 'ACTIVE' ? 'BANNED' : 'ACTIVE';

      await firebaseUsers.toggleStatus(userPhone, newStatus);
      await api.adminToggleUserStatus(pin, userId).catch(() => {});

      showToast(`ইউজার স্ট্যাটাস পরিবর্তন হয়েছে: ${newStatus}`);
      notifyDataUpdated({ action: 'USER_STATUS_UPDATED', userId });
      fetchAdminData();
    } catch (err: any) {
      showToast('স্ট্যাটাস পরিবর্তন করা যায়নি', 'error');
    }
  };

  const filteredUsers = (liveData?.users || []).filter((u) => {
    if (!userSearch) return true;
    const q = userSearch.toLowerCase();
    return (
      (u.name && u.name.toLowerCase().includes(q)) ||
      (u.phone && u.phone.includes(q)) ||
      (u.email && u.email.toLowerCase().includes(q)) ||
      (u.referralCode && u.referralCode.toLowerCase().includes(q))
    );
  });

  const pendingWithdrawals = (liveData?.withdrawals || []).filter((w) => w.status === 'PENDING');
  const pendingProofs = (liveData?.taskSubmissions || []).filter((p) => p.status === 'PENDING');

  // ==================== AUTH / PIN LOCK SCREEN ====================
  if (!isUnlocked) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 font-sans select-none">
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
          <div className="text-center space-y-2">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-500 via-teal-400 to-amber-300 p-0.5 mx-auto shadow-xl shadow-emerald-500/20">
              <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center text-2xl font-black text-emerald-400">
                👑
              </div>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">Earnova আলাদা অ্যাডমিন প্যানেল</h1>
            <p className="text-xs text-slate-400">
              ইউজার প্যানেল থেকে সম্পূর্ণ পৃথক ও সরাসরি ডাটাবেজ কন্ট্রোল
            </p>
          </div>

          <form onSubmit={handleUnlock} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-emerald-400" />
                অ্যাডমিন পাসওয়ার্ড বা পিন দিন:
              </label>
              <input
                type="password"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="পাসওয়ার্ড লিখুন..."
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3.5 text-center text-lg text-white font-mono tracking-widest focus:outline-none focus:border-emerald-500 transition shadow-inner"
                autoComplete="new-password"
                autoFocus
                required
              />
            </div>

            {pinError && (
              <div className="p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{pinError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:brightness-110 active:scale-95 text-slate-950 font-black text-xs uppercase tracking-wider transition shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>যাচাই হচ্ছে...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>অ্যাডমিন প্যানেলে প্রবেশ করুন</span>
                </>
              )}
            </button>
          </form>

          <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <span>সুরক্ষিত অ্যাডমিন কন্ট্রোল</span>
            {onBackToUser && (
              <button
                type="button"
                onClick={onBackToUser}
                className="text-slate-400 hover:text-white underline cursor-pointer"
              >
                ইউজার সাইটে ফিরে যান
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ==================== UNLOCKED STANDALONE DASHBOARD ====================
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col selection:bg-emerald-500 selection:text-slate-950">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-4 left-4 right-4 z-50 flex justify-center pointer-events-none">
          <div
            className={`max-w-md w-full p-3.5 rounded-xl shadow-2xl flex items-center gap-2.5 text-xs font-bold pointer-events-auto transition-all animate-in slide-in-from-top ${
              toast.type === 'success'
                ? 'bg-emerald-500 text-slate-950 shadow-emerald-500/30'
                : 'bg-red-500 text-white shadow-red-500/30'
            }`}
          >
            {toast.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            <span className="flex-1">{toast.message}</span>
          </div>
        </div>
      )}

      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 px-4 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-slate-950 font-bold shadow-md shadow-emerald-500/20">
              <span className="text-lg">👑</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base tracking-tight bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">
                  Earnova Master Admin
                </span>
                <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  LIVE CONNECTED
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">সরাসরি ডাটাবেজ নিয়ন্ত্রণ ও তাৎক্ষণিক ইউজার সিঙ্ক</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                fetchAdminData();
                showToast('ডাটা রিফ্রেশ করা হয়েছে');
              }}
              disabled={loading}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs flex items-center gap-1.5 transition cursor-pointer"
              title="রিয়েল-টাইম রিফ্রেশ"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
              <span className="hidden sm:inline">রিফ্রেশ</span>
            </button>

            <a
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center gap-1.5 transition"
              title="নতুন ট্যাবে ইউজার সাইট ওপেন করুন"
            >
              <Globe className="w-3.5 h-3.5" />
              <span className="hidden md:inline">ইউজার সাইট দেখুন</span>
              <ExternalLink className="w-3 h-3" />
            </a>

            <button
              onClick={handleLogout}
              className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs flex items-center gap-1 transition cursor-pointer"
              title="লগআউট"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">লগআউট</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Body */}
      <main className="max-w-6xl w-full mx-auto px-3 sm:px-4 py-4 space-y-4 flex-1">
        {/* Fast Metrics Cards with Total Signups clearly visible */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
          <div className="p-3.5 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Users className="w-4 h-4 text-emerald-400" />
                মোট সাইনআপ
              </span>
              <span className="text-[9px] uppercase px-1.5 py-0.2 bg-emerald-500/20 text-emerald-400 rounded-full font-mono font-bold">
                TOTAL
              </span>
            </div>
            <p className="text-2xl font-black text-emerald-400 mt-1 font-mono">
              {liveData?.users?.length || 0} <span className="text-xs font-sans font-normal text-slate-400">জন</span>
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5">সব ডিভাইসের নিবন্ধিত ইউজার</p>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Wallet className="w-4 h-4 text-amber-400" />
                অপেক্ষমান উত্তোলন
              </span>
            </div>
            <p className="text-2xl font-black text-amber-400 mt-1 font-mono">
              ৳{(liveData?.stats?.pendingWithdrawalsAmount || 0).toFixed(2)}
            </p>
            <p className="text-[10px] text-amber-500/80 mt-0.5 font-bold">
              {pendingWithdrawals.length} টি রিকোয়েস্ট পেন্ডিং
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                মোট পরিশোধ
              </span>
            </div>
            <p className="text-2xl font-black text-emerald-400 mt-1 font-mono">
              ৳{(liveData?.stats?.completedWithdrawalsAmount || 0).toFixed(2)}
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5">সফল পেমেন্ট হিস্ট্রি</p>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <CheckSquare className="w-4 h-4 text-sky-400" />
                টাস্ক ও বিজ্ঞাপন
              </span>
            </div>
            <p className="text-2xl font-black text-sky-400 mt-1 font-mono">
              {liveData?.tasks?.length || 0} / {liveData?.ads?.length || 0}
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5">ভাউচার কোড: {vouchersList.length} টি</p>
          </div>
        </div>

        {/* Tab Navigation: Essential tabs on primary bar, others in 3-dots dropdown */}
        <div className="flex items-center justify-between gap-2 p-1.5 rounded-2xl bg-slate-900 border border-slate-800 text-xs">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {/* Primary Tab 1: Tasks */}
            <button
              onClick={() => { setActiveTab('tasks'); setMoreMenuOpen(false); }}
              className={`px-3.5 py-2 rounded-xl font-bold flex items-center gap-1.5 shrink-0 transition cursor-pointer ${
                activeTab === 'tasks' ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20' : 'text-slate-400 hover:text-white'
              }`}
            >
              <CheckSquare className="w-3.5 h-3.5" />
              <span>টাস্ক ({liveData?.tasks?.length || 0})</span>
            </button>

            {/* Primary Tab 2: Ads */}
            <button
              onClick={() => { setActiveTab('ads'); setMoreMenuOpen(false); }}
              className={`px-3.5 py-2 rounded-xl font-bold flex items-center gap-1.5 shrink-0 transition cursor-pointer ${
                activeTab === 'ads' ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Tv className="w-3.5 h-3.5" />
              <span>বিজ্ঞাপন ({liveData?.ads?.length || 0})</span>
            </button>

            {/* Primary Tab 3: Withdrawals */}
            <button
              onClick={() => { setActiveTab('withdrawals'); setMoreMenuOpen(false); }}
              className={`px-3.5 py-2 rounded-xl font-bold flex items-center gap-1.5 shrink-0 transition cursor-pointer relative ${
                activeTab === 'withdrawals' ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Wallet className="w-3.5 h-3.5" />
              <span>উত্তোলন</span>
              {pendingWithdrawals.length > 0 && (
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                  activeTab === 'withdrawals' ? 'bg-slate-950 text-amber-400' : 'bg-amber-500 text-slate-950'
                }`}>
                  {pendingWithdrawals.length}
                </span>
              )}
            </button>
          </div>

          {/* 3-Dots More Options Menu */}
          <div className="relative">
            <button
              onClick={() => setMoreMenuOpen(!moreMenuOpen)}
              className={`px-3 py-2 rounded-xl font-bold flex items-center gap-1.5 transition cursor-pointer ${
                ['vouchers', 'users', 'proofs', 'settings'].includes(activeTab) || moreMenuOpen
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                  : 'bg-slate-950 text-slate-300 hover:text-white border border-slate-700'
              }`}
              title="আরও অপশন"
            >
              <MoreHorizontal className="w-4 h-4 text-emerald-400" />
              <span className="font-bold">••• আরও</span>
            </button>

            {/* Dropdown Menu */}
            {moreMenuOpen && (
              <div className="absolute right-0 top-full mt-2 w-60 rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl p-1.5 z-50 space-y-1 animate-in fade-in zoom-in-95">
                <button
                  onClick={() => { setActiveTab('vouchers'); setMoreMenuOpen(false); }}
                  className={`w-full px-3 py-2.5 rounded-xl font-bold text-left flex items-center gap-2 transition cursor-pointer ${
                    activeTab === 'vouchers' ? 'bg-emerald-500 text-slate-950' : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <Ticket className="w-4 h-4 text-amber-400" />
                  <span>🎟️ রিডিম কোড / ভাউচার ({vouchersList.length})</span>
                </button>

                <button
                  onClick={() => { setActiveTab('users'); setMoreMenuOpen(false); }}
                  className={`w-full px-3 py-2.5 rounded-xl font-bold text-left flex items-center gap-2 transition cursor-pointer ${
                    activeTab === 'users' ? 'bg-emerald-500 text-slate-950' : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <Users className="w-4 h-4 text-sky-400" />
                  <span>👥 ইউজার তালিকা ({liveData?.users?.length || 0})</span>
                </button>

                <button
                  onClick={() => { setActiveTab('proofs'); setMoreMenuOpen(false); }}
                  className={`w-full px-3 py-2.5 rounded-xl font-bold text-left flex items-center gap-2 transition cursor-pointer ${
                    activeTab === 'proofs' ? 'bg-emerald-500 text-slate-950' : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <Eye className="w-4 h-4 text-purple-400" />
                  <span>👁️ জমা দেওয়া প্রুফ ({pendingProofs.length})</span>
                </button>

                <button
                  onClick={() => { setActiveTab('settings'); setMoreMenuOpen(false); }}
                  className={`w-full px-3 py-2.5 rounded-xl font-bold text-left flex items-center gap-2 transition cursor-pointer ${
                    activeTab === 'settings' ? 'bg-emerald-500 text-slate-950' : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <Settings className="w-4 h-4 text-emerald-400" />
                  <span>⚙️ সাইট সেটিংস ও টেলিগ্রাম</span>
                </button>

                <div className="pt-1 border-t border-slate-800">
                  <button
                    onClick={() => { setMoreMenuOpen(false); handleSeedCatalog(); }}
                    className="w-full px-3 py-2.5 rounded-xl font-bold text-left flex items-center gap-2 text-amber-400 hover:bg-amber-500/10 transition cursor-pointer"
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span>🔄 ৪০টি টাস্ক ও ৩০টি এডস সিঙ্ক</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ================= TAB 1: TASKS ================= */}
        {activeTab === 'tasks' && (
          <div className="space-y-4">
            {/* Create New Task Form */}
            <div className="p-4 sm:p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
              <div className="flex items-center gap-2">
                <PlusCircle className="w-4 h-4 text-emerald-400" />
                <h3 className="font-bold text-sm text-white">নতুন টাস্ক বা মাইক্রো জব তৈরি করুন</h3>
              </div>

              <form onSubmit={handleCreateTask} className="space-y-3 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2 space-y-1">
                    <label className="text-slate-300 font-semibold">টাস্কের শিরোনাম (Title):</label>
                    <input
                      type="text"
                      value={newTaskTitle}
                      onChange={(e) => setNewTaskTitle(e.target.value)}
                      placeholder="যেমন: অফিসিয়াল টেলিগ্রাম চ্যানেলে জয়েন করুন"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-slate-300 font-semibold">ক্যাটেগরি:</label>
                    <select
                      value={newTaskCategory}
                      onChange={(e) => setNewTaskCategory(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                    >
                      <option value="TELEGRAM">📢 টেলিগ্রাম চ্যানেল/গ্রুপ</option>
                      <option value="SOCIAL">🌐 সোশ্যাল মিডিয়া (YouTube/FB)</option>
                      <option value="APP">📱 অ্যাপ ইন্সটল ও রিভিউ</option>
                      <option value="SURVEY">📝 সার্ভে / কুইজ</option>
                      <option value="WEBSITE">💻 ওয়েবসাইট ভিজিট</option>
                      <option value="OTHER">⚡ অন্যান্য মাইক্রো জব</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-slate-300 font-semibold">পুরস্কারের পরিমাণ (টাকা):</label>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-emerald-400 font-bold font-mono">৳</span>
                      <input
                        type="number"
                        step="0.5"
                        value={newTaskReward}
                        onChange={(e) => setNewTaskReward(e.target.value)}
                        placeholder="15"
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-8 pr-3 py-2 text-white font-mono font-bold focus:outline-none focus:border-emerald-500"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-slate-300 font-semibold">কাজের লিংক বা ইউআরএল (Task URL):</label>
                    <input
                      type="url"
                      value={newTaskUrl}
                      onChange={(e) => setNewTaskUrl(e.target.value)}
                      placeholder="https://t.me/your_channel"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold">কাজের বিস্তারিত নির্দেশনা (Description):</label>
                  <textarea
                    rows={2}
                    value={newTaskDesc}
                    onChange={(e) => setNewTaskDesc(e.target.value)}
                    placeholder="ইউজারকে কী কী করতে হবে তা স্পষ্টভাবে বাংলায় লিখুন..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold">প্রমাণের নির্দেশনা (Proof placeholder text):</label>
                  <input
                    type="text"
                    value={newTaskProofPlaceholder}
                    onChange={(e) => setNewTaskProofPlaceholder(e.target.value)}
                    placeholder="যেমন: আপনার টেলিগ্রাম ইউজারনেম লিখুন (যেমন: @user123)"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={creatingTask}
                  className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-lg shadow-emerald-500/20 disabled:opacity-50"
                >
                  {creatingTask ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>সেভ হচ্ছে...</span>
                    </>
                  ) : (
                    <>
                      <PlusCircle className="w-3.5 h-3.5" />
                      <span>টাস্ক পাবলিশ করুন (সরাসরি লাইভ হবে)</span>
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* Existing Tasks List */}
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-xs text-slate-300 uppercase tracking-wider">
                  বিদ্যমান টাস্ক তালিকা ({liveData?.tasks?.length || 0})
                </h3>
              </div>

              {(!liveData?.tasks || liveData.tasks.length === 0) ? (
                <div className="p-8 text-center text-slate-500 text-xs">কোনো টাস্ক তৈরি করা নেই।</div>
              ) : (
                <div className="space-y-2.5">
                  {liveData.tasks.map((task: any) => (
                    <div
                      key={task.id}
                      className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white text-sm">{task.title}</span>
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold">
                            {task.category}
                          </span>
                        </div>
                        <p className="text-slate-400 text-[11px]">{task.description}</p>
                        <a
                          href={task.taskUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sky-400 hover:underline flex items-center gap-1 text-[11px]"
                        >
                          <span>{task.taskUrl}</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>

                      <div className="flex items-center gap-3 shrink-0 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-850">
                        <div className="text-right">
                          <span className="font-mono font-bold text-emerald-400 text-base">
                            ৳{Number(task.rewardAmount || 15).toFixed(2)}
                          </span>
                        </div>
                        <button
                          onClick={() => handleDeleteTask(task.id)}
                          className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition cursor-pointer"
                          title="টাস্ক ডিলিট করুন"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================= TAB 2: TASK SUBMISSIONS (PROOFS) ================= */}
        {activeTab === 'proofs' && (
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
            <h3 className="font-bold text-xs text-slate-300 uppercase tracking-wider">
              ইউজারদের জমা দেওয়া প্রুফ পর্যালোচনা ({liveData?.taskSubmissions?.length || 0})
            </h3>

            {(!liveData?.taskSubmissions || liveData.taskSubmissions.length === 0) ? (
              <div className="p-8 text-center text-slate-500 text-xs">এখন পর্যন্ত কোনো প্রুফ জমা পড়েনি।</div>
            ) : (
              <div className="space-y-2.5">
                {liveData.taskSubmissions.map((sub: any) => (
                  <div
                    key={sub.id}
                    className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-1">
                      <p className="font-bold text-white text-sm">{sub.taskTitle || 'টাস্ক'}</p>
                      <p className="text-slate-400">
                        ইউজার: <span className="text-slate-200 font-bold">{sub.userName || sub.userId}</span>
                      </p>
                      <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 font-mono text-slate-300 text-xs break-all">
                        প্রমাণ: <strong>{sub.proofText || sub.proof}</strong>
                      </div>
                      <p className="text-[10px] text-slate-500">{new Date(sub.submittedAt || Date.now()).toLocaleString('bn-BD')}</p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-mono font-bold text-emerald-400 text-sm">
                        ৳{Number(sub.rewardAmount || 15).toFixed(2)}
                      </span>
                      {sub.status === 'PENDING' ? (
                        <>
                          <button
                            onClick={() => handleProofAction(sub.id, 'APPROVE')}
                            className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1 cursor-pointer transition"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>অনুমোদন ও রিওয়ার্ড প্রদান</span>
                          </button>
                          <button
                            onClick={() => handleProofAction(sub.id, 'REJECT')}
                            className="px-3 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 font-bold text-xs flex items-center gap-1 cursor-pointer transition"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            <span>বাতিল</span>
                          </button>
                        </>
                      ) : (
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          sub.status === 'APPROVED' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                        }`}>
                          {sub.status}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ================= TAB 3: WITHDRAWALS ================= */}
        {activeTab === 'withdrawals' && (
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
            <h3 className="font-bold text-xs text-slate-300 uppercase tracking-wider">
              উত্তোলন রিকোয়েস্ট তালিকা ({liveData?.withdrawals?.length || 0})
            </h3>

            {(!liveData?.withdrawals || liveData.withdrawals.length === 0) ? (
              <div className="p-8 text-center text-slate-500 text-xs">কোনো উত্তোলন রিকোয়েস্ট পাওয়া যায়নি।</div>
            ) : (
              <div className="space-y-3">
                {liveData.withdrawals.map((w: any) => (
                  <div
                    key={w.id}
                    className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs"
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
                      <p className="font-mono text-slate-200 font-bold text-sm tracking-wider">{w.accountNumber}</p>
                      <p className="text-[10px] text-slate-500">{new Date(w.requestedAt || Date.now()).toLocaleString('bn-BD')}</p>
                    </div>

                    <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-800">
                      <div className="text-right">
                        <p className="font-mono font-black text-emerald-400 text-lg">৳{Number(w.amount).toFixed(2)}</p>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          w.status === 'COMPLETED'
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : w.status === 'REJECTED'
                            ? 'bg-red-500/20 text-red-400'
                            : 'bg-amber-500/20 text-amber-300'
                        }`}>
                          {w.status}
                        </span>
                      </div>

                      {w.status === 'PENDING' && (
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleWithdrawalAction(w.id, 'APPROVE')}
                            className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs cursor-pointer shadow-md shadow-emerald-500/20"
                          >
                            অনুমোদন ✅
                          </button>
                          <button
                            onClick={() => handleWithdrawalAction(w.id, 'REJECT')}
                            className="px-3 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 font-bold text-xs cursor-pointer"
                          >
                            বাতিল ও রিফান্ড ❌
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ================= TAB 4: ADS ================= */}
        {activeTab === 'ads' && (
          <div className="space-y-4">
            {/* Create Ad Form */}
            <div className="p-4 sm:p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
              <div className="flex items-center gap-2">
                <PlusCircle className="w-4 h-4 text-emerald-400" />
                <h3 className="font-bold text-sm text-white">নতুন ভিডিও বিজ্ঞাপন যোগ করুন</h3>
              </div>

              <form onSubmit={handleCreateAd} className="space-y-3 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-slate-300 font-semibold">বিজ্ঞাপনের নাম (Title):</label>
                    <input
                      type="text"
                      value={newAdTitle}
                      onChange={(e) => setNewAdTitle(e.target.value)}
                      placeholder="যেমন: অনলাইন মেগা শপিং ডিসকাউন্ট"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-slate-300 font-semibold">স্পনসরের নাম:</label>
                    <input
                      type="text"
                      value={newAdSponsor}
                      onChange={(e) => setNewAdSponsor(e.target.value)}
                      placeholder="যেমন: Daraz / ShopBD"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-slate-300 font-semibold">রিওয়ার্ড (৳):</label>
                    <input
                      type="number"
                      step="0.5"
                      value={newAdReward}
                      onChange={(e) => setNewAdReward(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-emerald-500"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-slate-300 font-semibold">সময় (সেকেন্ড):</label>
                    <input
                      type="number"
                      value={newAdDuration}
                      onChange={(e) => setNewAdDuration(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-emerald-500"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-slate-300 font-semibold">থাম্বনেইল ইমেজ URL:</label>
                    <input
                      type="url"
                      value={newAdThumbnail}
                      onChange={(e) => setNewAdThumbnail(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={creatingAd}
                  className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>বিজ্ঞাপন পাবলিশ করুন</span>
                </button>
              </form>
            </div>

            {/* Existing Ads */}
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
              <h3 className="font-bold text-xs text-slate-300 uppercase tracking-wider">
                বিদ্যমান বিজ্ঞাপন তালিকা ({liveData?.ads?.length || 0})
              </h3>
              <div className="space-y-2.5">
                {(liveData?.ads || []).map((ad: any) => (
                  <div
                    key={ad.id}
                    className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <img src={ad.thumbnail} alt="" className="w-14 h-10 object-cover rounded-lg bg-slate-900" />
                      <div>
                        <p className="font-bold text-white">{ad.title}</p>
                        <p className="text-[11px] text-slate-400">{ad.sponsorName} • {ad.durationSeconds} সেকেন্ড</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-bold text-amber-400">৳{Number(ad.rewardAmount).toFixed(2)}</span>
                      <button
                        onClick={() => handleDeleteAd(ad.id)}
                        className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 5: USERS ================= */}
        {activeTab === 'users' && (
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <h3 className="font-bold text-xs text-slate-300 uppercase tracking-wider">
                রেজিস্টার্ড ইউজার নিয়ন্ত্রণ ({filteredUsers.length} জন)
              </h3>
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder="নাম, ফোন বা রেফার কোড দিয়ে খুঁজুন..."
                  className="bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500 w-full sm:w-64"
                />
              </div>
            </div>

            <div className="space-y-2.5">
              {filteredUsers.map((u: any) => (
                <div
                  key={u.id}
                  className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-sm">{u.name}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        u.status === 'ACTIVE' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                      }`}>
                        {u.status}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] bg-purple-500/20 text-purple-300 font-bold">
                        রেফার: {u.referralCount || 0}
                      </span>
                    </div>
                    <p className="text-slate-400 font-mono text-[11px]">{u.phone} {u.email ? `• ${u.email}` : ''}</p>
                    <p className="text-[10px] text-slate-500">রেফার কোড: <strong className="text-slate-300 font-mono">{u.referralCode}</strong></p>
                  </div>

                  <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                    <div className="text-right">
                      <p className="font-mono font-bold text-emerald-400 text-sm">ব্যালেন্স: ৳{Number(u.balance || 0).toFixed(2)}</p>
                      <p className="text-[10px] text-slate-500">মোট আয়: ৳{Number(u.totalEarned || 0).toFixed(2)}</p>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleAddBonus(u.id, 50)}
                        className="px-2.5 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 font-bold text-[11px] border border-emerald-500/30 cursor-pointer"
                        title="ইউজারকে ৫০ টাকা বোনাস দিন"
                      >
                        +৳৫০ বোনাস
                      </button>
                      <button
                        onClick={() => handleToggleUserStatus(u.id)}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] cursor-pointer"
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

        {/* ================= TAB: VOUCHERS / REDEEM CODES ================= */}
        {activeTab === 'vouchers' && (
          <div className="space-y-4">
            {/* Create Voucher Form */}
            <div className="p-4 sm:p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm text-white flex items-center gap-2">
                  <Ticket className="w-4 h-4 text-amber-400" />
                  <span>নতুন রিডিম কোড / ভাউচার তৈরি করুন</span>
                </h3>
                <span className="text-[10px] text-slate-400 bg-slate-950 px-2.5 py-1 rounded-full border border-slate-800 font-mono">
                  সক্রিয় ভাউচার: {vouchersList.length} টি
                </span>
              </div>

              <form onSubmit={handleCreateVoucher} className="space-y-3 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-slate-300 font-semibold">ভাউচার কোড (Voucher Code):</label>
                    <input
                      type="text"
                      value={newVoucherCode}
                      onChange={(e) => setNewVoucherCode(e.target.value)}
                      placeholder="e.g. EARN50 বা BONUS100"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono uppercase tracking-wider focus:outline-none focus:border-amber-400"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-slate-300 font-semibold">টাকার পরিমাণ (Amount ৳):</label>
                    <input
                      type="number"
                      step="1"
                      min="1"
                      value={newVoucherAmount}
                      onChange={(e) => setNewVoucherAmount(e.target.value)}
                      placeholder="20"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-amber-400"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-slate-300 font-semibold">সর্বোচ্চ ব্যবহার সীমা (Max Uses):</label>
                    <input
                      type="number"
                      step="1"
                      min="1"
                      value={newVoucherMaxUses}
                      onChange={(e) => setNewVoucherMaxUses(e.target.value)}
                      placeholder="100"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-amber-400"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={creatingVoucher}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:brightness-110 active:scale-95 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-lg shadow-amber-500/20"
                >
                  {creatingVoucher ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>ভাউচার তৈরি হচ্ছে...</span>
                    </>
                  ) : (
                    <>
                      <PlusCircle className="w-3.5 h-3.5" />
                      <span>ভাউচার তৈরি করুন</span>
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* Existing Vouchers List */}
            <div className="p-4 sm:p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
              <h4 className="font-bold text-xs text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <Ticket className="w-3.5 h-3.5 text-amber-400" />
                <span>বিদ্যমান রিডিম কোড তালিকা</span>
              </h4>

              {vouchersList.length === 0 ? (
                <div className="p-6 text-center text-slate-500 text-xs bg-slate-950 rounded-xl border border-slate-800">
                  কোনো ভাউচার কোড পাওয়া যায়নি। উপরে নতুন ভাউচার তৈরি করুন।
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {vouchersList.map((v: any) => (
                    <div
                      key={v.code || v.id}
                      className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-black text-amber-400 text-sm tracking-wider">
                            {v.code}
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400">
                            ৳{v.amount}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400">
                          ব্যবহার: {v.usedCount || 0} / {v.maxUses || 100} জন
                        </p>
                      </div>

                      <button
                        onClick={() => handleDeleteVoucher(v.code)}
                        className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition cursor-pointer"
                        title="ভাউচার ডিলিট করুন"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================= TAB 6: SETTINGS ================= */}
        {activeTab === 'settings' && (
          <div className="p-4 sm:p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
            <h3 className="font-bold text-sm text-white flex items-center gap-2">
              <Settings className="w-4 h-4 text-emerald-400" />
              <span>সাইট সেটিংস ও লাইভ নোটিশ নিয়ন্ত্রণ</span>
            </h3>

            <form onSubmit={handleSaveSettings} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-slate-300 font-semibold flex items-center gap-1.5">
                    <Bell className="w-3.5 h-3.5 text-amber-400" />
                    <span>সাইটের লাইভ নোটিশ (User Panel Notice Bar):</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={noticeActive}
                      onChange={(e) => setNoticeActive(e.target.checked)}
                      className="rounded border-slate-700 text-emerald-500 focus:ring-emerald-500"
                    />
                    <span className="text-[11px] text-slate-400">নোটিশ সক্রিয় রাখুন</span>
                  </label>
                </div>
                <textarea
                  rows={3}
                  value={siteNotice}
                  onChange={(e) => setSiteNotice(e.target.value)}
                  placeholder="সাইটের শীর্ষে প্রদর্শিত নোটিশ বার্তা লিখুন..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-slate-300 font-semibold flex items-center gap-1.5">
                    <Send className="w-3.5 h-3.5 text-sky-400" />
                    <span>অফিসিয়াল টেলিগ্রাম সাপোর্ট গ্রুপ / চ্যানেলের লিংক (Telegram Support Link):</span>
                  </label>
                  <input
                    type="url"
                    value={supportTelegram}
                    onChange={(e) => setSupportTelegram(e.target.value)}
                    placeholder="https://t.me/your_channel_or_group"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-emerald-500"
                  />
                  <p className="text-[10px] text-slate-500">ইউজার প্যানেলে সরাসরি এই টেলিগ্রাম চ্যানেল ও সাপোর্ট বাটনে ক্লিক করে যুক্ত হতে পারবে।</p>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold">সর্বনিম্ন উত্তোলন সীমা (টাকা):</label>
                  <input
                    type="number"
                    value={minWithdrawal}
                    onChange={(e) => setMinWithdrawal(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold">উত্তোলনের জন্য সর্বনিম্ন রেফার সংখ্যা (Min Referrals to Withdraw):</label>
                  <input
                    type="number"
                    min="0"
                    value={minReferralsToWithdraw}
                    onChange={(e) => setMinReferralsToWithdraw(e.target.value)}
                    placeholder="০ হলে কোনো রেফার লাগবে না"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold">রেফার বোনাস (টাকা):</label>
                  <input
                    type="number"
                    value={referralBonus}
                    onChange={(e) => setReferralBonus(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold">দৈনিক লগইন বোনাস (টাকা):</label>
                  <input
                    type="number"
                    value={dailyBonusAmount}
                    onChange={(e) => setDailyBonusAmount(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>

                <div className="space-y-1 sm:col-span-2">
                  <label className="text-slate-300 font-semibold">Monetag Zone ID:</label>
                  <input
                    type="text"
                    value={monetagZoneId}
                    onChange={(e) => setMonetagZoneId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={savingSettings}
                className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-lg shadow-emerald-500/20"
              >
                {savingSettings ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>সংরক্ষণ হচ্ছে...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    <span>সেটিংস পরিবর্তন সেভ করুন (লাইভ আপডেট হবে)</span>
                  </>
                )}
              </button>
            </form>

            {/* Quick Catalog Sync Section */}
            <div className="mt-6 pt-4 border-t border-slate-800 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-950 p-4 rounded-xl border border-slate-800">
                <div>
                  <h4 className="font-bold text-xs text-amber-400 flex items-center gap-1.5">
                    <RefreshCw className="w-4 h-4" />
                    ৪০টি মনিট্যাগ মাইক্রো-টাস্ক ও ৩০টি ভিডিও বিজ্ঞাপন সিঙ্ক
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    ব্যবহারকারীর ৫টি মনিট্যাগ ডাইরেক্ট লিঙ্ক দিয়ে ৪০টি টাস্ক (সর্বোচ্চ ১০ টাকা) এবং ৩০টি ক্যাটাগরি ভিডিও বিজ্ঞাপন ক্লাউড Firebase RTDB-তে সিঙ্ক করুন।
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleSeedCatalog}
                  disabled={loading}
                  className="px-4 py-2.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-bold border border-amber-500/40 cursor-pointer transition flex items-center gap-1.5 text-xs shrink-0"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                  <span>এখনই ডাটা সিঙ্ক করুন</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
