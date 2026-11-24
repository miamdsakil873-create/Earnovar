import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getDatabase,
  ref,
  set,
  get,
  onValue,
  push,
  remove,
  update,
} from 'firebase/database';

import { DEFAULT_TASKS_40, DEFAULT_ADS_30 } from '../data/defaultCatalog.ts';

export const firebaseConfig = {
  apiKey: "AIzaSyBtYbYYWVvtQE5YnMtBFTr9LbYGCQafI-w",
  authDomain: "earnova-a7380.firebaseapp.com",
  databaseURL: "https://earnova-a7380-default-rtdb.firebaseio.com",
  projectId: "earnova-a7380",
  storageBucket: "earnova-a7380.firebasestorage.app",
  messagingSenderId: "709393342224",
  appId: "1:709393342224:web:8b516ed2a443be3221cf95",
  measurementId: "G-DGKLFXBXY5"
};

// Initialize Firebase App
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const rtdb = getDatabase(app, firebaseConfig.databaseURL);

const RTDB_BASE = firebaseConfig.databaseURL.replace(/\/+$/, '');

// Default initial tasks (40 Tasks with Monetag Direct Links, max ৳10 reward)
const DEFAULT_TASKS = DEFAULT_TASKS_40;


const DEFAULT_SETTINGS = {
  siteNotice: '🎉 Earnova তে স্বাগতম! ভিডিও দেখে ও টাস্ক করে বিকাশ ও নগদে টাকা উত্তোলন করুন।',
  noticeActive: true,
  minWithdrawal: 50,
  minReferralsToWithdraw: 0,
  dailyAdLimit: 12,
  dailyBonusAmount: 5.0,
  referralDirectBonus: 10.0,
  referralCommissionPercent: 10,
  isWithdrawalOpen: true,
  maintenanceMode: false,
  supportTelegram: 'https://t.me/EarnWatchBotSupport',
  monetag: {
    zoneId: '9537184',
    enabled: true,
  },
  paymentMethods: { bKash: true, Nagad: true, Rocket: true },
};

// Local storage backup keys for offline / permission denied resilience
const LOCAL_TASKS_KEY = 'earnova_shared_tasks_cache';
const LOCAL_SETTINGS_KEY = 'earnova_shared_settings_cache';

const getCachedTasks = (): any[] => {
  try {
    const raw = localStorage.getItem(LOCAL_TASKS_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return DEFAULT_TASKS;
};

const setCachedTasks = (tasks: any[]) => {
  try {
    localStorage.setItem(LOCAL_TASKS_KEY, JSON.stringify(tasks));
  } catch (e) {}
};

// ----------------- TASKS SERVICE (Firebase Realtime Database) -----------------
export const firebaseTasks = {
  subscribe: (callback: (tasks: any[]) => void) => {
    // Immediate callback with cached tasks
    callback(getCachedTasks());

    try {
      const tasksRef = ref(rtdb, 'tasks');
      const unsubscribe = onValue(
        tasksRef,
        (snapshot) => {
          if (!snapshot.exists()) {
            callback(getCachedTasks());
          } else {
            const val = snapshot.val();
            const list: any[] = [];
            if (val && typeof val === 'object') {
              Object.keys(val).forEach((k) => {
                if (k !== 'adminKey' && val[k] && typeof val[k] === 'object') {
                  list.push({ id: k, ...val[k] });
                }
              });
            }
            if (list.length > 0) {
              setCachedTasks(list);
              callback(list);
            } else {
              callback(getCachedTasks());
            }
          }
        },
        (error) => {
          console.warn('Firebase RTDB tasks error:', error.message);
          // Try REST API fallback
          fetch(`${RTDB_BASE}/tasks.json`)
            .then((r) => r.json())
            .then((val) => {
              if (val && typeof val === 'object' && !val.error) {
                const list: any[] = [];
                Object.keys(val).forEach((k) => {
                  if (k !== 'adminKey' && val[k] && typeof val[k] === 'object') {
                    list.push({ id: k, ...val[k] });
                  }
                });
                if (list.length > 0) {
                  setCachedTasks(list);
                  callback(list);
                }
              }
            })
            .catch(() => {});
          callback(getCachedTasks());
        }
      );
      return unsubscribe;
    } catch (e) {
      console.warn('RTDB subscribe init error:', e);
      return () => {};
    }
  },

  getAll: async (): Promise<any[]> => {
    try {
      const res = await fetch(`${RTDB_BASE}/tasks.json`);
      const val = await res.json();
      if (val && typeof val === 'object' && !val.error) {
        const list: any[] = [];
        Object.keys(val).forEach((k) => {
          if (k !== 'adminKey' && val[k] && typeof val[k] === 'object') {
            list.push({ id: k, ...val[k] });
          }
        });
        if (list.length > 0) {
          setCachedTasks(list);
          return list;
        }
      }
    } catch (err) {}

    try {
      const snapshot = await get(ref(rtdb, 'tasks'));
      if (snapshot.exists()) {
        const val = snapshot.val();
        const list: any[] = [];
        if (val && typeof val === 'object') {
          Object.keys(val).forEach((k) => {
            if (k !== 'adminKey' && val[k] && typeof val[k] === 'object') {
              list.push({ id: k, ...val[k] });
            }
          });
        }
        if (list.length > 0) {
          setCachedTasks(list);
          return list;
        }
      }
    } catch (e) {}

    return getCachedTasks();
  },

  add: async (task: any) => {
    const tempId = task.id || ('task_' + Date.now());
    const taskPayload = {
      id: tempId,
      title: task.title,
      description: task.description || '',
      category: task.category || 'TELEGRAM',
      rewardAmount: Number(task.rewardAmount) || 10,
      instructions: task.instructions || ['টাস্কের লিংকে যান', 'প্রমাণ দিন'],
      proofPlaceholder: task.proofPlaceholder || 'প্রমাণ লিখুন',
      proofType: task.proofType || 'text',
      active: task.active ?? true,
      totalCompleted: task.totalCompleted || 0,
      estimatedMinutes: task.estimatedMinutes || 1,
      url: task.url || task.taskUrl || '',
      taskUrl: task.taskUrl || task.url || '',
      createdAt: new Date().toISOString(),
    };

    // Save locally immediately
    const cached = getCachedTasks();
    const newTaskObj = { ...taskPayload };
    setCachedTasks([newTaskObj, ...cached.filter((t) => t.id !== tempId)]);

    // Save to Firebase RTDB via authenticated PATCH (root level with adminKey satisfies RTDB rules)
    try {
      const restRes = await fetch(`${RTDB_BASE}/tasks.json`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminKey: 'Earnova017@',
          [tempId]: taskPayload,
        }),
      });
      const data = await restRes.json();
      if (data && !data.error) {
        return { success: true, id: tempId, task: newTaskObj };
      }
    } catch (e: any) {
      console.warn('Firebase RTDB task add error:', e.message);
    }

    return { success: true, id: tempId, task: newTaskObj };
  },

  delete: async (id: string) => {
    // Delete from local cache
    const cached = getCachedTasks();
    const updated = cached.filter((t) => t.id !== id);
    setCachedTasks(updated);

    try {
      await fetch(`${RTDB_BASE}/tasks.json`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminKey: 'Earnova017@',
          [id]: null,
        }),
      });
      return { success: true };
    } catch (e: any) {
      console.warn('Firebase RTDB delete error:', e);
      return { success: true };
    }
  },
};

// ----------------- SETTINGS SERVICE -----------------
const cleanSettingsObject = (raw: any) => {
  if (!raw || typeof raw !== 'object') return DEFAULT_SETTINGS;
  const { users, referrals, transactions, adminKey, ...clean } = raw;
  return { ...DEFAULT_SETTINGS, ...clean };
};

export const firebaseSettings = {
  subscribe: (callback: (settings: any) => void) => {
    try {
      const settingsRef = ref(rtdb, 'settings');
      return onValue(
        settingsRef,
        (snapshot) => {
          if (snapshot.exists()) {
            callback(cleanSettingsObject(snapshot.val()));
          } else {
            callback(DEFAULT_SETTINGS);
          }
        },
        () => callback(DEFAULT_SETTINGS)
      );
    } catch (e) {
      callback(DEFAULT_SETTINGS);
      return () => {};
    }
  },

  get: async (): Promise<any> => {
    try {
      const res = await fetch(`${RTDB_BASE}/settings.json`);
      const val = await res.json();
      if (val && !val.error && typeof val === 'object') {
        return cleanSettingsObject(val);
      }
    } catch (e) {}
    try {
      const snap = await get(ref(rtdb, 'settings'));
      if (snap.exists()) return cleanSettingsObject(snap.val());
    } catch (e) {}
    return DEFAULT_SETTINGS;
  },

  update: async (settings: any) => {
    const payload = {
      ...settings,
      adminKey: settings.adminKey || 'Earnova017@',
    };
    try {
      await update(ref(rtdb, 'settings'), payload);
      return { success: true };
    } catch (e: any) {
      try {
        await fetch(`${RTDB_BASE}/settings.json`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        return { success: true };
      } catch (err) {}
      return { success: false, message: e.message };
    }
  },
};

// ----------------- ADS SERVICE -----------------
export const firebaseAds = {
  subscribe: (callback: (ads: any[]) => void) => {
    try {
      const adsRef = ref(rtdb, 'ads');
      return onValue(
        adsRef,
        (snap) => {
          if (snap.exists()) {
            const val = snap.val();
            const list: any[] = [];
            if (val && typeof val === 'object') {
              Object.keys(val).forEach((k) => {
                if (k !== 'adminKey' && val[k] && typeof val[k] === 'object') {
                  list.push({ id: k, ...val[k] });
                }
              });
            }
            callback(list.length > 0 ? list : DEFAULT_ADS_30);
          } else {
            callback(DEFAULT_ADS_30);
          }
        },
        () => {
          fetch(`${RTDB_BASE}/ads.json`)
            .then((r) => r.json())
            .then((val) => {
              if (val && typeof val === 'object' && !val.error) {
                const list: any[] = [];
                Object.keys(val).forEach((k) => {
                  if (k !== 'adminKey' && val[k] && typeof val[k] === 'object') {
                    list.push({ id: k, ...val[k] });
                  }
                });
                callback(list.length > 0 ? list : DEFAULT_ADS_30);
              } else {
                callback(DEFAULT_ADS_30);
              }
            })
            .catch(() => callback(DEFAULT_ADS_30));
        }
      );
    } catch (e) {
      callback(DEFAULT_ADS_30);
      return () => {};
    }
  },

  getAll: async (): Promise<any[]> => {
    try {
      const res = await fetch(`${RTDB_BASE}/ads.json`);
      const val = await res.json();
      if (val && typeof val === 'object' && !val.error) {
        const list: any[] = [];
        Object.keys(val).forEach((k) => {
          if (k !== 'adminKey' && val[k] && typeof val[k] === 'object') {
            list.push({ id: k, ...val[k] });
          }
        });
        if (list.length > 0) return list;
      }
    } catch (e) {}
    return DEFAULT_ADS_30;
  },

  add: async (ad: any) => {
    const tempId = ad.id || ('ad_' + Date.now());
    const payload = {
      id: tempId,
      title: ad.title,
      description: ad.description || '',
      category: ad.category || 'বিজ্ঞাপন',
      rewardAmount: Number(ad.rewardAmount) || 3.5,
      durationSeconds: Number(ad.durationSeconds) || 15,
      thumbnail: ad.thumbnail || 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=600&q=80',
      sponsorName: ad.sponsorName || 'Earnova Partner',
      active: ad.active ?? true,
      createdAt: new Date().toISOString(),
    };
    try {
      await fetch(`${RTDB_BASE}/ads.json`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminKey: 'Earnova017@',
          [tempId]: payload,
        }),
      });
      return { success: true, id: tempId, ad: payload };
    } catch (e: any) {
      return { success: false, message: e.message };
    }
  },

  delete: async (id: string) => {
    try {
      await fetch(`${RTDB_BASE}/ads.json`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminKey: 'Earnova017@',
          [id]: null,
        }),
      });
      return { success: true };
    } catch (e: any) {
      return { success: false, message: e.message };
    }
  },
};

// ----------------- WITHDRAWALS SERVICE -----------------
export const firebaseWithdrawals = {
  subscribe: (callback: (withdrawals: any[]) => void) => {
    try {
      const wRef = ref(rtdb, 'withdrawals');
      return onValue(
        wRef,
        (snap) => {
          if (snap.exists()) {
            const val = snap.val();
            const list: any[] = [];
            if (val && typeof val === 'object') {
              Object.keys(val).forEach((k) => {
                if (k !== 'adminKey' && val[k] && typeof val[k] === 'object') {
                  list.push({ id: k, ...val[k] });
                }
              });
            }
            list.sort((a, b) => new Date(b.requestedAt || 0).getTime() - new Date(a.requestedAt || 0).getTime());
            callback(list);
          } else {
            callback([]);
          }
        },
        () => {
          fetch(`${RTDB_BASE}/withdrawals.json`)
            .then((r) => r.json())
            .then((val) => {
              if (val && typeof val === 'object' && !val.error) {
                const list = Object.keys(val)
                  .filter((k) => k !== 'adminKey' && val[k] && typeof val[k] === 'object')
                  .map((k) => ({ id: k, ...val[k] }))
                  .sort((a, b) => new Date(b.requestedAt || 0).getTime() - new Date(a.requestedAt || 0).getTime());
                callback(list);
              } else {
                callback([]);
              }
            })
            .catch(() => callback([]));
        }
      );
    } catch (e) {
      return () => {};
    }
  },

  create: async (data: any) => {
    const tempId = data.id || ('wd_' + Date.now());
    const payload = {
      ...data,
      id: tempId,
      adminKey: 'Earnova017@',
      status: data.status || 'PENDING',
      requestedAt: data.requestedAt || new Date().toISOString(),
    };
    try {
      await fetch(`${RTDB_BASE}/withdrawals/${tempId}.json`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      return { success: true, id: tempId, withdrawal: payload };
    } catch (e: any) {
      return { success: false, message: e.message };
    }
  },

  updateStatus: async (id: string, status: 'COMPLETED' | 'REJECTED', note?: string) => {
    try {
      await fetch(`${RTDB_BASE}/withdrawals/${id}.json`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminKey: 'Earnova017@',
          status,
          note: note || '',
          updatedAt: new Date().toISOString(),
        }),
      });
      return { success: true };
    } catch (e: any) {
      return { success: false, message: e.message };
    }
  },

  getAll: async (): Promise<any[]> => {
    try {
      const res = await fetch(`${RTDB_BASE}/withdrawals.json`);
      const val = await res.json();
      if (val && typeof val === 'object' && !val.error) {
        return Object.keys(val)
          .filter((k) => k !== 'adminKey' && val[k] && typeof val[k] === 'object')
          .map((k) => ({ id: k, ...val[k] }))
          .sort((a, b) => new Date(b.requestedAt || 0).getTime() - new Date(a.requestedAt || 0).getTime());
      }
    } catch (e) {}
    return [];
  },
};

// ----------------- SUBMISSIONS SERVICE -----------------
export const firebaseSubmissions = {
  getAll: async (): Promise<any[]> => {
    try {
      const res = await fetch(`${RTDB_BASE}/task_submissions.json`);
      const val = await res.json();
      if (val && typeof val === 'object' && !val.error) {
        return Object.keys(val).map((k) => ({ id: k, ...val[k] })).sort(
          (a, b) => new Date(b.submittedAt || 0).getTime() - new Date(a.submittedAt || 0).getTime()
        );
      }
    } catch (e) {}
    return [];
  },

  subscribe: (callback: (subs: any[]) => void) => {
    try {
      const subRef = ref(rtdb, 'task_submissions');
      return onValue(
        subRef,
        (snap) => {
          if (snap.exists()) {
            const val = snap.val();
            const list: any[] = [];
            if (val && typeof val === 'object') {
              Object.keys(val).forEach((k) => {
                if (val[k]) list.push({ id: k, ...val[k] });
              });
            }
            list.sort((a, b) => new Date(b.submittedAt || 0).getTime() - new Date(a.submittedAt || 0).getTime());
            callback(list);
          } else {
            callback([]);
          }
        },
        () => callback([])
      );
    } catch (e) {
      return () => {};
    }
  },

  submit: async (data: any) => {
    try {
      const newRef = push(ref(rtdb, 'task_submissions'));
      await set(newRef, {
        ...data,
        status: 'PENDING',
        submittedAt: new Date().toISOString(),
      });
      return { success: true, id: newRef.key };
    } catch (e: any) {
      return { success: false, message: e.message };
    }
  },

  updateStatus: async (id: string, status: 'APPROVED' | 'REJECTED', reason?: string) => {
    try {
      await update(ref(rtdb, `task_submissions/${id}`), {
        status,
        reason: reason || '',
        reviewedAt: new Date().toISOString(),
      });
      return { success: true };
    } catch (e: any) {
      return { success: false, message: e.message };
    }
  },
};

// ----------------- TRANSACTIONS SERVICE (Cloud Synced Ledger) -----------------
export const firebaseTransactions = {
  add: async (phone: string, tx: any) => {
    try {
      const sanitizedPhone = (phone || '').replace(/[^0-9]/g, '');
      if (!sanitizedPhone) return { success: false };
      const txId = tx.id || ('tx_' + Date.now() + '_' + Math.floor(Math.random() * 1000));
      const payload = {
        ...tx,
        id: txId,
        createdAt: tx.createdAt || new Date().toISOString(),
        adminKey: 'Earnova017@',
      };

      await Promise.all([
        fetch(`${RTDB_BASE}/settings/transactions/${sanitizedPhone}/${txId}.json`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }).catch(() => {}),
        fetch(`${RTDB_BASE}/transactions/${sanitizedPhone}/${txId}.json`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }).catch(() => {}),
      ]);

      return { success: true, id: txId };
    } catch (e: any) {
      return { success: false, message: e.message };
    }
  },

  getByUser: async (phone: string): Promise<any[]> => {
    const sanitizedPhone = (phone || '').replace(/[^0-9]/g, '');
    if (!sanitizedPhone) return [];

    const txMap = new Map<string, any>();
    const collect = (val: any) => {
      if (val && typeof val === 'object' && !val.error) {
        Object.keys(val).forEach((k) => {
          if (k !== 'adminKey' && val[k] && typeof val[k] === 'object') {
            const { adminKey, ...clean } = val[k];
            txMap.set(clean.id || k, { id: k, ...clean });
          }
        });
      }
    };

    try {
      const [res1, res2] = await Promise.all([
        fetch(`${RTDB_BASE}/settings/transactions/${sanitizedPhone}.json`).then((r) => r.json()).catch(() => null),
        fetch(`${RTDB_BASE}/transactions/${sanitizedPhone}.json`).then((r) => r.json()).catch(() => null),
      ]);
      collect(res1);
      collect(res2);
    } catch (e) {}

    return Array.from(txMap.values()).sort(
      (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    );
  },
};

// ----------------- REFERRALS SERVICE (Permanent Cloud Referral Records) -----------------
export const firebaseReferrals = {
  add: async (referrer: any, referredUser: any, bonusAmount: number) => {
    try {
      const refPhone = (referrer.phone || referrer.phoneKey || '').replace(/[^0-9]/g, '');
      const childPhone = (referredUser.phone || '').replace(/[^0-9]/g, '');
      if (!refPhone || !childPhone || refPhone === childPhone) return { success: false };

      const recordId = `ref_${refPhone}_${childPhone}`;
      const payload = {
        id: recordId,
        referrerId: referrer.id || refPhone,
        referrerPhone: refPhone,
        referrerCode: (referrer.referralCode || '').toUpperCase(),
        referredUserId: referredUser.id || childPhone,
        referredUserName: referredUser.name || 'User',
        referredUserPhone: childPhone,
        bonusAmount: Number(bonusAmount) || 10,
        bonusAwarded: true,
        createdAt: referredUser.createdAt || new Date().toISOString(),
        adminKey: 'Earnova017@',
      };

      await Promise.all([
        fetch(`${RTDB_BASE}/settings/referrals/${refPhone}/${childPhone}.json`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }).catch(() => {}),
        fetch(`${RTDB_BASE}/referrals/${refPhone}/${childPhone}.json`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }).catch(() => {}),
      ]);

      return { success: true, record: payload };
    } catch (e: any) {
      return { success: false, message: e.message };
    }
  },

  getByUser: async (user: any, defaultDirectBonus = 10): Promise<any[]> => {
    if (!user) return [];
    const refPhone = (user.phone || user.phoneKey || '').replace(/[^0-9]/g, '');
    const myCode = (user.referralCode || '').trim().toUpperCase();
    const myId = user.id || '';

    const refMap = new Map<string, any>();

    const collectNodes = (val: any) => {
      if (val && typeof val === 'object' && !val.error) {
        Object.keys(val).forEach((k) => {
          if (k !== 'adminKey' && val[k] && typeof val[k] === 'object') {
            const { adminKey, ...clean } = val[k];
            const childKey = (clean.referredUserPhone || clean.referredUserId || k).replace(/[^0-9]/g, '') || k;
            if (!refMap.has(childKey)) {
              refMap.set(childKey, {
                id: clean.id || k,
                name: clean.referredUserName || clean.name || 'User',
                phone: clean.referredUserPhone || clean.phone || childKey,
                bonusAmount: Number(clean.bonusAmount ?? defaultDirectBonus),
                createdAt: clean.createdAt || new Date().toISOString(),
              });
            }
          }
        });
      }
    };

    try {
      const [res1, res2, allUsers] = await Promise.all([
        refPhone
          ? fetch(`${RTDB_BASE}/settings/referrals/${refPhone}.json`).then((r) => r.json()).catch(() => null)
          : Promise.resolve(null),
        refPhone
          ? fetch(`${RTDB_BASE}/referrals/${refPhone}.json`).then((r) => r.json()).catch(() => null)
          : Promise.resolve(null),
        firebaseUsers.getAll().catch(() => []),
      ]);

      collectNodes(res1);
      collectNodes(res2);

      // Also scan all cloud users whose referredBy matches this user's referralCode or id or phone
      (allUsers || []).forEach((u: any) => {
        const uRefBy = (u.referredBy || '').trim().toUpperCase();
        const uRefPhone = (u.referredByPhone || '').replace(/[^0-9]/g, '');
        const uPhone = (u.phone || u.phoneKey || '').replace(/[^0-9]/g, '');
        if (!uPhone || uPhone === refPhone) return;

        const isMatch =
          (myCode && uRefBy === myCode) ||
          (myId && uRefBy === myId.toUpperCase()) ||
          (refPhone && (uRefBy === refPhone || uRefPhone === refPhone));

        if (isMatch && !refMap.has(uPhone)) {
          refMap.set(uPhone, {
            id: u.id || uPhone,
            name: u.name || 'User',
            phone: uPhone,
            bonusAmount: Number(defaultDirectBonus),
            createdAt: u.createdAt || new Date().toISOString(),
          });
          // Backfill permanent referral record silently so it stays locked forever
          firebaseReferrals.add(user, u, defaultDirectBonus).catch(() => {});
        }
      });
    } catch (e) {}

    return Array.from(refMap.values()).sort(
      (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    );
  },
};

// ----------------- USERS SERVICE (Cloud Synced User Registry) -----------------
export const firebaseUsers = {
  save: async (user: any) => {
    try {
      const sanitizedPhone = (user.phone || '').replace(/[^0-9]/g, '');
      if (!sanitizedPhone) return { success: false };

      const payload = {
        ...user,
        referralCode: (user.referralCode || '').trim().toUpperCase(),
        referredBy: user.referredBy ? String(user.referredBy).trim().toUpperCase() : null,
        referralCount: Number(user.referralCount || 0),
        referralBonusEarned: Number(user.referralBonusEarned || 0),
        adminKey: 'Earnova017@',
        updatedAt: new Date().toISOString(),
      };

      await Promise.all([
        fetch(`${RTDB_BASE}/settings/users/${sanitizedPhone}.json`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }).catch(() => {}),
        fetch(`${RTDB_BASE}/users/${sanitizedPhone}.json`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }).catch(() => {}),
      ]);

      return { success: true };
    } catch (e: any) {
      return { success: false, message: e.message };
    }
  },

  get: async (phone: string): Promise<any | null> => {
    try {
      const sanitizedPhone = (phone || '').replace(/[^0-9]/g, '');
      if (!sanitizedPhone) return null;

      try {
        const res1 = await fetch(`${RTDB_BASE}/settings/users/${sanitizedPhone}.json`);
        const val1 = await res1.json();
        if (val1 && !val1.error && typeof val1 === 'object') {
          const { adminKey, ...user } = val1;
          return user;
        }
      } catch (e) {}

      try {
        const res2 = await fetch(`${RTDB_BASE}/users/${sanitizedPhone}.json`);
        const val2 = await res2.json();
        if (val2 && !val2.error && typeof val2 === 'object') {
          const { adminKey, ...user } = val2;
          return user;
        }
      } catch (e) {}
    } catch (e) {}
    return null;
  },

  getAll: async (): Promise<any[]> => {
    const userMap = new Map<string, any>();

    const collectUsers = (val: any) => {
      if (val && typeof val === 'object' && !val.error) {
        Object.keys(val).forEach((k) => {
          if (k !== 'adminKey' && val[k] && typeof val[k] === 'object') {
            const { adminKey, ...cleanUser } = val[k];
            const key = (cleanUser.phone || k).replace(/[^0-9]/g, '') || k;
            if (!userMap.has(key)) {
              userMap.set(key, { phoneKey: k, ...cleanUser });
            } else {
              // Merge preferring the record with newer updatedAt
              const existing = userMap.get(key);
              const existingTime = new Date(existing.updatedAt || existing.createdAt || 0).getTime();
              const incomingTime = new Date(cleanUser.updatedAt || cleanUser.createdAt || 0).getTime();
              if (incomingTime >= existingTime) {
                userMap.set(key, { ...existing, phoneKey: k, ...cleanUser });
              }
            }
          }
        });
      }
    };

    try {
      const [res1, res2] = await Promise.all([
        fetch(`${RTDB_BASE}/settings/users.json`).then((r) => r.json()).catch(() => null),
        fetch(`${RTDB_BASE}/users.json`).then((r) => r.json()).catch(() => null),
      ]);
      collectUsers(res1);
      collectUsers(res2);
    } catch (e) {}

    return Array.from(userMap.values());
  },

  findByReferralCode: async (code: string): Promise<any | null> => {
    const cleanCode = (code || '').trim().toUpperCase();
    if (!cleanCode) return null;

    const allUsers = await firebaseUsers.getAll();
    const matchByCode = allUsers.find(
      (u) => (u.referralCode || '').trim().toUpperCase() === cleanCode
    );
    if (matchByCode) return matchByCode;

    // Fallback: match by phone if someone entered phone number
    const cleanDigits = cleanCode.replace(/[^0-9]/g, '');
    if (cleanDigits.length >= 10) {
      return allUsers.find((u) => (u.phone || '').replace(/[^0-9]/g, '') === cleanDigits) || null;
    }
    return null;
  },

  creditReferralBonus: async (referrer: any, newUser: any, bonusAmount: number) => {
    try {
      const refPhone = (referrer?.phone || referrer?.phoneKey || '').replace(/[^0-9]/g, '');
      const childPhone = (newUser?.phone || '').replace(/[^0-9]/g, '');
      if (!refPhone || !childPhone || refPhone === childPhone) {
        return { success: false };
      }

      // Fetch freshest referrer from RTDB so balance never overwrites stale data
      const freshReferrer = (await firebaseUsers.get(refPhone)) || referrer;
      const bonus = Number(bonusAmount) || 10;
      const currentBal = Number(freshReferrer.balance) || 0;
      const currentEarned = Number(freshReferrer.totalEarned) || 0;
      const currentRefCount = Number(freshReferrer.referralCount) || 0;
      const currentRefBonusEarned = Number(freshReferrer.referralBonusEarned) || 0;

      const newBalance = Number((currentBal + bonus).toFixed(2));
      const newTotalEarned = Number((currentEarned + bonus).toFixed(2));
      const newRefCount = currentRefCount + 1;
      const newRefBonusEarned = Number((currentRefBonusEarned + bonus).toFixed(2));

      // 1. Update referrer balance & referral counts in Firebase RTDB
      await firebaseUsers.update(refPhone, {
        balance: newBalance,
        totalEarned: newTotalEarned,
        referralCount: newRefCount,
        referralBonusEarned: newRefBonusEarned,
      });

      // 2. Save permanent referral record in Firebase RTDB
      await firebaseReferrals.add(freshReferrer, newUser, bonus);

      // 3. Save permanent referral bonus transaction in Firebase RTDB
      await firebaseTransactions.add(refPhone, {
        id: 'tx_ref_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
        userId: freshReferrer.id || refPhone,
        type: 'REFERRAL_BONUS',
        amount: bonus,
        description: `নতুন বন্ধু ${newUser.name || 'User'} যোগ করায় রেফার বোনাস`,
        status: 'COMPLETED',
        createdAt: new Date().toISOString(),
      });

      return {
        success: true,
        newBalance,
        newRefCount,
        bonus,
      };
    } catch (e: any) {
      return { success: false, message: e.message };
    }
  },

  creditReferralCommission: async (earnerUser: any, earnedAmount: number, sourceLabel: string) => {
    try {
      if (!earnerUser?.referredBy || earnedAmount <= 0) return;
      const [settings, referrer] = await Promise.all([
        firebaseSettings.get().catch(() => DEFAULT_SETTINGS),
        firebaseUsers.findByReferralCode(earnerUser.referredBy).catch(() => null),
      ]);
      if (!referrer) return;

      const refPhone = (referrer.phone || referrer.phoneKey || '').replace(/[^0-9]/g, '');
      const earnerPhone = (earnerUser.phone || '').replace(/[^0-9]/g, '');
      if (!refPhone || refPhone === earnerPhone) return;

      const percent = Number(settings?.referralCommissionPercent ?? 10);
      if (percent <= 0) return;

      const commission = Number(((earnedAmount * percent) / 100).toFixed(2));
      if (commission <= 0) return;

      const freshReferrer = (await firebaseUsers.get(refPhone)) || referrer;
      const newBalance = Number(((Number(freshReferrer.balance) || 0) + commission).toFixed(2));
      const newTotalEarned = Number(((Number(freshReferrer.totalEarned) || 0) + commission).toFixed(2));
      const newRefBonusEarned = Number(((Number(freshReferrer.referralBonusEarned) || 0) + commission).toFixed(2));

      await firebaseUsers.update(refPhone, {
        balance: newBalance,
        totalEarned: newTotalEarned,
        referralBonusEarned: newRefBonusEarned,
      });

      await firebaseTransactions.add(refPhone, {
        id: 'tx_comm_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
        userId: freshReferrer.id || refPhone,
        type: 'REFERRAL_BONUS',
        amount: commission,
        description: `রেফারেল কমিশন (${percent}%): ${earnerUser.name || 'বন্ধু'}-এর ${sourceLabel} থেকে`,
        status: 'COMPLETED',
        createdAt: new Date().toISOString(),
      });
    } catch (e) {}
  },

  update: async (phone: string, patch: any) => {
    try {
      const sanitizedPhone = (phone || '').replace(/[^0-9]/g, '');
      if (!sanitizedPhone) return { success: false };
      const patchPayload = {
        adminKey: 'Earnova017@',
        ...patch,
        updatedAt: new Date().toISOString(),
      };
      await Promise.all([
        fetch(`${RTDB_BASE}/settings/users/${sanitizedPhone}.json`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(patchPayload),
        }).catch(() => {}),
        fetch(`${RTDB_BASE}/users/${sanitizedPhone}.json`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(patchPayload),
        }).catch(() => {}),
      ]);
      return { success: true };
    } catch (e: any) {
      return { success: false, message: e.message };
    }
  },

  updateBalance: async (phone: string, newBalance: number, newTotalEarned?: number) => {
    try {
      const sanitizedPhone = (phone || '').replace(/[^0-9]/g, '');
      if (!sanitizedPhone) return { success: false };

      const patchPayload: Record<string, any> = {
        adminKey: 'Earnova017@',
        balance: Number(newBalance),
        updatedAt: new Date().toISOString(),
      };
      if (newTotalEarned !== undefined) {
        patchPayload.totalEarned = Number(newTotalEarned);
      }

      await Promise.all([
        fetch(`${RTDB_BASE}/settings/users/${sanitizedPhone}.json`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(patchPayload),
        }),
        fetch(`${RTDB_BASE}/users/${sanitizedPhone}.json`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(patchPayload),
        }).catch(() => {}),
      ]);

      return { success: true };
    } catch (e: any) {
      return { success: false, message: e.message };
    }
  },

  toggleStatus: async (phone: string, newStatus: 'ACTIVE' | 'BANNED') => {
    try {
      const sanitizedPhone = (phone || '').replace(/[^0-9]/g, '');
      if (!sanitizedPhone) return { success: false };

      const patchPayload = {
        adminKey: 'Earnova017@',
        status: newStatus,
        updatedAt: new Date().toISOString(),
      };

      await Promise.all([
        fetch(`${RTDB_BASE}/settings/users/${sanitizedPhone}.json`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(patchPayload),
        }),
        fetch(`${RTDB_BASE}/users/${sanitizedPhone}.json`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(patchPayload),
        }).catch(() => {}),
      ]);

      return { success: true };
    } catch (e: any) {
      return { success: false, message: e.message };
    }
  },

  subscribeUser: (phone: string, callback: (user: any) => void) => {
    const sanitizedPhone = (phone || '').replace(/[^0-9]/g, '');
    if (!sanitizedPhone) return () => {};

    firebaseUsers.get(sanitizedPhone).then((u) => {
      if (u) callback(u);
    });

    const interval = setInterval(async () => {
      try {
        const u = await firebaseUsers.get(sanitizedPhone);
        if (u) callback(u);
      } catch (e) {}
    }, 5000);

    return () => clearInterval(interval);
  },
};

// ----------------- VOUCHERS / REDEEM CODES SERVICE -----------------
export const firebaseVouchers = {
  subscribe: (callback: (vouchers: any[]) => void) => {
    try {
      const vouchersRef = ref(rtdb, 'vouchers');
      return onValue(
        vouchersRef,
        (snap) => {
          if (snap.exists()) {
            const val = snap.val();
            const list: any[] = [];
            if (val && typeof val === 'object') {
              Object.keys(val).forEach((k) => {
                if (k !== 'adminKey' && val[k] && typeof val[k] === 'object') {
                  list.push({ id: k, ...val[k] });
                }
              });
            }
            callback(list);
          } else {
            callback([]);
          }
        },
        () => {
          fetch(`${RTDB_BASE}/vouchers.json`)
            .then((r) => r.json())
            .then((val) => {
              if (val && typeof val === 'object' && !val.error) {
                const list: any[] = [];
                Object.keys(val).forEach((k) => {
                  if (k !== 'adminKey' && val[k] && typeof val[k] === 'object') {
                    list.push({ id: k, ...val[k] });
                  }
                });
                callback(list);
              } else {
                callback([]);
              }
            })
            .catch(() => callback([]));
        }
      );
    } catch (e) {
      callback([]);
      return () => {};
    }
  },

  getAll: async (): Promise<any[]> => {
    try {
      const res = await fetch(`${RTDB_BASE}/vouchers.json`);
      const val = await res.json();
      if (val && typeof val === 'object' && !val.error) {
        const list: any[] = [];
        Object.keys(val).forEach((k) => {
          if (k !== 'adminKey' && val[k] && typeof val[k] === 'object') {
            list.push({ id: k, ...val[k] });
          }
        });
        return list;
      }
    } catch (e) {}
    return [];
  },

  add: async (voucher: { code: string; amount: number; maxUses?: number }) => {
    const rawCode = (voucher.code || '').trim().toUpperCase();
    if (!rawCode) return { success: false, message: 'ভাউচার কোড দিন' };
    const amount = Number(voucher.amount) || 10;
    const maxUses = Number(voucher.maxUses) || 100;

    const payload = {
      id: rawCode,
      code: rawCode,
      amount,
      maxUses,
      usedCount: 0,
      usedBy: {},
      active: true,
      createdAt: new Date().toISOString(),
    };

    try {
      await fetch(`${RTDB_BASE}/vouchers.json`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminKey: 'Earnova017@',
          [rawCode]: payload,
        }),
      });
      return { success: true, voucher: payload };
    } catch (e: any) {
      return { success: false, message: e.message };
    }
  },

  delete: async (code: string) => {
    const rawCode = (code || '').trim().toUpperCase();
    try {
      await fetch(`${RTDB_BASE}/vouchers.json`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminKey: 'Earnova017@',
          [rawCode]: null,
        }),
      });
      return { success: true };
    } catch (e: any) {
      return { success: false, message: e.message };
    }
  },

  redeem: async (code: string, phone: string) => {
    const rawCode = (code || '').trim().toUpperCase();
    const sanitizedPhone = (phone || '').replace(/[^0-9]/g, '');

    if (!rawCode) return { success: false, message: 'দয়া করে ভাউচার কোডটি লিখুন।' };
    if (!sanitizedPhone) return { success: false, message: 'লগইন তথ্য সঠিক নয়।' };

    try {
      // 1. Fetch voucher from RTDB
      const res = await fetch(`${RTDB_BASE}/vouchers/${rawCode}.json`);
      const v = await res.json();
      if (!v || v.error || !v.active) {
        return { success: false, message: 'ভাউচার কোডটি সঠিক নয় অথবা মেয়াদোত্তীর্ণ।' };
      }

      // Check max uses
      const maxUses = v.maxUses || 9999;
      const usedCount = v.usedCount || 0;
      if (usedCount >= maxUses) {
        return { success: false, message: 'এই ভাউচার কোডের সর্বোচ্চ ব্যবহারের সীমা শেষ হয়েছে।' };
      }

      // Check if user already used this voucher
      if (v.usedBy && v.usedBy[sanitizedPhone]) {
        return { success: false, message: 'আপনি ইতিমধ্যে এই ভাউচার কোডটি ব্যবহার করেছেন!' };
      }

      // 2. Fetch User Profile
      const user = await firebaseUsers.get(sanitizedPhone);
      if (!user) {
        return { success: false, message: 'ইউজার একাউন্ট খুঁজে পাওয়া যায়নি।' };
      }

      const rewardAmount = Number(v.amount) || 10;
      const newBalance = Number((user.balance + rewardAmount).toFixed(2));
      const newTotalEarned = Number(((user.totalEarned || 0) + rewardAmount).toFixed(2));

      // 3. Update User Balance
      await firebaseUsers.update(sanitizedPhone, {
        balance: newBalance,
        totalEarned: newTotalEarned,
      });

      // 4. Update Voucher usage
      await fetch(`${RTDB_BASE}/vouchers/${rawCode}.json`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminKey: 'Earnova017@',
          usedCount: usedCount + 1,
          usedBy: {
            ...(v.usedBy || {}),
            [sanitizedPhone]: Date.now(),
          },
        }),
      });

      return {
        success: true,
        amount: rewardAmount,
        newBalance,
        message: `🎉 অভিনন্দন! ভাউচার কোড সফল হয়েছে। আপনার ওয়ালেটে ৳${rewardAmount.toFixed(2)} যোগ হয়েছে!`,
      };
    } catch (e: any) {
      return { success: false, message: e.message || 'ভাউচার রিডিম করতে ব্যর্থ হয়েছে।' };
    }
  },
};

// Helper to seed all 40 Monetag Tasks and 30 Video Ads directly to RTDB
export const firebaseSeedCatalog = async () => {
  try {
    const tasksPatch: Record<string, any> = { adminKey: 'Earnova017@' };
    DEFAULT_TASKS_40.forEach((t) => {
      tasksPatch[t.id] = t;
    });

    const adsPatch: Record<string, any> = { adminKey: 'Earnova017@' };
    DEFAULT_ADS_30.forEach((a) => {
      adsPatch[a.id] = a;
    });

    await Promise.all([
      fetch(`${RTDB_BASE}/tasks.json`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tasksPatch),
      }),
      fetch(`${RTDB_BASE}/ads.json`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(adsPatch),
      }),
    ]);

    return { success: true, tasksCount: DEFAULT_TASKS_40.length, adsCount: DEFAULT_ADS_30.length };
  } catch (e: any) {
    return { success: false, message: e.message };
  }
};
