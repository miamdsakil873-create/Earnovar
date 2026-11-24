export interface UserProfile {
  id: string;
  name: string;
  phone: string;
  email?: string;
  balance: number;
  totalEarned: number;
  totalWithdrawn: number;
  referralCode: string;
  status: 'ACTIVE' | 'SUSPENDED' | 'BANNED';
  role: 'USER' | 'ADMIN';
  createdAt: string;
  dailyWatchCount?: number;
  lastWatchDate?: string;
}

export interface DashboardStats {
  todayEarnings: number;
  todayWatchCount: number;
  dailyAdLimit: number;
  totalReferrals: number;
  referralEarnings: number;
  completedTasksCount: number;
  activeTasksCount: number;
  hasClaimedDailyToday: boolean;
}

export interface TransactionItem {
  id: string;
  userId: string;
  type: 'AD_REWARD' | 'TASK_REWARD' | 'REFERRAL_BONUS' | 'WITHDRAWAL' | 'DAILY_BONUS';
  amount: number;
  description: string;
  status: 'PENDING' | 'COMPLETED' | 'REJECTED';
  createdAt: string;
  metadata?: Record<string, any>;
}

export interface AdItem {
  id: string;
  title: string;
  description: string;
  rewardAmount: number;
  durationSeconds: number;
  category: string;
  thumbnail: string;
  sponsorName: string;
  active: boolean;
}

export interface TaskItem {
  id: string;
  title: string;
  description: string;
  category: 'SOCIAL' | 'APP' | 'SURVEY' | 'TELEGRAM' | 'WEBSITE' | 'OTHER' | string;
  rewardAmount: number;
  instructions: string[];
  proofPlaceholder: string;
  proofType: 'text' | 'link' | 'code';
  active: boolean;
  totalCompleted: number;
  estimatedMinutes: number;
  taskUrl?: string;
  submissionStatus?: 'PENDING' | 'APPROVED' | 'REJECTED' | null;
  submittedAt?: string | null;
}

export type PaymentMethod = 
  | 'bKash' 
  | 'Nagad' 
  | 'Rocket' 
  | 'USDT (TRC20/BEP20)' 
  | 'Binance Pay' 
  | 'Bitcoin (BTC)' 
  | 'PayPal' 
  | 'Payeer' 
  | 'UPI / Paytm';

export interface WithdrawalItem {
  id: string;
  userId: string;
  userName: string;
  method: PaymentMethod;
  accountType: 'Personal' | 'Agent' | 'Wallet' | 'Email' | 'UPI';
  accountNumber: string;
  amount: number;
  fee: number;
  finalAmount: number;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'REJECTED';
  requestedAt: string;
  processedAt?: string;
  adminNote?: string;
}

export interface SiteSettings {
  siteNotice: string;
  noticeActive: boolean;
  minWithdrawal: number;
  dailyAdLimit: number;
  dailyBonusAmount: number;
  referralDirectBonus: number;
  referralCommissionPercent: number;
  minReferralsToWithdraw?: number;
  isWithdrawalOpen: boolean;
  maintenanceMode: boolean;
  supportTelegram: string;
  supportNotice: string;
  paymentMethods: Record<string, boolean>;
}

export interface VoucherItem {
  id: string;
  code: string;
  amount: number;
  maxUses: number;
  usedCount: number;
  usedBy?: Record<string, number>;
  createdAt: string;
  active: boolean;
}

