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
export const firebaseSettings = {
  subscribe: (callback: (settings: any) => void) => {
    try {
      const settingsRef = ref(rtdb, 'settings');
      return onValue(
        settingsRef,
        (snapshot) => {
          if (snapshot.exists()) {
            callback(snapshot.val());
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
      const snap = await get(ref(rtdb, 'settings'));
      if (snap.exists()) return snap.val();
      const res = await fetch(`${RTDB_BASE}/settings.json`);
      const val = await res.json();
      if (val && !val.error) return val;
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

// ----------------- USERS SERVICE (Cloud Synced User Registry) -----------------
export const firebaseUsers = {
  save: async (user: any) => {
    try {
      const sanitizedPhone = (user.phone || '').replace(/[^0-9]/g, '');
      if (!sanitizedPhone) return { success: false };
      
      const payload = {
        ...user,
        adminKey: 'Earnova017@',
        updatedAt: new Date().toISOString(),
      };

      // 1. Save into settings/users (always permitted by current rules)
      await fetch(`${RTDB_BASE}/settings/users/${sanitizedPhone}.json`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }).catch(() => {});

      // 2. Also try root users node
      await fetch(`${RTDB_BASE}/users/${sanitizedPhone}.json`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }).catch(() => {});

      return { success: true };
    } catch (e: any) {
      return { success: false, message: e.message };
    }
  },

  get: async (phone: string): Promise<any | null> => {
    try {
      const sanitizedPhone = (phone || '').replace(/[^0-9]/g, '');
      if (!sanitizedPhone) return null;

      // Try settings/users first
      try {
        const res1 = await fetch(`${RTDB_BASE}/settings/users/${sanitizedPhone}.json`);
        const val1 = await res1.json();
        if (val1 && !val1.error && typeof val1 === 'object') {
          const { adminKey, ...user } = val1;
          return user;
        }
      } catch (e) {}

      // Try root users
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
    try {
      // 1. Fetch from settings/users
      const res = await fetch(`${RTDB_BASE}/settings/users.json`);
      const val = await res.json();
      if (val && typeof val === 'object' && !val.error) {
        const list: any[] = [];
        Object.keys(val).forEach((k) => {
          if (k !== 'adminKey' && val[k] && typeof val[k] === 'object') {
            const { adminKey, ...cleanUser } = val[k];
            list.push({ phoneKey: k, ...cleanUser });
          }
        });
        if (list.length > 0) return list;
      }
    } catch (e) {}

    // Fallback: try root users
    try {
      const res = await fetch(`${RTDB_BASE}/users.json`);
      const val = await res.json();
      if (val && typeof val === 'object' && !val.error) {
        return Object.keys(val).map((k) => {
          const { adminKey, ...cleanUser } = val[k];
          return { phoneKey: k, ...cleanUser };
        });
      }
    } catch (e) {}

    return [];
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
      await fetch(`${RTDB_BASE}/settings/users/${sanitizedPhone}.json`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patchPayload),
      }).catch(() => {});
      await fetch(`${RTDB_BASE}/users/${sanitizedPhone}.json`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patchPayload),
      }).catch(() => {});
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

      // Update in settings/users
      await fetch(`${RTDB_BASE}/settings/users/${sanitizedPhone}.json`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patchPayload),
      });

      // Update in root users
      await fetch(`${RTDB_BASE}/users/${sanitizedPhone}.json`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patchPayload),
      }).catch(() => {});

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

      await fetch(`${RTDB_BASE}/settings/users/${sanitizedPhone}.json`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patchPayload),
      });

      await fetch(`${RTDB_BASE}/users/${sanitizedPhone}.json`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patchPayload),
      }).catch(() => {});

      return { success: true };
    } catch (e: any) {
      return { success: false, message: e.message };
    }
  },

  subscribeUser: (phone: string, callback: (user: any) => void) => {
    const sanitizedPhone = (phone || '').replace(/[^0-9]/g, '');
    if (!sanitizedPhone) return () => {};

    // Initial check
    firebaseUsers.get(sanitizedPhone).then((u) => {
      if (u) callback(u);
    });

    // Realtime polling sync every 5 seconds so when Admin adds balance, user immediately receives it!
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
