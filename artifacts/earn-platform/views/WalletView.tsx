import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { useLanguage } from '../context/LanguageContext.tsx';
import { api } from '../services/api.ts';
import { firebaseWithdrawals, firebaseSettings } from '../services/firebaseService.ts';
import { WithdrawalItem, TransactionItem, PaymentMethod, SiteSettings } from '../types.ts';
import {
  Wallet,
  ArrowDownRight,
  ArrowUpRight,
  AlertCircle,
  CheckCircle2,
  Clock,
  RefreshCw,
  ShieldCheck,
  Globe,
  Coins,
  Users,
} from 'lucide-react';

interface WalletViewProps {
  onSuccessToast: (msg: string) => void;
}

interface PaymentOption {
  id: PaymentMethod;
  name: string;
  flag: string;
  category: 'Local (Bangladesh)' | 'Crypto & Global' | 'India (INR)';
  placeholder: string;
  accountLabel: string;
}

const PAYMENT_OPTIONS: PaymentOption[] = [
  {
    id: 'bKash',
    name: 'bKash (বিকাশ)',
    flag: '🇧🇩',
    category: 'Local (Bangladesh)',
    placeholder: '01XXXXXXXXX (11 digits)',
    accountLabel: 'bKash Mobile Number',
  },
  {
    id: 'Nagad',
    name: 'Nagad (নগদ)',
    flag: '🇧🇩',
    category: 'Local (Bangladesh)',
    placeholder: '01XXXXXXXXX (11 digits)',
    accountLabel: 'Nagad Mobile Number',
  },
  {
    id: 'Rocket',
    name: 'Rocket (রকেট)',
    flag: '🇧🇩',
    category: 'Local (Bangladesh)',
    placeholder: '01XXXXXXXXX (12 digits)',
    accountLabel: 'Rocket Mobile Number',
  },
  {
    id: 'USDT (TRC20/BEP20)',
    name: 'USDT (TRC20 / BEP20)',
    flag: '🌐',
    category: 'Crypto & Global',
    placeholder: 'T... or 0x... (TRC20 or BEP20 Address)',
    accountLabel: 'USDT Wallet Address',
  },
  {
    id: 'Binance Pay',
    name: 'Binance Pay',
    flag: '🟡',
    category: 'Crypto & Global',
    placeholder: 'Binance Pay ID or Registered Email',
    accountLabel: 'Binance Pay ID / Email',
  },
  {
    id: 'PayPal',
    name: 'PayPal Global',
    flag: '🇺🇸',
    category: 'Crypto & Global',
    placeholder: 'yourname@example.com',
    accountLabel: 'PayPal Email Address',
  },
  {
    id: 'Payeer',
    name: 'Payeer (USD/RUB)',
    flag: '🌐',
    category: 'Crypto & Global',
    placeholder: 'P100000000 (Payeer Account)',
    accountLabel: 'Payeer Account Number',
  },
  {
    id: 'Bitcoin (BTC)',
    name: 'Bitcoin (BTC)',
    flag: '₿',
    category: 'Crypto & Global',
    placeholder: 'bc1... or 1... (Bitcoin Wallet Address)',
    accountLabel: 'Bitcoin BTC Address',
  },
  {
    id: 'UPI / Paytm',
    name: 'UPI / Paytm (India)',
    flag: '🇮🇳',
    category: 'India (INR)',
    placeholder: 'username@upi or 10-digit Paytm number',
    accountLabel: 'UPI ID or Paytm Number',
  },
];

export const WalletView: React.FC<WalletViewProps> = ({ onSuccessToast }) => {
  const { user, updateUserLocally } = useAuth();
  const { t } = useLanguage();
  const [method, setMethod] = useState<PaymentMethod>('bKash');
  const [accountType, setAccountType] = useState<'Personal' | 'Agent' | 'Wallet' | 'Email' | 'UPI'>('Personal');
  const [accountNumber, setAccountNumber] = useState('');
  const [amount, setAmount] = useState<string>('50');

  const [activeTab, setActiveTab] = useState<'withdraw' | 'withdrawals' | 'transactions'>('withdraw');
  const [withdrawals, setWithdrawals] = useState<WithdrawalItem[]>([]);
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [referralCount, setReferralCount] = useState<number>(0);

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentOption = PAYMENT_OPTIONS.find((p) => p.id === method) || PAYMENT_OPTIONS[0];

  const minWithdrawal = settings?.minWithdrawal || 50;
  const minReferralsToWithdraw = settings?.minReferralsToWithdraw || 0;

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const [wRes, tRes, refRes] = await Promise.all([
        api.getWithdrawals(),
        api.getTransactions(),
        api.getReferralStats().catch(() => ({ success: false, totalReferrals: 0 })),
      ]);
      if (wRes.success) setWithdrawals(wRes.withdrawals);
      if (tRes.success) setTransactions(tRes.transactions);
      if (refRes.success && refRes.totalReferrals !== undefined) {
        setReferralCount(refRes.totalReferrals);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();

    const unsubSettings = firebaseSettings.subscribe((s) => {
      if (s) {
        setSettings(s);
        if (s.minWithdrawal && Number(amount) < s.minWithdrawal) {
          setAmount(String(s.minWithdrawal));
        }
      }
    });

    return () => {
      unsubSettings();
    };
  }, []);

  const quickAmounts = [minWithdrawal, minWithdrawal * 2, minWithdrawal * 4, 500, 1000];

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const withdrawAmount = Number(amount);
    if (!withdrawAmount || withdrawAmount <= 0) {
      setError('সঠিক উত্তোলনের পরিমাণ লিখুন।');
      return;
    }

    if (withdrawAmount < minWithdrawal) {
      setError(`সর্বনিম্ন উত্তোলনের পরিমাণ ৳${minWithdrawal}.০০ টাকা।`);
      return;
    }

    if (minReferralsToWithdraw > 0 && referralCount < minReferralsToWithdraw) {
      setError(`টাকা উত্তোলনের জন্য সর্বনিম্ন ${minReferralsToWithdraw} টি সফল রেফার প্রয়োজন (বর্তমানে আপনার রয়েছে ${referralCount} টি রেফার)।`);
      return;
    }

    if (!user || user.balance < withdrawAmount) {
      setError('আপনার অ্যাকাউন্টে পর্যাপ্ত ব্যালেন্স নেই।');
      return;
    }

    if (!accountNumber.trim()) {
      setError('অনুগ্রহ করে সঠিক অ্যাকাউন্ট নম্বর বা ওয়ালেট অ্যাড্রেস দিন।');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.requestWithdrawal({
        method,
        accountType,
        accountNumber: accountNumber.trim(),
        amount: withdrawAmount,
      });

      // Also record into Firebase
      await firebaseWithdrawals.create({
        userName: user?.name || 'User',
        phone: user?.phone || '01700000000',
        method,
        accountType,
        accountNumber: accountNumber.trim(),
        amount: withdrawAmount,
      }).catch(() => {});

      if (res.success) {
        if (res.newBalance !== undefined) {
          updateUserLocally((prev) => ({
            ...prev,
            balance: res.newBalance!,
            totalWithdrawn: prev.totalWithdrawn + withdrawAmount,
          }));
        } else {
          updateUserLocally((prev) => ({
            ...prev,
            balance: prev.balance - withdrawAmount,
            totalWithdrawn: prev.totalWithdrawn + withdrawAmount,
          }));
        }

        onSuccessToast(res.message);
        setAccountNumber('');
        fetchHistory();
        setActiveTab('withdrawals');
      } else {
        setError(res.message || 'উত্তোলন রিকোয়েস্ট ব্যর্থ হয়েছে।');
      }
    } catch (err: any) {
      setError(err.message || 'উত্তোলন আবেদন প্রেরণে ত্রুটি হয়েছে।');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 pb-20">
      {/* Wallet Balance Card */}
      <div className="p-5 rounded-3xl bg-gradient-to-tr from-slate-900 via-slate-850 to-slate-900 border border-slate-800 text-white relative overflow-hidden shadow-xl">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Wallet className="w-4 h-4 text-emerald-400" />
            <span>{t('mainBalance')}</span>
          </div>
          <button
            onClick={fetchHistory}
            className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400"
            title="Refresh balance"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="mb-4">
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl font-black text-white font-mono tracking-tight">
              ৳{user?.balance.toFixed(2)}
            </span>
            <span className="text-xs text-emerald-400 font-bold uppercase">BDT</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">
            ≈ ${(user?.balance ? (user.balance / 120).toFixed(2) : '0.00')} USD Equivalent
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-800/80 text-xs">
          <div>
            <p className="text-[10px] text-slate-400">{t('totalEarned')}</p>
            <p className="font-bold text-white font-mono">৳{user?.totalEarned.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-[10px] text-slate-400">{t('totalWithdrawn')}</p>
            <p className="font-bold text-slate-300 font-mono">৳{user?.totalWithdrawn.toFixed(2)}</p>
          </div>
        </div>
      </div>

      {/* Tabs Switcher */}
      <div className="flex rounded-2xl bg-slate-900 p-1 border border-slate-800 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('withdraw')}
          className={`flex-1 py-2 rounded-xl transition ${
            activeTab === 'withdraw'
              ? 'bg-emerald-500 text-slate-950 font-bold shadow-md shadow-emerald-500/20'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          {t('withdrawCash')}
        </button>
        <button
          onClick={() => setActiveTab('withdrawals')}
          className={`flex-1 py-2 rounded-xl transition ${
            activeTab === 'withdrawals'
              ? 'bg-emerald-500 text-slate-950 font-bold shadow-md shadow-emerald-500/20'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          {t('withdrawHistory')}
        </button>
        <button
          onClick={() => setActiveTab('transactions')}
          className={`flex-1 py-2 rounded-xl transition ${
            activeTab === 'transactions'
              ? 'bg-emerald-500 text-slate-950 font-bold shadow-md shadow-emerald-500/20'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          {t('recentTransactions')}
        </button>
      </div>

      {/* Tab 1: Withdrawal Form */}
      {activeTab === 'withdraw' && (
        <form onSubmit={handleWithdraw} className="space-y-4">
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3.5">
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
              <Globe className="w-4 h-4 text-emerald-400" />
              <span>{t('selectMethod')}</span>
            </h3>

            {/* Payment Method Grid (Global & Local) */}
            <div className="grid grid-cols-3 gap-2">
              {PAYMENT_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    setMethod(opt.id);
                    if (opt.id === 'USDT (TRC20/BEP20)' || opt.id === 'Bitcoin (BTC)') {
                      setAccountType('Wallet');
                    } else if (opt.id === 'PayPal' || opt.id === 'Binance Pay') {
                      setAccountType('Email');
                    } else if (opt.id === 'UPI / Paytm') {
                      setAccountType('UPI');
                    } else {
                      setAccountType('Personal');
                    }
                  }}
                  className={`p-2 rounded-xl border text-center transition flex flex-col items-center justify-center gap-1 ${
                    method === opt.id
                      ? 'bg-emerald-500/15 border-emerald-500 text-white font-bold shadow-sm'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <span className="text-base">{opt.flag}</span>
                  <span className="text-[10px] leading-tight font-semibold line-clamp-1">{opt.name}</span>
                </button>
              ))}
            </div>

            {/* Account Type Option for Mobile Methods */}
            {(method === 'bKash' || method === 'Nagad' || method === 'Rocket') && (
              <div className="flex items-center gap-2 pt-1">
                {(['Personal', 'Agent'] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setAccountType(type)}
                    className={`flex-1 py-1.5 rounded-xl text-xs font-medium border transition ${
                      accountType === type
                        ? 'bg-slate-800 border-emerald-500 text-emerald-400 font-bold'
                        : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    {type} Account
                  </button>
                ))}
              </div>
            )}

            {/* Account / Wallet Address Input */}
            <div className="space-y-1 pt-1">
              <label className="text-[11px] font-medium text-slate-300">
                {currentOption.accountLabel}
              </label>
              <input
                type="text"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                placeholder={currentOption.placeholder}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 font-mono focus:outline-none focus:border-emerald-500"
                required
              />
            </div>

            {/* Amount Input & Quick Chips */}
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between text-[11px]">
                <label className="font-medium text-slate-300">{t('withdrawAmount')}</label>
                <span className="text-emerald-400 font-bold font-mono">
                  সর্বনিম্ন: ৳{minWithdrawal}.০০ টাকা
                </span>
              </div>

              {minReferralsToWithdraw > 0 && (
                <div className="p-2.5 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-300 text-xs flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-purple-400" />
                    <span>উত্তোলনের জন্য আবশ্যক রেফার:</span>
                  </span>
                  <span
                    className={`font-mono font-bold ${
                      referralCount >= minReferralsToWithdraw ? 'text-emerald-400' : 'text-amber-300'
                    }`}
                  >
                    {referralCount} / {minReferralsToWithdraw} টি{' '}
                    {referralCount >= minReferralsToWithdraw ? '✅' : '❌ বাকি'}
                  </span>
                </div>
              )}

              <div className="relative">
                <input
                  type="number"
                  min={minWithdrawal}
                  step="1"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono font-bold focus:outline-none focus:border-emerald-500 pr-12"
                  required
                />
                <span className="absolute right-3 top-2 text-xs text-slate-400 font-bold">
                  BDT
                </span>
              </div>

              {/* Quick Amount Chips */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                {quickAmounts.map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => setAmount(q.toString())}
                    className={`px-3 py-1 rounded-lg text-[11px] font-mono font-bold border transition shrink-0 ${
                      amount === q.toString()
                        ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                    }`}
                  >
                    ৳{q}
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <div className="p-2.5 rounded-xl bg-red-500/15 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:brightness-110 active:scale-95 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition disabled:opacity-50"
            >
              <Coins className="w-4 h-4" />
              <span>{submitting ? 'Processing Request...' : t('requestWithdrawal')}</span>
            </button>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 text-[11px] text-slate-400 space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold text-slate-300">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Payment Terms & Guarantee:</span>
            </div>
            <p>
              • Withdrawals to bKash and Nagad are processed within 1-2 hours.
            </p>
            <p>
              • Crypto (USDT / Binance Pay) transfers are sent directly via blockchain network.
            </p>
          </div>
        </form>
      )}

      {/* Tab 2: Withdrawal Requests History */}
      {activeTab === 'withdrawals' && (
        <div className="space-y-2.5">
          {loading ? (
            <div className="p-8 text-center text-xs text-slate-400">Loading history...</div>
          ) : withdrawals.length === 0 ? (
            <div className="p-8 rounded-2xl bg-slate-900 border border-slate-800 text-center text-slate-400 text-xs space-y-2">
              <Wallet className="w-8 h-8 text-slate-600 mx-auto" />
              <p>No withdrawal requests found yet.</p>
            </div>
          ) : (
            withdrawals.map((item) => (
              <div
                key={item.id}
                className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between text-xs"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-white">{item.method}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                      {item.accountType}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 font-mono">{item.accountNumber}</p>
                  <p className="text-[10px] text-slate-500">
                    {new Date(item.requestedAt).toLocaleString()}
                  </p>
                </div>

                <div className="text-right space-y-1">
                  <p className="font-bold font-mono text-emerald-400 text-sm">
                    ৳{item.amount.toFixed(2)}
                  </p>
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      item.status === 'COMPLETED'
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : item.status === 'REJECTED'
                        ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                        : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    }`}
                  >
                    {item.status === 'COMPLETED' ? (
                      <CheckCircle2 className="w-3 h-3" />
                    ) : (
                      <Clock className="w-3 h-3" />
                    )}
                    <span>{item.status}</span>
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Tab 3: Detailed Ledger Transactions */}
      {activeTab === 'transactions' && (
        <div className="space-y-2.5">
          {transactions.length === 0 ? (
            <div className="p-8 rounded-2xl bg-slate-900 border border-slate-800 text-center text-slate-400 text-xs">
              <p>{t('noTransactions')}</p>
            </div>
          ) : (
            transactions.map((tx) => (
              <div
                key={tx.id}
                className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                      tx.type === 'WITHDRAWAL'
                        ? 'bg-amber-500/20 text-amber-400'
                        : 'bg-emerald-500/20 text-emerald-400'
                    }`}
                  >
                    {tx.type === 'WITHDRAWAL' ? (
                      <ArrowUpRight className="w-4 h-4" />
                    ) : (
                      <ArrowDownRight className="w-4 h-4" />
                    )}
                  </div>
                  <div>
                    <p className="font-semibold text-white">{tx.description}</p>
                    <p className="text-[10px] text-slate-400">
                      {new Date(tx.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <p
                    className={`font-mono font-bold ${
                      tx.type === 'WITHDRAWAL' ? 'text-amber-400' : 'text-emerald-400'
                    }`}
                  >
                    {tx.type === 'WITHDRAWAL' ? '-' : '+'}৳{tx.amount.toFixed(2)}
                  </p>
                  <span className="text-[10px] text-slate-500 font-medium">{tx.status}</span>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
