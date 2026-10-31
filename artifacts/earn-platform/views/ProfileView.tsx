import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { api } from '../services/api.ts';
import {
  User,
  ShieldCheck,
  Lock,
  LogOut,
  Send,
  Edit2,
  Check,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';


interface ProfileViewProps {
  onSuccessToast: (msg: string) => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({ onSuccessToast }) => {
  const { user, logout, updateUserLocally } = useAuth();

  // Edit profile states
  const [editingProfile, setEditingProfile] = useState(false);
  const [editName, setEditName] = useState(user?.name || '');
  const [editEmail, setEditEmail] = useState(user?.email || '');
  const [savingProfile, setSavingProfile] = useState(false);

  // Change password states
  const [changingPassword, setChangingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim()) return;

    setSavingProfile(true);
    try {
      const res = await api.updateProfile({ name: editName, email: editEmail });
      if (res.success) {
        updateUserLocally((prev) => ({
          ...prev,
          name: editName.trim(),
          email: editEmail.trim(),
        }));
        onSuccessToast(res.message);
        setEditingProfile(false);
      }
    } catch (err: any) {
      alert(err.message || 'প্রোফাইল আপডেট করতে সমস্যা হয়েছে।');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword) return;

    if (newPassword.length < 6) {
      setPasswordError('নতুন পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।');
      return;
    }

    setSavingPassword(true);
    setPasswordError(null);

    try {
      const res = await api.changePassword({ currentPassword, newPassword });
      if (res.success) {
        onSuccessToast(res.message);
        setChangingPassword(false);
        setCurrentPassword('');
        setNewPassword('');
      } else {
        setPasswordError(res.message);
      }
    } catch (err: any) {
      setPasswordError(err.message || 'পাসওয়ার্ড পরিবর্তন ব্যর্থ হয়েছে।');
    } finally {
      setSavingPassword(false);
    }
  };


  return (
    <div className="space-y-4 pb-20">
      {/* Profile Card Header */}
      <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 text-center space-y-3 relative overflow-hidden">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-slate-950 font-black text-2xl flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
          {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
        </div>

        <div>
          <h2 className="text-base font-bold text-white">{user?.name}</h2>
          <p className="text-xs text-slate-400 font-mono mt-0.5">{user?.phone}</p>
          <div className="flex items-center justify-center gap-1.5 mt-2">
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold border border-emerald-500/30 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" />
              অ্যাকাউন্ট ভেরিফাইড (Active)
            </span>
          </div>
        </div>

        <div className="pt-2 border-t border-slate-800/80 flex items-center justify-around text-xs">
          <div>
            <p className="text-[10px] text-slate-500">রেফার কোড</p>
            <p className="font-mono font-bold text-emerald-400">{user?.referralCode}</p>
          </div>
          <div className="w-px h-6 bg-slate-800" />
          <div>
            <p className="text-[10px] text-slate-500">যোগদানের তারিখ</p>
            <p className="font-mono text-slate-300">
              {user?.createdAt ? new Date(user.createdAt).toLocaleDateString('bn-BD') : '-'}
            </p>
          </div>
        </div>
      </div>

      {/* Account Settings List */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
        <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
          অ্যাকাউন্ট সেটিংস
        </h3>

        {/* Edit Profile Action */}
        {!editingProfile ? (
          <button
            onClick={() => {
              setEditName(user?.name || '');
              setEditEmail(user?.email || '');
              setEditingProfile(true);
            }}
            className="w-full p-3 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-left flex items-center justify-between text-xs transition"
          >
            <div className="flex items-center gap-2.5">
              <User className="w-4 h-4 text-emerald-400" />
              <div>
                <p className="font-semibold text-white">নাম ও প্রোফাইল পরিবর্তন</p>
                <p className="text-[10px] text-slate-400">{user?.email || 'ইমেইল যুক্ত করুন'}</p>
              </div>
            </div>
            <Edit2 className="w-3.5 h-3.5 text-slate-400" />
          </button>
        ) : (
          <form onSubmit={handleUpdateProfile} className="p-3 rounded-xl bg-slate-950 border border-slate-700 space-y-2.5 text-xs">
            <h4 className="font-bold text-white text-xs">প্রোফাইল তথ্য আপডেট</h4>
            <div className="space-y-1">
              <label className="text-[11px] text-slate-400">নাম:</label>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] text-slate-400">ইমেইল:</label>
              <input
                type="email"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div className="flex items-center gap-2 pt-1">
              <button
                type="submit"
                disabled={savingProfile}
                className="px-3 py-1.5 rounded-lg bg-emerald-500 text-slate-950 font-bold text-xs flex items-center gap-1 active:scale-95"
              >
                <Check className="w-3 h-3" />
                <span>সংরক্ষণ করুন</span>
              </button>
              <button
                type="button"
                onClick={() => setEditingProfile(false)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-400 text-xs"
              >
                বাতিল
              </button>
            </div>
          </form>
        )}

        {/* Change Password Action */}
        {!changingPassword ? (
          <button
            onClick={() => setChangingPassword(true)}
            className="w-full p-3 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-left flex items-center justify-between text-xs transition"
          >
            <div className="flex items-center gap-2.5">
              <Lock className="w-4 h-4 text-emerald-400" />
              <div>
                <p className="font-semibold text-white">পাসওয়ার্ড পরিবর্তন</p>
                <p className="text-[10px] text-slate-400">নিয়মিত পাসওয়ার্ড পরিবর্তন করে অ্যাকাউন্ট সুরক্ষিত রাখুন</p>
              </div>
            </div>
            <Edit2 className="w-3.5 h-3.5 text-slate-400" />
          </button>
        ) : (
          <form onSubmit={handleChangePassword} className="p-3 rounded-xl bg-slate-950 border border-slate-700 space-y-2.5 text-xs">
            <h4 className="font-bold text-white text-xs">পাসওয়ার্ড পরিবর্তন করুন</h4>
            {passwordError && (
              <div className="p-2 rounded bg-red-500/20 text-red-300 text-[11px] flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{passwordError}</span>
              </div>
            )}
            <div className="space-y-1">
              <label className="text-[11px] text-slate-400">বর্তমান পাসওয়ার্ড:</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] text-slate-400">নতুন পাসওয়ার্ড (কমপক্ষে ৬ অক্ষর):</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                required
              />
            </div>
            <div className="flex items-center gap-2 pt-1">
              <button
                type="submit"
                disabled={savingPassword}
                className="px-3 py-1.5 rounded-lg bg-emerald-500 text-slate-950 font-bold text-xs flex items-center gap-1 active:scale-95"
              >
                <Check className="w-3 h-3" />
                <span>আপডেট করুন</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setChangingPassword(false);
                  setPasswordError(null);
                }}
                className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-400 text-xs"
              >
                বাতিল
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Support & Community */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2.5 text-xs">
        <h3 className="font-bold text-slate-300 uppercase tracking-wider text-[11px]">
          সহায়তা ও সাহায্য
        </h3>

        <a
          href="https://t.me/EarnWatchBotSupport"
          target="_blank"
          rel="noopener noreferrer"
          className="p-3 rounded-xl bg-slate-950 hover:bg-slate-850 border border-slate-800 flex items-center justify-between text-slate-200 transition"
        >
          <div className="flex items-center gap-2.5">
            <Send className="w-4 h-4 text-sky-400" />
            <div>
              <p className="font-semibold text-white">অফিশিয়াল টেলিগ্রাম সাপোর্ট</p>
              <p className="text-[10px] text-slate-400">পেমেন্ট বা কাজের যেকোনো জিজ্ঞাসায়</p>
            </div>
          </div>
          <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
        </a>
      </div>

      {/* Logout Button */}
      <button
        onClick={logout}
        className="w-full py-3 px-4 rounded-2xl bg-red-500/15 hover:bg-red-500/20 border border-red-500/30 text-red-400 font-bold text-xs flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer mt-4"
      >
        <LogOut className="w-4 h-4" />
        <span>অ্যাকাউন্ট থেকে লগআউট</span>
      </button>

      {/* Secret Admin Portal Direct Access */}
      <div className="pt-2 text-center">
        <a
          href="#admin"
          onClick={(e) => {
            e.preventDefault();
            window.location.hash = '#admin';
          }}
          className="text-[11px] text-slate-500 hover:text-emerald-400 transition inline-flex items-center gap-1.5 py-1 px-3 rounded-full hover:bg-slate-900 cursor-pointer"
        >
          <span>👑 অ্যাডমিন প্যানেল প্রবেশ (পাসওয়ার্ড সুরক্ষিত)</span>
        </a>
      </div>
    </div>
  );
};
