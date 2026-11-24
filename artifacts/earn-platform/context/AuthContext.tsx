import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile } from '../types.ts';
import { api, getAuthToken, setAuthToken, removeAuthToken, setActiveUser } from '../services/api.ts';
import { firebaseUsers } from '../services/firebaseService.ts';

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  login: (identifier: string, pass: string) => Promise<{ success: boolean; message: string }>;
  register: (payload: { name: string; phone: string; email?: string; password: string; referralCode?: string }) => Promise<{ success: boolean; message: string }>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  updateUserLocally: (updater: (prev: UserProfile) => UserProfile) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const refreshUser = async () => {
    try {
      const res = await api.getMe();
      if (res.success && res.user) {
        setUser(res.user);
      }
    } catch (err) {
      removeAuthToken();
      setUser(null);
    }
  };

  useEffect(() => {
    // Capture ?ref= referral link param on initial load so it persists across refreshes
    try {
      const searchParams = new URLSearchParams(window.location.search);
      const refParam = searchParams.get('ref') || searchParams.get('r');
      if (refParam && refParam.trim()) {
        localStorage.setItem('earnova_pending_ref', refParam.trim().toUpperCase());
      }
    } catch (e) {}

    const token = getAuthToken();
    if (token) {
      refreshUser().finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  // Real-time synchronization with Firebase cloud
  // When Admin adds balance OR a referred friend earns/signs up, user's screen immediately updates!
  useEffect(() => {
    if (!user?.phone) return;
    const unsub = firebaseUsers.subscribeUser(user.phone, (cloudUser) => {
      if (cloudUser && cloudUser.balance !== undefined) {
        setUser((prev) => {
          if (!prev) return null;
          const nextBalance = Number(cloudUser.balance);
          const nextTotalEarned = cloudUser.totalEarned !== undefined ? Number(cloudUser.totalEarned) : prev.totalEarned;
          const nextTotalWithdrawn = cloudUser.totalWithdrawn !== undefined ? Number(cloudUser.totalWithdrawn) : prev.totalWithdrawn;
          const nextStatus = cloudUser.status || prev.status;

          if (
            prev.balance !== nextBalance ||
            prev.totalEarned !== nextTotalEarned ||
            prev.totalWithdrawn !== nextTotalWithdrawn ||
            prev.status !== nextStatus
          ) {
            const updated = {
              ...prev,
              ...cloudUser,
              balance: nextBalance,
              totalEarned: nextTotalEarned,
              totalWithdrawn: nextTotalWithdrawn,
              status: nextStatus,
            };
            setActiveUser(updated);
            return updated;
          }
          return prev;
        });
      }
    });
    return () => unsub();
  }, [user?.phone]);

  const login = async (identifier: string, pass: string) => {
    try {
      const res = await api.login({ identifier, password: pass });
      if (res.success && res.token) {
        setAuthToken(res.token);
        setUser(res.user);
        return { success: true, message: res.message };
      }
      return { success: false, message: res.message || 'লগইন ব্যর্থ হয়েছে।' };
    } catch (err: any) {
      return { success: false, message: err.message || 'লগইন ব্যর্থ হয়েছে।' };
    }
  };

  const register = async (payload: {
    name: string;
    phone: string;
    email?: string;
    password: string;
    referralCode?: string;
  }) => {
    try {
      const res = await api.register(payload);
      if (res.success && res.token) {
        setAuthToken(res.token);
        setUser(res.user);
        return { success: true, message: res.message };
      }
      return { success: false, message: res.message || 'রেজিস্ট্রেশন ব্যর্থ হয়েছে।' };
    } catch (err: any) {
      return { success: false, message: err.message || 'রেজিস্ট্রেশন ব্যর্থ হয়েছে।' };
    }
  };

  const logout = () => {
    removeAuthToken();
    setUser(null);
  };

  const updateUserLocally = (updater: (prev: UserProfile) => UserProfile) => {
    setUser((prev) => (prev ? updater(prev) : null));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        logout,
        refreshUser,
        updateUserLocally,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
