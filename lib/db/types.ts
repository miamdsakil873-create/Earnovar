export type UserRole = 'USER' | 'ADMIN';
export type UserStatus = 'ACTIVE' | 'SUSPENDED' | 'BANNED';

export interface User {
  id: string;
  name: string;
  phone: string;
  email?: string;
  passwordHash: string;
  balance: number;
  totalEarned: number;
  totalWithdrawn: number;
  referralCode: string;
  referredBy?: string;
  status: UserStatus;
  role: UserRole;
  createdAt: string;
  dailyWatchCount: number;
  lastWatchDate: string; // YYYY-MM-DD
  dailyBonusClaimedDate?: string; // YYYY-MM-DD
}

export type TransactionType = 
  | 'AD_REWARD' 
  | 'TASK_REWARD' 
  | 'REFERRAL_BONUS' 
  | 'WITHDRAWAL' 
  | 'DAILY_BONUS'
  | 'REFUND';

export type TransactionStatus = 'PENDING' | 'COMPLETED' | 'REJECTED';

export interface Transaction {
  id: string;
  userId: string;
  type: TransactionType;
  amount: number;
  description: string;
  status: TransactionStatus;
  createdAt: string;
  metadata?: Record<string, any>;
}

export interface AdVideo {
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

export interface AdWatchSession {
  id: string;
  userId: string;
  adId: string;
  startedAt: number; // timestamp ms
  durationSeconds: number;
  claimed: boolean;
  claimedAt?: number;
}

export type TaskCategory = 'SOCIAL' | 'APP' | 'SURVEY' | 'TELEGRAM' | 'WEBSITE' | 'OTHER';
export type SubmissionStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface Task {
  id: string;
  title: string;
  description: string;
  category: TaskCategory;
  rewardAmount: number;
  instructions: string[];
  proofPlaceholder: string;
  proofType: 'text' | 'link' | 'code';
  active: boolean;
  totalCompleted: number;
  estimatedMinutes: number;
  taskUrl?: string;
}

export interface TaskSubmission {
  id: string;
  taskId: string;
  taskTitle: string;
  userId: string;
  userName: string;
  userPhone: string;
  proofData: string;
  rewardAmount: number;
  status: SubmissionStatus;
  submittedAt: string;
  reviewedAt?: string;
  rejectionReason?: string;
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
export type AccountType = 'Personal' | 'Agent' | 'Wallet' | 'Email' | 'UPI';
export type WithdrawalStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'REJECTED';

export interface WithdrawalRequest {
  id: string;
  userId: string;
  userName: string;
  method: PaymentMethod;
  accountType: AccountType;
  accountNumber: string;
  amount: number;
  fee: number;
  finalAmount: number;
  status: WithdrawalStatus;
  requestedAt: string;
  processedAt?: string;
  adminNote?: string;
}

export interface ReferralRecord {
  id: string;
  referrerId: string;
  referredUserId: string;
  referredUserName: string;
  referredUserPhone: string;
  bonusAwarded: boolean;
  bonusAmount: number;
  createdAt: string;
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
  paymentMethods: {
    bKash: boolean;
    Nagad: boolean;
    Rocket: boolean;
  };
  monetag: {
    enabled: boolean;
    zoneId: string;
    sdkTagUrl: string;
    rewardAmount: number;
    dailyLimit: number;
  };
}

export interface DatabaseSchema {
  users: User[];
  transactions: Transaction[];
  ads: AdVideo[];
  adSessions: AdWatchSession[];
  tasks: Task[];
  submissions: TaskSubmission[];
  withdrawals: WithdrawalRequest[];
  referrals: ReferralRecord[];
  settings: SiteSettings;
}
