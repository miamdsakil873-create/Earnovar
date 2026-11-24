import {
  firebaseTasks,
  firebaseAds,
  firebaseSettings,
  firebaseWithdrawals,
  firebaseSubmissions,
  firebaseUsers,
  firebaseVouchers,
  firebaseReferrals,
  firebaseTransactions,
} from './firebaseService.ts';
import { notifyDataUpdated } from './liveSync.ts';

const getApiBaseUrl = (): string => {
  const envUrl = (import.meta as any).env?.VITE_API_BASE_URL;
  if (envUrl && typeof envUrl === 'string' && envUrl.trim()) {
    const clean = envUrl.trim().replace(/\/+$/, '');
    return clean.endsWith('/api') ? clean : `${clean}/api`;
  }
  return '/api';
};

const BASE_URL = getApiBaseUrl();

export function getAuthToken(): string | null {
  return localStorage.getItem('earn_bot_token');
}

export function setAuthToken(token: string): void {
  localStorage.setItem('earn_bot_token', token);
}

export function removeAuthToken(): void {
  localStorage.removeItem('earn_bot_token');
  localStorage.removeItem('earnova_active_user_phone');
}

// ================= MULTI-TENANT LOCAL REGISTRY & PERSISTENCE =================
const USERS_REGISTRY_KEY = 'earnova_users_registry';
const ACTIVE_PHONE_KEY = 'earnova_active_user_phone';
const USER_TX_KEY_PREFIX = 'earnova_tx_';
const USER_WD_KEY_PREFIX = 'earnova_wd_';
const USER_SUB_KEY_PREFIX = 'earnova_sub_';

function getUsersRegistry(): Record<string, any> {
  try {
    const raw = localStorage.getItem(USERS_REGISTRY_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return {};
}

function saveUsersRegistry(reg: Record<string, any>) {
  try {
    localStorage.setItem(USERS_REGISTRY_KEY, JSON.stringify(reg));
  } catch (e) {}
}

export function getActiveUser(): any | null {
  try {
    const phone = localStorage.getItem(ACTIVE_PHONE_KEY);
    if (!phone) return null;
    const reg = getUsersRegistry();
    return reg[phone] || null;
  } catch (e) {
    return null;
  }
}

export function setActiveUser(user: any | null) {
  try {
    if (user && user.phone) {
      localStorage.setItem(ACTIVE_PHONE_KEY, user.phone);
      const reg = getUsersRegistry();
      reg[user.phone] = user;
      saveUsersRegistry(reg);
    } else {
      localStorage.removeItem(ACTIVE_PHONE_KEY);
    }
  } catch (e) {}
}

function getUserTransactions(userId: string): any[] {
  try {
    const raw = localStorage.getItem(USER_TX_KEY_PREFIX + userId);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return [];
}

function addUserTransaction(userId: string, tx: any) {
  try {
    const list = getUserTransactions(userId);
    list.unshift(tx);
    localStorage.setItem(USER_TX_KEY_PREFIX + userId, JSON.stringify(list.slice(0, 50)));
  } catch (e) {}
}

function getUserWithdrawals(userId: string): any[] {
  try {
    const raw = localStorage.getItem(USER_WD_KEY_PREFIX + userId);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return [];
}

function addUserWithdrawal(userId: string, w: any) {
  try {
    const list = getUserWithdrawals(userId);
    list.unshift(w);
    localStorage.setItem(USER_WD_KEY_PREFIX + userId, JSON.stringify(list.slice(0, 50)));
  } catch (e) {}
}

function getUserSubmissions(userId: string): any[] {
  try {
    const raw = localStorage.getItem(USER_SUB_KEY_PREFIX + userId);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return [];
}

function addUserSubmission(userId: string, sub: any) {
  try {
    const list = getUserSubmissions(userId);
    list.unshift(sub);
    localStorage.setItem(USER_SUB_KEY_PREFIX + userId, JSON.stringify(list.slice(0, 50)));
  } catch (e) {}
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  // Always execute against our unified Firebase Cloud + Local Cache engine
  // so there is zero split-brain or data loss across Vercel / dev containers / devices.
  return await handleCloudRequest<T>(endpoint, options);
}

// Unified Firebase Cloud + Local Persistence Router
async function handleCloudRequest<T>(endpoint: string, options: RequestInit): Promise<T> {
  const body = options.body ? JSON.parse(options.body as string) : {};

  // Public Settings
  if (endpoint === '/settings/public') {
    const settings = await firebaseSettings.get();
    return { success: true, settings } as unknown as T;
  }

  // Get current active authenticated user (synced with Firebase cloud)
  if (endpoint === '/auth/me') {
    const activeUser = getActiveUser();
    if (!activeUser) {
      removeAuthToken();
      throw new Error('লগইন করা নেই।');
    }
    const cloudUser = await firebaseUsers.get(activeUser.phone).catch(() => null);
    if (cloudUser) {
      if (cloudUser.status === 'BANNED' || cloudUser.status === 'SUSPENDED') {
        removeAuthToken();
        throw new Error('আপনার অ্যাকাউন্টটি স্থগিত রাখা হয়েছে।');
      }
      const merged = { ...activeUser, ...cloudUser };
      setActiveUser(merged);
      return { success: true, user: merged } as unknown as T;
    }
    return { success: true, user: activeUser } as unknown as T;
  }

  // User Registration (Creates unique user in Firebase RTDB + immediately credits referrer bonus & saves permanent referral)
  if (endpoint === '/auth/register') {
    const { name, phone, email, password, referralCode } = body;
    if (!name || !phone || !password) {
      throw new Error('নাম, মোবাইল নম্বর এবং পাসওয়ার্ড পূরণ করা আবশ্যক।');
    }

    const cleanPhone = (phone || '').trim().replace(/[^0-9]/g, '');
    if (!cleanPhone.startsWith('01') || cleanPhone.length !== 11) {
      throw new Error('সঠিক ১১ ডিজিটের বাংলাদেশি নম্বর লিখুন (যেমন: 01712345678)।');
    }

    if (password.length < 6) {
      throw new Error('পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।');
    }

    const reg = getUsersRegistry();
    const existingCloudUser = await firebaseUsers.get(cleanPhone).catch(() => null);
    if (reg[cleanPhone] || existingCloudUser) {
      throw new Error('এই নম্বরে ইতিমধ্যে অ্যাকাউন্ট তৈরি করা হয়েছে। অনুগ্রহ করে লগইন করুন।');
    }

    // Generate unique referral code using user's name prefix + random 4 digits (e.g. SAKI8921)
    const namePrefix = (name || '').replace(/[^a-zA-Z]/g, '').slice(0, 4).toUpperCase() || 'EARN';
    const uniqueRefCode = `${namePrefix}${Math.floor(1000 + Math.random() * 9000)}`;
    const newUserId = `usr_${Date.now()}_${Math.floor(100 + Math.random() * 900)}`;

    // Resolve referral code from form input or pending URL ?ref= capture
    let pendingRef = '';
    try {
      pendingRef = localStorage.getItem('earnova_pending_ref') || '';
    } catch (e) {}
    const rawRefInput = (referralCode || pendingRef || '').trim().toUpperCase();

    // Find referrer in Cloud Firebase (or local fallback)
    let referrer: any = null;
    if (rawRefInput) {
      referrer = await firebaseUsers.findByReferralCode(rawRefInput).catch(() => null);
      if (!referrer) {
        referrer = Object.values(reg).find(
          (u: any) =>
            (u.referralCode && u.referralCode.trim().toUpperCase() === rawRefInput) ||
            (u.phone && u.phone.replace(/[^0-9]/g, '') === rawRefInput.replace(/[^0-9]/g, ''))
        );
      }
      if (referrer && (referrer.phone || '').replace(/[^0-9]/g, '') === cleanPhone) {
        referrer = null; // Prevent self-referral
      }
    }

    const resolvedReferredByCode = referrer
      ? (referrer.referralCode || rawRefInput).trim().toUpperCase()
      : (rawRefInput || null);

    const newUser = {
      id: newUserId,
      name: name.trim(),
      phone: cleanPhone,
      email: email ? email.trim() : '',
      password: password,
      balance: 10.0,
      totalEarned: 10.0,
      totalWithdrawn: 0.0,
      referralCode: uniqueRefCode,
      referredBy: resolvedReferredByCode,
      referredByPhone: referrer ? (referrer.phone || '').replace(/[^0-9]/g, '') : null,
      referralCount: 0,
      referralBonusEarned: 0,
      status: 'ACTIVE',
      role: 'USER',
      createdAt: new Date().toISOString(),
      dailyWatchCount: 0,
      lastWatchDate: '',
    };

    // Save in local multi-tenant registry
    reg[cleanPhone] = newUser;
    saveUsersRegistry(reg);
    setActiveUser(newUser);
    setAuthToken('token_' + newUserId);

    const welcomeTx = {
      id: 'tx_wel_' + Date.now(),
      type: 'DAILY_BONUS',
      amount: 10.0,
      description: 'অ্যাকাউন্ট ওপেনিং ওয়েলকাম বোনাস',
      status: 'COMPLETED',
      createdAt: new Date().toISOString(),
    };
    addUserTransaction(newUserId, welcomeTx);

    // Clear pending referral capture after signup
    try {
      localStorage.removeItem('earnova_pending_ref');
    } catch (e) {}

    // AWAIT saving new user to Firebase RTDB so referral & user records are guaranteed persisted
    await firebaseUsers.save(newUser);
    await firebaseTransactions.add(cleanPhone, welcomeTx).catch(() => {});

    // Credit direct referral bonus to referrer in Firebase RTDB + save permanent referral record
    if (referrer) {
      const settings = await firebaseSettings.get().catch(() => null);
      const directBonus = Number(settings?.referralDirectBonus ?? 10.0);
      const creditRes = await firebaseUsers.creditReferralBonus(referrer, newUser, directBonus).catch(() => null);

      // Update local registry copy if referrer exists locally too
      const refPhone = (referrer.phone || '').replace(/[^0-9]/g, '');
      if (refPhone && reg[refPhone]) {
        reg[refPhone].balance = creditRes?.newBalance ?? ((Number(reg[refPhone].balance) || 0) + directBonus);
        reg[refPhone].totalEarned = (Number(reg[refPhone].totalEarned) || 0) + directBonus;
        reg[refPhone].referralCount = creditRes?.newRefCount ?? ((Number(reg[refPhone].referralCount) || 0) + 1);
        saveUsersRegistry(reg);
      }
      notifyDataUpdated({ action: 'REFERRAL_CREDITED', referrerPhone: refPhone });
    }

    return {
      success: true,
      message: referrer
        ? 'রেজিস্ট্রেশন সফল হয়েছে! ৳১০ স্বাগতম বোনাস যোগ হয়েছে এবং রেফারার বোনাস প্রদান করা হয়েছে।'
        : 'রেজিস্ট্রেশন সফল হয়েছে! ৳১০ স্বাগতম বোনাস আপনার অ্যাকাউন্টে যোগ হয়েছে।',
      token: 'token_' + newUserId,
      user: newUser,
    } as unknown as T;
  }

  // User Login (Checks Firebase RTDB first so cloud balance/referrals always sync across devices)
  if (endpoint === '/auth/login') {
    const { identifier, password } = body;
    if (!identifier || !password) {
      throw new Error('মোবাইল নম্বর ও পাসওয়ার্ড প্রদান করুন।');
    }

    const cleanIdentifier = identifier.trim();
    const cleanPhone = cleanIdentifier.replace(/[^0-9]/g, '');
    const reg = getUsersRegistry();
    let found: any = null;

    // 1. Try Firebase first for authoritative cloud state
    if (cleanPhone.length >= 10) {
      found = await firebaseUsers.get(cleanPhone).catch(() => null);
    }
    if (!found && cleanIdentifier.includes('@')) {
      const allCloud = await firebaseUsers.getAll().catch(() => []);
      found = allCloud.find((u: any) => u.email && u.email.toLowerCase() === cleanIdentifier.toLowerCase()) || null;
    }

    // 2. Fallback to local registry
    if (!found) {
      found = reg[cleanPhone] || Object.values(reg).find(
        (u: any) => u.email && u.email.toLowerCase() === cleanIdentifier.toLowerCase()
      );
      if (found) {
        // Backfill to Firebase silently
        firebaseUsers.save(found).catch(() => {});
      }
    }

    if (!found) {
      throw new Error('এই নম্বরে কোনো অ্যাকাউন্ট পাওয়া যায়নি। সঠিক নম্বর দিন অথবা নতুন অ্যাকাউন্ট তৈরি করুন।');
    }

    if (found.password && found.password !== password) {
      throw new Error('পাসওয়ার্ড সঠিক নয়। অনুগ্রহ করে পুনরায় চেষ্টা করুন।');
    }

    if (found.status === 'BANNED' || found.status === 'SUSPENDED') {
      throw new Error('আপনার অ্যাকাউন্টটি স্থগিত রাখা হয়েছে। সাপোর্টে যোগাযোগ করুন।');
    }

    if (found.phone) {
      reg[found.phone] = found;
      saveUsersRegistry(reg);
    }
    setActiveUser(found);
    setAuthToken('token_' + found.id);

    return {
      success: true,
      message: 'লগইন সফল হয়েছে!',
      token: 'token_' + found.id,
      user: found,
    } as unknown as T;
  }

  // Update Profile
  if (endpoint === '/user/profile') {
    const user = getActiveUser();
    if (!user) throw new Error('অনুগ্রহ করে লগইন করুন।');
    const updatedName = (body.name || user.name).trim();
    const updatedEmail = body.email !== undefined ? String(body.email).trim() : user.email;
    user.name = updatedName;
    user.email = updatedEmail;
    setActiveUser(user);
    await firebaseUsers.update(user.phone, { name: updatedName, email: updatedEmail }).catch(() => {});
    return {
      success: true,
      message: 'প্রোফাইল সফলভাবে আপডেট হয়েছে।',
      user,
    } as unknown as T;
  }

  // Change Password
  if (endpoint === '/user/change-password') {
    const user = getActiveUser();
    if (!user) throw new Error('অনুগ্রহ করে লগইন করুন।');
    const liveUser = await firebaseUsers.get(user.phone).catch(() => null);
    const currentPass = liveUser?.password || user.password;
    if (currentPass && currentPass !== body.currentPassword) {
      throw new Error('বর্তমান পাসওয়ার্ড সঠিক নয়।');
    }
    if (!body.newPassword || body.newPassword.length < 6) {
      throw new Error('নতুন পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।');
    }
    user.password = body.newPassword;
    setActiveUser(user);
    await firebaseUsers.update(user.phone, { password: body.newPassword }).catch(() => {});
    return { success: true, message: 'পাসওয়ার্ড সফলভাবে পরিবর্তিত হয়েছে।' } as unknown as T;
  }

  // User Dashboard (Cloud-synced user, referrals & transactions)
  if (endpoint === '/user/dashboard') {
    const localUser = getActiveUser();
    if (!localUser) {
      removeAuthToken();
      throw new Error('অনুগ্রহ করে লগইন করুন।');
    }

    const [liveUser, tasks, settings, cloudTxs] = await Promise.all([
      firebaseUsers.get(localUser.phone).catch(() => null),
      firebaseTasks.getAll().catch(() => []),
      firebaseSettings.get(),
      firebaseTransactions.getByUser(localUser.phone).catch(() => []),
    ]);

    const user = liveUser ? { ...localUser, ...liveUser } : localUser;
    setActiveUser(user);

    const directBonus = Number(settings?.referralDirectBonus ?? 10);
    const myReferrals = await firebaseReferrals.getByUser(user, directBonus).catch(() => []);

    // Merge cloud + local transactions
    const localTxs = getUserTransactions(user.id);
    const txMap = new Map<string, any>();
    [...cloudTxs, ...localTxs].forEach((tx) => {
      if (tx && tx.id) txMap.set(tx.id, tx);
    });
    const mergedTxs = Array.from(txMap.values())
      .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
      .slice(0, 10);

    const todayStr = new Date().toISOString().slice(0, 10);
    const isTodayWatch = user.lastWatchDate === todayStr;

    const todayEarningsFromTx = mergedTxs
      .filter((t) => t.status === 'COMPLETED' && (t.createdAt || '').startsWith(todayStr) && t.type !== 'WITHDRAWAL')
      .reduce((s, t) => s + (Number(t.amount) || 0), 0);

    return {
      success: true,
      user,
      stats: {
        todayEarnings: todayEarningsFromTx > 0 ? Number(todayEarningsFromTx.toFixed(2)) : (isTodayWatch ? (user.dailyWatchCount || 0) * 3.5 : 0),
        todayWatchCount: isTodayWatch ? (user.dailyWatchCount || 0) : 0,
        dailyAdLimit: settings.dailyAdLimit || 12,
        totalReferrals: Math.max(myReferrals.length, Number(user.referralCount || 0)),
        referralEarnings: Math.max(
          myReferrals.reduce((s, r) => s + (Number(r.bonusAmount) || directBonus), 0),
          Number(user.referralBonusEarned || 0)
        ),
        completedTasksCount: getUserSubmissions(user.id).filter((s: any) => s.status === 'APPROVED').length,
        activeTasksCount: tasks.length,
        hasClaimedDailyToday: user.lastBonusDate === todayStr,
      },
      recentTransactions: mergedTxs,
      settings,
    } as unknown as T;
  }

  // Daily Bonus
  if (endpoint === '/user/daily-bonus') {
    const localUser = getActiveUser();
    if (!localUser) throw new Error('অনুগ্রহ করে লগইন করুন।');

    const liveUser = await firebaseUsers.get(localUser.phone).catch(() => null);
    const user = liveUser ? { ...localUser, ...liveUser } : localUser;

    const todayStr = new Date().toISOString().slice(0, 10);
    if (user.lastBonusDate === todayStr) {
      throw new Error('আপনি আজকের বোনাস ইতিমধ্যে গ্রহণ করেছেন। আগামীকাল আবার চেষ্টা করুন।');
    }

    const settings = await firebaseSettings.get();
    const bonus = Number(settings.dailyBonusAmount) || 5.0;

    user.balance = Number(((Number(user.balance) || 0) + bonus).toFixed(2));
    user.totalEarned = Number(((Number(user.totalEarned) || 0) + bonus).toFixed(2));
    user.lastBonusDate = todayStr;
    setActiveUser(user);

    const tx = {
      id: 'tx_bonus_' + Date.now(),
      type: 'DAILY_BONUS',
      amount: bonus,
      description: 'দৈনিক চেক-ইন বোনাস',
      status: 'COMPLETED',
      createdAt: new Date().toISOString(),
    };
    addUserTransaction(user.id, tx);

    await Promise.all([
      firebaseUsers.update(user.phone, {
        balance: user.balance,
        totalEarned: user.totalEarned,
        lastBonusDate: todayStr,
      }),
      firebaseTransactions.add(user.phone, tx),
    ]).catch(() => {});

    return {
      success: true,
      amount: bonus,
      message: `অভিনন্দন! আপনি ৳${bonus.toFixed(2)} দৈনিক বোনাস পেয়েছেন।`,
      newBalance: user.balance,
    } as unknown as T;
  }

  // Ads list
  if (endpoint === '/ads/list') {
    const localUser = getActiveUser();
    const liveUser = localUser ? await firebaseUsers.get(localUser.phone).catch(() => null) : null;
    const user = liveUser ? { ...localUser, ...liveUser } : localUser;
    const [ads, settings] = await Promise.all([
      firebaseAds.getAll(),
      firebaseSettings.get().catch(() => null),
    ]);
    const todayStr = new Date().toISOString().slice(0, 10);
    const watchCount = user && user.lastWatchDate === todayStr ? (user.dailyWatchCount || 0) : 0;
    const limit = settings?.dailyAdLimit || 12;

    return {
      success: true,
      ads,
      stats: {
        todayWatchCount: watchCount,
        dailyAdLimit: limit,
        remainingCount: Math.max(0, limit - watchCount),
        isLimitReached: watchCount >= limit,
      },
    } as unknown as T;
  }

  if (endpoint === '/ads/start-session') {
    return {
      success: true,
      session: {
        id: 'sess_' + Date.now(),
        durationSeconds: 15,
        adId: body.adId || 'ad_1',
      },
    } as unknown as T;
  }

  // Claim Ad Reward
  if (endpoint === '/ads/claim' || endpoint === '/ads/monetag-claim') {
    const localUser = getActiveUser();
    if (!localUser) throw new Error('অনুগ্রহ করে লগইন করুন।');

    const liveUser = await firebaseUsers.get(localUser.phone).catch(() => null);
    const user = liveUser ? { ...localUser, ...liveUser } : localUser;

    const todayStr = new Date().toISOString().slice(0, 10);
    if (user.lastWatchDate !== todayStr) {
      user.dailyWatchCount = 0;
      user.lastWatchDate = todayStr;
    }

    const reward = 3.5;
    user.balance = Number(((Number(user.balance) || 0) + reward).toFixed(2));
    user.totalEarned = Number(((Number(user.totalEarned) || 0) + reward).toFixed(2));
    user.dailyWatchCount = (user.dailyWatchCount || 0) + 1;
    setActiveUser(user);

    const tx = {
      id: 'tx_ad_' + Date.now(),
      type: 'AD_REWARD',
      amount: reward,
      description: endpoint === '/ads/monetag-claim' ? 'মনিট্যাগ বিজ্ঞাপন দর্শন রিওয়ার্ড' : 'ভিডিও বিজ্ঞাপন দর্শন রিওয়ার্ড',
      status: 'COMPLETED',
      createdAt: new Date().toISOString(),
    };
    addUserTransaction(user.id, tx);

    await Promise.all([
      firebaseUsers.update(user.phone, {
        balance: user.balance,
        totalEarned: user.totalEarned,
        dailyWatchCount: user.dailyWatchCount,
        lastWatchDate: user.lastWatchDate,
      }),
      firebaseTransactions.add(user.phone, tx),
    ]).catch(() => {});

    // Award lifetime referral commission to referrer
    firebaseUsers.creditReferralCommission(user, reward, 'বিজ্ঞাপন দর্শন').catch(() => {});

    return {
      success: true,
      rewardAmount: reward,
      message: `অভিনন্দন! আপনার অ্যাকাউন্টে ৳${reward.toFixed(2)} যোগ করা হয়েছে।`,
      user,
    } as unknown as T;
  }

  // Tasks List
  if (endpoint === '/tasks/list') {
    const tasks = await firebaseTasks.getAll();
    return { success: true, tasks } as unknown as T;
  }

  // Submit Task Proof
  if (endpoint === '/tasks/submit') {
    const user = getActiveUser();
    if (!user) throw new Error('অনুগ্রহ করে লগইন করুন।');

    const submission = {
      id: 'sub_' + Date.now(),
      taskId: body.taskId,
      userId: user.id,
      userName: user.name,
      userPhone: user.phone,
      proofData: body.proofData,
      status: 'PENDING',
      submittedAt: new Date().toISOString(),
    };

    addUserSubmission(user.id, submission);
    firebaseSubmissions.submit(submission).catch(() => {});

    return {
      success: true,
      message: 'প্রমাণ সফলভাবে জমা হয়েছে। অ্যাডমিন পর্যালোচনার পর ব্যালেন্স যোগ হবে।',
      submission,
    } as unknown as T;
  }

  if (endpoint === '/tasks/my-submissions') {
    const user = getActiveUser();
    if (!user) return { success: true, submissions: [] } as unknown as T;
    return { success: true, submissions: getUserSubmissions(user.id) } as unknown as T;
  }

  // Complete Task & Auto-Credit Balance (Instantly adds money without admin review per user request)
  if (endpoint === '/tasks/complete') {
    const localUser = getActiveUser();
    if (!localUser) throw new Error('অনুগ্রহ করে লগইন করুন।');

    const rawReward = Number(body.rewardAmount) || 5;
    // Task reward strictly capped at maximum ৳10
    const reward = Math.min(10, Math.max(1, rawReward));

    const liveUser = await firebaseUsers.get(localUser.phone).catch(() => null);
    const user = liveUser ? { ...localUser, ...liveUser } : localUser;
    const currentBalance = Number(user.balance) || 0;
    const currentEarned = Number(user.totalEarned) || 0;

    const newBalance = Number((currentBalance + reward).toFixed(2));
    const newTotalEarned = Number((currentEarned + reward).toFixed(2));

    user.balance = newBalance;
    user.totalEarned = newTotalEarned;
    setActiveUser(user);

    const tx = {
      id: 'tx_task_' + Date.now(),
      type: 'TASK_REWARD',
      amount: reward,
      description: body.taskTitle || 'টাস্ক সম্পন্ন রিওয়ার্ড',
      status: 'COMPLETED',
      createdAt: new Date().toISOString(),
    };
    addUserTransaction(user.id, tx);

    await Promise.all([
      firebaseUsers.update(user.phone, {
        balance: newBalance,
        totalEarned: newTotalEarned,
      }),
      firebaseTransactions.add(user.phone, tx),
    ]).catch(() => {});

    // Award lifetime referral commission to referrer
    firebaseUsers.creditReferralCommission(user, reward, 'মাইক্রো-টাস্ক সম্পন্ন').catch(() => {});

    return {
      success: true,
      rewardAmount: reward,
      newBalance,
      message: `🎉 অভিনন্দন! টাস্ক সফলভাবে সম্পন্ন হয়েছে এবং ৳${reward.toFixed(2)} আপনার ওয়ালেটে যোগ হয়েছে!`,
    } as unknown as T;
  }

  // Redeem Voucher / Promo Code
  if (endpoint === '/vouchers/redeem') {
    const user = getActiveUser();
    if (!user) throw new Error('অনুগ্রহ করে লগইন করুন।');
    const res = await firebaseVouchers.redeem(body.code, user.phone);
    if (res.success && res.newBalance !== undefined) {
      user.balance = res.newBalance;
      user.totalEarned = (user.totalEarned || 0) + (res.amount || 0);
      setActiveUser(user);
      const tx = {
        id: 'tx_vouch_' + Date.now(),
        type: 'TASK_REWARD',
        amount: res.amount || 0,
        description: `ভাউচার কোড (${(body.code || '').toUpperCase()}) বোনাস`,
        status: 'COMPLETED',
        createdAt: new Date().toISOString(),
      };
      addUserTransaction(user.id, tx);
      firebaseTransactions.add(user.phone, tx).catch(() => {});
    }
    return res as unknown as T;
  }

  // Wallet Summary
  if (endpoint === '/wallet/summary') {
    const localUser = getActiveUser();
    if (!localUser) {
      removeAuthToken();
      throw new Error('অনুগ্রহ করে লগইন করুন।');
    }

    const [settings, liveUser, cloudTxs, allWithdrawals] = await Promise.all([
      firebaseSettings.get(),
      firebaseUsers.get(localUser.phone).catch(() => null),
      firebaseTransactions.getByUser(localUser.phone).catch(() => []),
      firebaseWithdrawals.getAll().catch(() => []),
    ]);

    const user = liveUser ? { ...localUser, ...liveUser } : localUser;
    setActiveUser(user);

    const balance = Number(user.balance) || 0;
    const totalEarned = Number(user.totalEarned) || 0;
    const totalWithdrawn = Number(user.totalWithdrawn) || 0;

    const myCloudWithdrawals = allWithdrawals.filter(
      (w: any) => (w.userPhone || w.phone) === user.phone || w.userId === user.id
    );
    const wdMap = new Map<string, any>();
    [...myCloudWithdrawals, ...getUserWithdrawals(user.id)].forEach((w) => {
      if (w && w.id) wdMap.set(w.id, w);
    });
    const mergedWithdrawals = Array.from(wdMap.values()).sort(
      (a, b) => new Date(b.requestedAt || 0).getTime() - new Date(a.requestedAt || 0).getTime()
    );

    const txMap = new Map<string, any>();
    [...cloudTxs, ...getUserTransactions(user.id)].forEach((t) => {
      if (t && t.id) txMap.set(t.id, t);
    });
    const mergedTxs = Array.from(txMap.values()).sort(
      (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    );

    return {
      success: true,
      balance,
      totalEarned,
      totalWithdrawn,
      minWithdrawal: settings.minWithdrawal || 50,
      isWithdrawalOpen: settings.isWithdrawalOpen ?? true,
      paymentMethods: settings.paymentMethods || { bKash: true, Nagad: true, Rocket: true },
      recentWithdrawals: mergedWithdrawals.slice(0, 15),
      recentTransactions: mergedTxs.slice(0, 20),
    } as unknown as T;
  }

  // Request Withdrawal
  if (endpoint === '/wallet/withdraw') {
    const localUser = getActiveUser();
    if (!localUser) throw new Error('অনুগ্রহ করে লগইন করুন।');

    const amt = Number(body.amount);
    if (!amt || isNaN(amt) || amt <= 0) {
      throw new Error('সঠিক উত্তোলনের পরিমাণ লিখুন।');
    }

    const [settings, liveUser] = await Promise.all([
      firebaseSettings.get(),
      firebaseUsers.get(localUser.phone).catch(() => null),
    ]);
    const user = liveUser ? { ...localUser, ...liveUser } : localUser;

    const minW = settings.minWithdrawal || 50;
    if (amt < minW) {
      throw new Error(`সর্বনিম্ন উত্তোলনের পরিমাণ ৳${minW} টাকা।`);
    }

    const minRefs = settings.minReferralsToWithdraw || 0;
    if (minRefs > 0) {
      const myRefs = await firebaseReferrals.getByUser(user).catch(() => []);
      const refCount = Math.max(myRefs.length, Number(user.referralCount || 0));
      if (refCount < minRefs) {
        throw new Error(`টাকা উত্তোলনের জন্য সর্বনিম্ন ${minRefs} টি সফল রেফার প্রয়োজন। আপনার বর্তমানে রয়েছে ${refCount} টি রেফার।`);
      }
    }

    const currentBalance = Number(user.balance) || 0;
    if (currentBalance < amt) {
      throw new Error(`আপনার অ্যাকাউন্টে পর্যাপ্ত ব্যালেন্স নেই। বর্তমান ব্যালেন্স: ৳${currentBalance.toFixed(2)} টাকা`);
    }

    const newBalance = Number((currentBalance - amt).toFixed(2));
    const newTotalWithdrawn = Number(((Number(user.totalWithdrawn) || 0) + amt).toFixed(2));

    user.balance = newBalance;
    user.totalWithdrawn = newTotalWithdrawn;
    setActiveUser(user);

    const withdrawalItem = {
      id: 'wd_' + Date.now(),
      userId: user.id || user.phone,
      userName: user.name || 'User',
      userPhone: user.phone,
      method: body.method,
      accountType: body.accountType,
      accountNumber: body.accountNumber,
      amount: amt,
      fee: 0,
      finalAmount: amt,
      status: 'PENDING',
      requestedAt: new Date().toISOString(),
    };

    const wdTx = {
      id: 'tx_wd_' + Date.now(),
      type: 'WITHDRAWAL',
      amount: amt,
      description: `${body.method} উত্তোলন আবেদন`,
      status: 'PENDING',
      createdAt: new Date().toISOString(),
    };

    addUserWithdrawal(user.id, withdrawalItem);
    addUserTransaction(user.id, wdTx);

    await Promise.all([
      firebaseWithdrawals.create(withdrawalItem),
      firebaseTransactions.add(user.phone, wdTx),
      firebaseUsers.update(user.phone, {
        balance: newBalance,
        totalWithdrawn: newTotalWithdrawn,
      }),
    ]);

    return {
      success: true,
      message: `৳${amt} টাকা উত্তোলনের রিকোয়েস্ট সফলভাবে জমা হয়েছে।`,
      withdrawal: withdrawalItem,
      newBalance: user.balance,
    } as unknown as T;
  }

  if (endpoint === '/wallet/withdrawals') {
    const user = getActiveUser();
    if (!user) return { success: true, withdrawals: [] } as unknown as T;
    const allW = await firebaseWithdrawals.getAll().catch(() => []);
    const cloudMine = allW.filter(
      (w: any) => (w.userPhone || w.phone) === user.phone || w.userId === user.id
    );
    const map = new Map<string, any>();
    [...cloudMine, ...getUserWithdrawals(user.id)].forEach((w) => {
      if (w && w.id) map.set(w.id, w);
    });
    const list = Array.from(map.values()).sort(
      (a, b) => new Date(b.requestedAt || 0).getTime() - new Date(a.requestedAt || 0).getTime()
    );
    return { success: true, withdrawals: list } as unknown as T;
  }

  if (endpoint === '/wallet/transactions') {
    const user = getActiveUser();
    if (!user) return { success: true, transactions: [] } as unknown as T;
    const cloudTxs = await firebaseTransactions.getByUser(user.phone).catch(() => []);
    const map = new Map<string, any>();
    [...cloudTxs, ...getUserTransactions(user.id)].forEach((t) => {
      if (t && t.id) map.set(t.id, t);
    });
    const list = Array.from(map.values()).sort(
      (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    );
    return { success: true, transactions: list } as unknown as T;
  }

  // Referral Stats (Fetched from Cloud Firebase Referrals + Cloud Users + Cloud Transactions for 100% permanent persistence)
  if (endpoint === '/referrals/stats') {
    const localUser = getActiveUser();
    if (!localUser) throw new Error('অনুগ্রহ করে লগইন করুন।');

    const [liveUser, settings, cloudTxs] = await Promise.all([
      firebaseUsers.get(localUser.phone).catch(() => null),
      firebaseSettings.get().catch(() => null),
      firebaseTransactions.getByUser(localUser.phone).catch(() => []),
    ]);

    const user = liveUser ? { ...localUser, ...liveUser } : localUser;
    const directBonus = Number(settings?.referralDirectBonus || 10.0);
    const commissionPercent = Number(settings?.referralCommissionPercent || 10);

    // Fetch permanent referral records + scan all cloud users + merge local registry fallback
    const cloudReferrals = await firebaseReferrals.getByUser(user, directBonus).catch(() => []);

    const reg = getUsersRegistry();
    const myCode = (user.referralCode || '').trim().toUpperCase();
    const refMap = new Map<string, any>();
    cloudReferrals.forEach((r: any) => {
      const k = (r.phone || r.id || '').replace(/[^0-9]/g, '') || r.id;
      refMap.set(k, r);
    });
    Object.values(reg).forEach((u: any) => {
      const uRefBy = (u.referredBy || '').trim().toUpperCase();
      const uPhone = (u.phone || '').replace(/[^0-9]/g, '');
      if (uPhone && uPhone !== (user.phone || '').replace(/[^0-9]/g, '') && myCode && uRefBy === myCode) {
        if (!refMap.has(uPhone)) {
          refMap.set(uPhone, {
            id: u.id || uPhone,
            name: u.name || 'User',
            phone: uPhone,
            bonusAmount: directBonus,
            createdAt: u.createdAt || new Date().toISOString(),
          });
        }
      }
    });

    const myReferrals = Array.from(refMap.values()).sort(
      (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    );

    const totalCount = Math.max(myReferrals.length, Number(user.referralCount || 0));

    // Heal referralCount on cloud user profile if needed
    if (myReferrals.length > Number(user.referralCount || 0)) {
      user.referralCount = myReferrals.length;
      setActiveUser(user);
      firebaseUsers.update(user.phone, { referralCount: myReferrals.length }).catch(() => {});
    }

    const directBonusSum = myReferrals.reduce((s, r) => s + (Number(r.bonusAmount) || directBonus), 0);
    const commissionSum = cloudTxs
      .filter((t: any) => t.type === 'REFERRAL_BONUS' && String(t.description || '').includes('কমিশন'))
      .reduce((s: number, t: any) => s + (Number(t.amount) || 0), 0);
    const totalBonusEarned = Math.max(
      Number((directBonusSum + commissionSum).toFixed(2)),
      Number(user.referralBonusEarned || 0),
      totalCount * directBonus
    );

    return {
      success: true,
      referralCode: user.referralCode,
      totalReferrals: totalCount,
      totalBonusEarned,
      referralDirectBonus: directBonus,
      referralCommissionPercent: commissionPercent,
      referrals: myReferrals.map((r: any) => ({
        id: r.id || r.phone,
        name: r.name || 'Anonymous User',
        phone: r.phone ? String(r.phone).replace(/(\d{3})\d{4}(\d{4})/, '$1****$2') : '017****',
        bonusAmount: Number(r.bonusAmount || directBonus),
        createdAt: r.createdAt || new Date().toISOString(),
      })),
    } as unknown as T;
  }

  // Admin Data (Authenticated via PIN header)
  if (endpoint === '/admin/data') {
    const pin = (options.headers as any)?.['x-admin-pin'] || '';
    if (pin !== 'Earnova017@' && pin !== '889900') {
      throw new Error('ভুল অ্যাডমিন পাসওয়ার্ড বা পিন');
    }

    const [fbUsers, tasks, ads, settings, withdrawals, submissions] = await Promise.all([
      firebaseUsers.getAll().catch(() => []),
      firebaseTasks.getAll().catch(() => []),
      firebaseAds.getAll().catch(() => []),
      firebaseSettings.get().catch(() => null),
      firebaseWithdrawals.getAll ? firebaseWithdrawals.getAll().catch(() => []) : Promise.resolve([]),
      firebaseSubmissions.getAll ? firebaseSubmissions.getAll().catch(() => []) : Promise.resolve([]),
    ]);

    const reg = getUsersRegistry();
    const userMap = new Map();
    fbUsers.forEach((u) => userMap.set(u.phone || u.id, u));
    Object.values(reg).forEach((u: any) => {
      const k = u.phone || u.id;
      if (!userMap.has(k)) userMap.set(k, u);
    });
    const rawUsersList = Array.from(userMap.values());

    // Compute accurate referral count for every user from all cloud users
    const usersList = rawUsersList.map((u: any) => {
      const code = (u.referralCode || '').trim().toUpperCase();
      const computedRefs = code
        ? rawUsersList.filter(
            (other: any) =>
              other.phone !== u.phone &&
              other.referredBy &&
              String(other.referredBy).trim().toUpperCase() === code
          ).length
        : 0;
      return {
        ...u,
        referralCount: Math.max(Number(u.referralCount || 0), computedRefs),
      };
    });

    const pendingW = (withdrawals || []).filter((w: any) => w.status === 'PENDING');
    const paidW = (withdrawals || []).filter((w: any) => w.status === 'COMPLETED');

    return {
      success: true,
      stats: {
        totalUsers: usersList.length,
        totalBalance: usersList.reduce((s, u: any) => s + (Number(u.balance) || 0), 0),
        totalWithdrawn: usersList.reduce((s, u: any) => s + (Number(u.totalWithdrawn) || 0), 0),
        pendingWithdrawalsCount: pendingW.length,
        pendingWithdrawalsAmount: pendingW.reduce((s: number, w: any) => s + (Number(w.amount) || 0), 0),
        paidWithdrawalsAmount: paidW.reduce((s: number, w: any) => s + (Number(w.amount) || 0), 0),
      },
      users: usersList,
      withdrawals: withdrawals || [],
      tasks,
      taskSubmissions: submissions || [],
      ads,
      settings,
    } as unknown as T;
  }

  // Admin Withdrawal Approve / Reject
  if (endpoint.startsWith('/admin/withdrawals/') && endpoint.endsWith('/action')) {
    const parts = endpoint.split('/');
    const wdId = parts[parts.length - 2];
    const action = body.action === 'APPROVE' ? 'COMPLETED' : 'REJECTED';
    await firebaseWithdrawals.updateStatus(wdId, action, body.note);
    if (action === 'REJECTED') {
      const allW = await firebaseWithdrawals.getAll().catch(() => []);
      const wd = allW.find((w: any) => w.id === wdId);
      if (wd && (wd.userPhone || wd.phone)) {
        const phone = wd.userPhone || wd.phone;
        const u = await firebaseUsers.get(phone).catch(() => null);
        if (u) {
          const newBal = Number(((Number(u.balance) || 0) + Number(wd.amount || 0)).toFixed(2));
          const newWd = Math.max(0, Number(((Number(u.totalWithdrawn) || 0) - Number(wd.amount || 0)).toFixed(2)));
          await firebaseUsers.update(phone, { balance: newBal, totalWithdrawn: newWd });
        }
      }
    }
    return { success: true, message: `উত্তোলন রিকোয়েস্ট ${action} করা হয়েছে।` } as unknown as T;
  }

  // Admin Task Proof Approve / Reject
  if (endpoint.startsWith('/admin/tasks/proofs/') && endpoint.endsWith('/action')) {
    const parts = endpoint.split('/');
    const proofId = parts[parts.length - 2];
    await firebaseSubmissions.updateStatus(proofId, body.action, body.reason);
    return { success: true, message: `প্রুফ ${body.action} হয়েছে।` } as unknown as T;
  }

  // Admin update user balance (adds bonus / changes balance in Firebase and local storage)
  if (endpoint.startsWith('/admin/users/') && endpoint.endsWith('/balance')) {
    const parts = endpoint.split('/');
    const userId = parts[parts.length - 2];
    const amt = Number(body.amount) || 0;
    const reg = getUsersRegistry();
    const allFbUsers = await firebaseUsers.getAll().catch(() => []);
    let user = allFbUsers.find((u: any) => u.id === userId || u.phone === userId || u.phoneKey === userId);
    if (!user) {
      user = Object.values(reg).find((u: any) => u.id === userId || u.phone === userId) as any;
    }
    if (!user) {
      user = await firebaseUsers.get(userId);
    }
    if (user) {
      const newBal = Number(((Number(user.balance) || 0) + amt).toFixed(2));
      const newEarned = Number(((Number(user.totalEarned) || 0) + (amt > 0 ? amt : 0)).toFixed(2));
      user.balance = newBal;
      user.totalEarned = newEarned;
      if (user.phone) {
        reg[user.phone] = user;
        saveUsersRegistry(reg);
        await firebaseUsers.updateBalance(user.phone, newBal, newEarned);
      }
      const active = getActiveUser();
      if (active && (active.id === user.id || active.phone === user.phone)) {
        setActiveUser(user);
      }
      return { success: true, message: `৳${amt} টাকা সফলভাবে যোগ হয়েছে!`, user } as unknown as T;
    }
    return { success: true, message: 'ব্যালেন্স আপডেট হয়েছে' } as unknown as T;
  }

  // Admin toggle user status (Ban / Unban)
  if (endpoint.startsWith('/admin/users/') && endpoint.endsWith('/toggle-status')) {
    const parts = endpoint.split('/');
    const userId = parts[parts.length - 2];
    const reg = getUsersRegistry();
    const allFbUsers = await firebaseUsers.getAll().catch(() => []);
    let user = allFbUsers.find((u: any) => u.id === userId || u.phone === userId || u.phoneKey === userId);
    if (!user) {
      user = Object.values(reg).find((u: any) => u.id === userId || u.phone === userId) as any;
    }
    if (!user) {
      user = await firebaseUsers.get(userId);
    }
    if (user) {
      const newStatus = user.status === 'ACTIVE' ? 'BANNED' : 'ACTIVE';
      user.status = newStatus;
      if (user.phone) {
        reg[user.phone] = user;
        saveUsersRegistry(reg);
        await firebaseUsers.toggleStatus(user.phone, newStatus);
      }
      return { success: true, message: `ইউজার স্ট্যাটাস: ${newStatus}`, user } as unknown as T;
    }
    return { success: true } as unknown as T;
  }

  // Admin add task
  if (endpoint === '/admin/tasks/add') {
    return (await firebaseTasks.add(body)) as unknown as T;
  }

  // Admin delete task
  if (endpoint.startsWith('/admin/tasks/') && options.method === 'DELETE') {
    const taskId = endpoint.split('/').pop() || '';
    return (await firebaseTasks.delete(taskId)) as unknown as T;
  }

  // Admin add ad
  if (endpoint === '/admin/ads/add') {
    return (await firebaseAds.add(body)) as unknown as T;
  }

  // Admin delete ad
  if (endpoint.startsWith('/admin/ads/') && options.method === 'DELETE') {
    const adId = endpoint.split('/').pop() || '';
    return (await firebaseAds.delete(adId)) as unknown as T;
  }

  // Admin settings update
  if (endpoint === '/admin/settings') {
    return (await firebaseSettings.update(body)) as unknown as T;
  }

  return { success: true } as unknown as T;
}

export const api = {
  register: (payload: { name: string; phone: string; email?: string; password: string; referralCode?: string }) =>
    request<{ success: boolean; message: string; token: string; user: any }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  login: (payload: { identifier: string; password: string }) =>
    request<{ success: boolean; message: string; token: string; user: any }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getMe: () => request<{ success: boolean; user: any }>('/auth/me'),

  getDashboard: () =>
    request<{
      success: boolean;
      user: any;
      stats: any;
      recentTransactions: any[];
      settings: any;
    }>('/user/dashboard'),

  claimDailyBonus: () =>
    request<{ success: boolean; amount: number; message: string; newBalance?: number }>('/user/daily-bonus', {
      method: 'POST',
    }),

  updateProfile: (payload: { name: string; email?: string }) =>
    request<{ success: boolean; message: string; user: any }>('/user/profile', {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  changePassword: (payload: { currentPassword: string; newPassword: string }) =>
    request<{ success: boolean; message: string }>('/user/change-password', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getAds: () =>
    request<{
      success: boolean;
      ads: any[];
      stats: { todayWatchCount: number; dailyAdLimit: number; remainingCount: number; isLimitReached: boolean };
    }>('/ads/list'),

  startAdSession: (adId: string) =>
    request<{ success: boolean; session: { id: string; durationSeconds: number; adId: string } }>('/ads/start-session', {
      method: 'POST',
      body: JSON.stringify({ adId }),
    }),

  claimAdReward: (sessionId: string) =>
    request<{ success: boolean; rewardAmount: number; message: string; user?: any }>('/ads/claim', {
      method: 'POST',
      body: JSON.stringify({ sessionId }),
    }),

  claimMonetagReward: () =>
    request<{ success: boolean; rewardAmount: number; message: string; user?: any }>('/ads/monetag-claim', {
      method: 'POST',
    }),

  getTasks: () => request<{ success: boolean; tasks: any[] }>('/tasks/list'),

  submitTaskProof: (taskId: string, proofData: string) =>
    request<{ success: boolean; message: string; submission: any }>('/tasks/submit', {
      method: 'POST',
      body: JSON.stringify({ taskId, proofData }),
    }),

  getMySubmissions: () => request<{ success: boolean; submissions: any[] }>('/tasks/my-submissions'),

  getWalletSummary: () =>
    request<{
      success: boolean;
      balance: number;
      totalEarned: number;
      totalWithdrawn: number;
      minWithdrawal: number;
      isWithdrawalOpen: boolean;
      paymentMethods: Record<string, boolean>;
      recentWithdrawals: any[];
      recentTransactions: any[];
    }>('/wallet/summary'),

  requestWithdrawal: (payload: {
    method: string;
    accountType: string;
    accountNumber: string;
    amount: number;
  }) =>
    request<{ success: boolean; message: string; withdrawal: any; newBalance?: number }>('/wallet/withdraw', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getTransactions: () => request<{ success: boolean; transactions: any[] }>('/wallet/transactions'),

  getWithdrawals: () => request<{ success: boolean; withdrawals: any[] }>('/wallet/withdrawals'),

  getReferralStats: () =>
    request<{
      success: boolean;
      referralCode: string;
      totalReferrals: number;
      totalBonusEarned: number;
      referralDirectBonus: number;
      referralCommissionPercent: number;
      referrals: any[];
    }>('/referrals/stats'),

  getPublicSettings: () => request<{ success: boolean; settings: any }>('/settings/public'),

  // Admin Methods (authenticated with x-admin-pin)
  adminGetData: (pin: string = 'Earnova017@') =>
    request<{
      success: boolean;
      message?: string;
      stats: any;
      users: any[];
      withdrawals: any[];
      tasks: any[];
      taskSubmissions: any[];
      ads: any[];
      settings: any;
    }>('/admin/data', {
      headers: { 'x-admin-pin': pin },
    }),

  adminWithdrawalAction: (arg1: string, arg2: any, arg3?: any, arg4?: string) => {
    let pin = 'Earnova017@';
    let id = arg1;
    let action = arg2;
    let note = typeof arg3 === 'string' && arg3 !== 'APPROVE' && arg3 !== 'REJECT' ? arg3 : undefined;

    if (arg1 === 'Earnova017@' || arg1 === '889900') {
      pin = arg1;
      id = arg2;
      action = arg3;
    } else if (typeof arg4 === 'string') {
      pin = arg4;
    } else if (typeof arg3 === 'string' && (arg3 === 'Earnova017@' || arg3 === '889900')) {
      pin = arg3;
    }

    return request<{ success: boolean; item?: any; message?: string }>(`/admin/withdrawals/${id}/action`, {
      method: 'POST',
      headers: { 'x-admin-pin': pin },
      body: JSON.stringify({ action, note }),
    });
  },

  adminAddTask: (arg1: any, arg2?: any) => {
    let pin = 'Earnova017@';
    let task = arg1;
    if (typeof arg1 === 'string') {
      pin = arg1;
      task = arg2;
    } else if (typeof arg2 === 'string') {
      pin = arg2;
    }
    return request<{ success: boolean; task?: any; message?: string }>('/admin/tasks/add', {
      method: 'POST',
      headers: { 'x-admin-pin': pin },
      body: JSON.stringify(task),
    });
  },

  adminDeleteTask: (arg1: string, arg2?: string) => {
    let pin = 'Earnova017@';
    let id = arg1;
    if (arg1 === 'Earnova017@' || arg1 === '889900') {
      pin = arg1;
      id = arg2 || '';
    } else if (arg2) {
      pin = arg2;
    }
    return request<{ success: boolean; message?: string }>(`/admin/tasks/${id}`, {
      method: 'DELETE',
      headers: { 'x-admin-pin': pin },
    });
  },

  adminTaskProofAction: (id: string, action: 'APPROVED' | 'REJECTED', reason?: string, pin: string = 'Earnova017@') =>
    request<{ success: boolean; submission?: any; message?: string }>(`/admin/tasks/proofs/${id}/action`, {
      method: 'POST',
      headers: { 'x-admin-pin': pin },
      body: JSON.stringify({ action, reason }),
    }),

  adminApproveTaskProof: (arg1: string, arg2?: string) => {
    let pin = 'Earnova017@';
    let id = arg1;
    if (arg1 === 'Earnova017@' || arg1 === '889900') {
      pin = arg1;
      id = arg2 || '';
    } else if (arg2) {
      pin = arg2;
    }
    return request<{ success: boolean; submission?: any; message?: string }>(`/admin/tasks/proofs/${id}/action`, {
      method: 'POST',
      headers: { 'x-admin-pin': pin },
      body: JSON.stringify({ action: 'APPROVED' }),
    });
  },

  adminRejectTaskProof: (arg1: string, arg2?: string) => {
    let pin = 'Earnova017@';
    let id = arg1;
    if (arg1 === 'Earnova017@' || arg1 === '889900') {
      pin = arg1;
      id = arg2 || '';
    } else if (arg2) {
      pin = arg2;
    }
    return request<{ success: boolean; submission?: any; message?: string }>(`/admin/tasks/proofs/${id}/action`, {
      method: 'POST',
      headers: { 'x-admin-pin': pin },
      body: JSON.stringify({ action: 'REJECTED' }),
    });
  },

  adminAddAd: (arg1: any, arg2?: any) => {
    let pin = 'Earnova017@';
    let ad = arg1;
    if (typeof arg1 === 'string') {
      pin = arg1;
      ad = arg2;
    } else if (typeof arg2 === 'string') {
      pin = arg2;
    }
    return request<{ success: boolean; ad?: any; message?: string }>('/admin/ads/add', {
      method: 'POST',
      headers: { 'x-admin-pin': pin },
      body: JSON.stringify(ad),
    });
  },

  adminDeleteAd: (arg1: string, arg2?: string) => {
    let pin = 'Earnova017@';
    let id = arg1;
    if (arg1 === 'Earnova017@' || arg1 === '889900') {
      pin = arg1;
      id = arg2 || '';
    } else if (arg2) {
      pin = arg2;
    }
    return request<{ success: boolean; message?: string }>(`/admin/ads/${id}`, {
      method: 'DELETE',
      headers: { 'x-admin-pin': pin },
    });
  },

  adminModifyUserBalance: (userId: string, amount: number, pin: string = 'Earnova017@') =>
    request<{ success: boolean; user?: any; message?: string }>(`/admin/users/${userId}/balance`, {
      method: 'POST',
      headers: { 'x-admin-pin': pin },
      body: JSON.stringify({ amount }),
    }),

  adminUpdateUserBalance: (arg1: any, arg2: any, arg3?: any) => {
    let pin = 'Earnova017@';
    let userId = arg1;
    let amount = arg2;
    if (typeof arg1 === 'string' && (arg1 === 'Earnova017@' || arg1 === '889900')) {
      pin = arg1;
      userId = arg2;
      amount = arg3;
    } else if (typeof arg3 === 'string') {
      pin = arg3;
    }
    return request<{ success: boolean; user?: any; message?: string }>(`/admin/users/${userId}/balance`, {
      method: 'POST',
      headers: { 'x-admin-pin': pin },
      body: JSON.stringify({ amount }),
    });
  },

  adminToggleUserStatus: (arg1: string, arg2?: string) => {
    let pin = 'Earnova017@';
    let userId = arg1;
    if (arg1 === 'Earnova017@' || arg1 === '889900') {
      pin = arg1;
      userId = arg2 || '';
    } else if (arg2) {
      pin = arg2;
    }
    return request<{ success: boolean; user?: any; message?: string }>(`/admin/users/${userId}/toggle-status`, {
      method: 'POST',
      headers: { 'x-admin-pin': pin },
    });
  },

  adminUpdateSettings: (arg1: any, arg2?: any) => {
    let pin = 'Earnova017@';
    let settings = arg1;
    if (typeof arg1 === 'string') {
      pin = arg1;
      settings = arg2;
    } else if (typeof arg2 === 'string') {
      pin = arg2;
    }
    return request<{ success: boolean; settings?: any; message?: string }>('/admin/settings', {
      method: 'POST',
      headers: { 'x-admin-pin': pin },
      body: JSON.stringify(settings),
    });
  },

  redeemVoucher: (code: string) => {
    return request<{ success: boolean; amount?: number; message: string; newBalance?: number }>('/vouchers/redeem', {
      method: 'POST',
      body: JSON.stringify({ code }),
    });
  },

  completeTask: (taskId: string, rewardAmount: number, taskTitle: string) => {
    return request<{ success: boolean; rewardAmount?: number; newBalance?: number; message: string }>('/tasks/complete', {
      method: 'POST',
      body: JSON.stringify({ taskId, rewardAmount, taskTitle }),
    });
  },
};

