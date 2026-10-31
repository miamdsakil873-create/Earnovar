import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import {
  DatabaseSchema,
  User,
  Transaction,
  AdVideo,
  AdWatchSession,
  Task,
  TaskSubmission,
  WithdrawalRequest,
  ReferralRecord,
  SiteSettings,
} from './types.ts';

const DB_FILE = path.resolve(process.cwd(), 'data', 'earn_bot_db.json');

const DEFAULT_SETTINGS: SiteSettings = {
  siteNotice: '🎉 Earn-Watch-Bot এ স্বাগতম! ভিডিও দেখে, টাস্ক সম্পন্ন করে এবং বন্ধুদের রেফার করে বিকাশ, নগদ বা রকেটে টাকা উত্তোলন করুন।',
  noticeActive: true,
  minWithdrawal: 50,
  dailyAdLimit: 12,
  dailyBonusAmount: 5.0,
  referralDirectBonus: 10.0,
  referralCommissionPercent: 10,
  isWithdrawalOpen: true,
  maintenanceMode: false,
  supportTelegram: 'https://t.me/EarnWatchBotSupport',
  supportNotice: 'যেকোনো সমস্যার জন্য আমাদের টেলিগ্রাম সাপোর্ট চ্যানেলে যোগাযোগ করুন।',
  paymentMethods: {
    bKash: true,
    Nagad: true,
    Rocket: true,
  },
  monetag: {
    enabled: true,
    zoneId: '9537184',
    sdkTagUrl: '//libtl.com/sdk.js',
    rewardAmount: 3.5,
    dailyLimit: 20,
  },
};

const DEFAULT_ADS: AdVideo[] = [
  {
    id: 'ad_1',
    title: 'প্রিমিয়াম গ্যাজেট রিভিউ & অফার',
    description: 'দারুণ স্মার্টওয়াচ ও গ্যাজেটের আনবক্সিং ভিডিও দেখুন ও ইন্সট্যান্ট রিওয়ার্ড পান।',
    rewardAmount: 3.5,
    durationSeconds: 15,
    category: 'টেক রিভিউ',
    thumbnail: 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?auto=format&fit=crop&w=600&q=80',
    sponsorName: 'TechGadget BD',
    active: true,
  },
  {
    id: 'ad_2',
    title: 'অনলাইন শপিং স্পেশাল মেগা ডিসকাউন্ট',
    description: 'সেরা লাইফস্টাইল ও অনলাইন গ্রোসারি ডেলিভারি প্ল্যাটফর্মের ট্রেইলার বিজ্ঞাপন।',
    rewardAmount: 4.0,
    durationSeconds: 20,
    category: 'ই-কমার্স',
    thumbnail: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?auto=format&fit=crop&w=600&q=80',
    sponsorName: 'ShopNow Express',
    active: true,
  },
  {
    id: 'ad_3',
    title: 'মোবাইল রিচার্জ ও ক্যাশব্যাক ক্যাম্পেইন',
    description: 'রিচার্জে ২০% পর্যন্ত ক্যাশব্যাকের চমৎকার প্রোমোশনাল ক্লিপ।',
    rewardAmount: 2.5,
    durationSeconds: 15,
    category: 'পেমেন্ট ও অফার',
    thumbnail: 'https://images.unsplash.com/photo-1556742049-0a67c5574f73?auto=format&fit=crop&w=600&q=80',
    sponsorName: 'PaySmart BD',
    active: true,
  },
  {
    id: 'ad_4',
    title: 'অনলাইন স্কিল ডেভেলপমেন্ট ও ফ্রিল্যান্সিং',
    description: 'ঘরে বসে প্রফেশনাল ফ্রিল্যান্সিং স্কিল শেখার ফ্রি ওরিয়েন্টেশন টিজার।',
    rewardAmount: 5.0,
    durationSeconds: 25,
    category: 'এডুকেশন',
    thumbnail: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=600&q=80',
    sponsorName: 'SkillUp Academy',
    active: true,
  },
  {
    id: 'ad_5',
    title: 'নতুন মোবাইল গেম ট্রেইলার ও টিপস',
    description: 'রোমাঞ্চকর অ্যাকশন গেমপ্লে ভিডিও দেখুন এবং সম্পূর্ণ কয়েন ব্যালেন্সে যোগ করুন।',
    rewardAmount: 3.0,
    durationSeconds: 15,
    category: 'গেমিং',
    thumbnail: 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?auto=format&fit=crop&w=600&q=80',
    sponsorName: 'GameZone Pro',
    active: true,
  },
];

const DEFAULT_TASKS: Task[] = [
  {
    id: 'task_1',
    title: 'অফিসিয়াল টেলিগ্রাম চ্যানেলে জয়েন করুন',
    description: 'আমাদের অফিশিয়াল নোটিশ ও পেমেন্ট প্রুফ চ্যানেলে যুক্ত হয়ে সবসময় আপডেট থাকুন।',
    category: 'TELEGRAM',
    rewardAmount: 15.0,
    instructions: [
      'নিচের লিঙ্কে ক্লিক করে টেলিগ্রাম চ্যানেলে প্রবেশ করুন।',
      'চ্যানেলে "Join" বাটনে ক্লিক করুন।',
      'আপনার টেলিগ্রাম ইউজারনেম (@username) প্রুফ বক্সে লিখে সাবমিট করুন।',
    ],
    proofPlaceholder: 'আপনার টেলিগ্রাম ইউজারনেম লিখুন (যেমন: @sakil123)',
    proofType: 'text',
    active: true,
    totalCompleted: 1420,
    estimatedMinutes: 1,
    taskUrl: 'https://t.me/EarnWatchBotSupport',
  },
  {
    id: 'task_2',
    title: 'ইউটিউব চ্যানেল সাবস্ক্রাইব করুন',
    description: 'আমাদের স্পনসর ক্রিয়েটরের ইউটিউব চ্যানেল সাবস্ক্রাইব করুন এবং বেল আইকন চালু করুন।',
    category: 'SOCIAL',
    rewardAmount: 20.0,
    instructions: [
      'স্পনসর ইউটিউব লিঙ্কে ক্লিক করে চ্যানেলে যান।',
      'Subscribe বাটনে ক্লিক করুন এবং বেল আইকন চাপুন।',
      'আপনার ইউটিউব চ্যানেলের নাম বা জিমেইল এর নাম সাবমিট করুন।',
    ],
    proofPlaceholder: 'আপনার ইউটিউব চ্যানেল বা জিমেইল ইউজারনেম দিন',
    proofType: 'text',
    active: true,
    totalCompleted: 980,
    estimatedMinutes: 2,
    taskUrl: 'https://youtube.com/@EarnWatchBotOfficial',
  },
  {
    id: 'task_3',
    title: 'প্লে স্টোর অ্যাপ ইন্সটল ও ৫ স্টার রিভিউ',
    description: 'স্পনসর করা ক্যালকুলেটর অ্যান্ড টুলস অ্যাপ ইন্সটল করে পজিটিভ ৫ স্টার রিভিউ দিন।',
    category: 'APP',
    rewardAmount: 35.0,
    instructions: [
      'Google Play Store থেকে অ্যাপটি ইন্সটল করুন।',
      'অ্যাপটি ২ মিনিট ওপেন রাখুন।',
      'একটি সুন্দর ৫ স্টার রিভিউ দিন এবং রিভিউ নাম বা লিঙ্ক সাবমিট করুন।',
    ],
    proofPlaceholder: 'যে নামে প্লে স্টোরে রিভিউ দিয়েছেন সেই নাম লিখুন',
    proofType: 'text',
    active: true,
    totalCompleted: 615,
    estimatedMinutes: 4,
    taskUrl: 'https://play.google.com/store/apps/details?id=com.earnwatchbot.tools',
  },
  {
    id: 'task_4',
    title: 'সহজ সার্ভে কুইজ সম্পূর্ণ করুন',
    description: 'বাংলাদেশি অনলাইন শপিং অভিজ্ঞতা নিয়ে মাত্র ৩টি সহজ প্রশ্নের উত্তর দিন।',
    category: 'SURVEY',
    rewardAmount: 25.0,
    instructions: [
      'সার্ভে প্রশ্নমালা পড়ুন।',
      'সঠিক উত্তর ও মতামত প্রদান করুন।',
      'সার্ভে সমাপ্তির পর পাওয়া ভেরিফিকেশন কোডটি এখানে সাবমিট করুন।',
    ],
    proofPlaceholder: 'সার্ভে সমাপ্তি কোড দিন (যেমন: SURVEY-9981)',
    proofType: 'code',
    active: true,
    totalCompleted: 430,
    estimatedMinutes: 3,
    taskUrl: 'https://forms.google.com/earn-watch-survey',
  },
];

class DatabaseService {
  private data: DatabaseSchema;
  private isSaving: boolean = false;
  private saveQueued: boolean = false;

  constructor() {
    this.data = this.loadDatabase();
  }

  private loadDatabase(): DatabaseSchema {
    try {
      const dataDir = path.dirname(DB_FILE);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }

      if (fs.existsSync(DB_FILE)) {
        const fileContent = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(fileContent);
        return {
          users: parsed.users || [],
          transactions: parsed.transactions || [],
          ads: parsed.ads || DEFAULT_ADS,
          adSessions: parsed.adSessions || [],
          tasks: parsed.tasks || DEFAULT_TASKS,
          submissions: parsed.submissions || [],
          withdrawals: parsed.withdrawals || [],
          referrals: parsed.referrals || [],
          settings: { ...DEFAULT_SETTINGS, ...(parsed.settings || {}) },
        };
      }
    } catch (err) {
      console.error('Error loading database file, initializing defaults:', err);
    }

    const initialSchema: DatabaseSchema = {
      users: [],
      transactions: [],
      ads: DEFAULT_ADS,
      adSessions: [],
      tasks: DEFAULT_TASKS,
      submissions: [],
      withdrawals: [],
      referrals: [],
      settings: DEFAULT_SETTINGS,
    };

    this.saveDirect(initialSchema);
    return initialSchema;
  }

  private saveDirect(data: DatabaseSchema) {
    try {
      const dataDir = path.dirname(DB_FILE);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
    } catch (err) {
      console.error('Failed to sync write to DB:', err);
    }
  }

  public async save(): Promise<void> {
    if (this.isSaving) {
      this.saveQueued = true;
      return;
    }
    this.isSaving = true;
    try {
      const json = JSON.stringify(this.data, null, 2);
      await fs.promises.writeFile(DB_FILE, json, 'utf-8');
    } catch (err) {
      console.error('Async DB save failed:', err);
    } finally {
      this.isSaving = false;
      if (this.saveQueued) {
        this.saveQueued = false;
        this.save();
      }
    }
  }

  // --- User Queries ---
  public getUserById(id: string): User | undefined {
    return this.data.users.find((u) => u.id === id);
  }

  public getUserByPhone(phone: string): User | undefined {
    const cleanPhone = phone.trim().replace(/\s+/g, '');
    return this.data.users.find((u) => u.phone === cleanPhone);
  }

  public getUserByReferralCode(code: string): User | undefined {
    return this.data.users.find((u) => u.referralCode.toLowerCase() === code.trim().toLowerCase());
  }

  public async createUser(userData: {
    name: string;
    phone: string;
    email?: string;
    password: string;
    referralCodeInput?: string;
  }): Promise<{ user: User; error?: string }> {
    const cleanPhone = userData.phone.trim().replace(/\s+/g, '');
    if (this.getUserByPhone(cleanPhone)) {
      return { user: null as any, error: 'এই মোবাইল নম্বরটি দিয়ে ইতোমধ্যে অ্যাকাউন্ট তৈরি করা হয়েছে।' };
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(userData.password, salt);

    // Generate unique referral code
    const generatedRefCode = (
      userData.name.slice(0, 3).toUpperCase().replace(/[^A-Z]/g, 'BOT') +
      Math.floor(1000 + Math.random() * 9000).toString()
    );

    let referrer: User | undefined;
    if (userData.referralCodeInput) {
      referrer = this.getUserByReferralCode(userData.referralCodeInput);
    }

    const newUser: User = {
      id: 'usr_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      name: userData.name.trim(),
      phone: cleanPhone,
      email: userData.email?.trim() || '',
      passwordHash,
      balance: 10.0, // Registration Welcome Bonus
      totalEarned: 10.0,
      totalWithdrawn: 0.0,
      referralCode: generatedRefCode,
      referredBy: referrer ? referrer.id : undefined,
      status: 'ACTIVE',
      role: 'USER',
      createdAt: new Date().toISOString(),
      dailyWatchCount: 0,
      lastWatchDate: new Date().toISOString().slice(0, 10),
    };

    this.data.users.push(newUser);

    // Record welcome bonus transaction
    this.data.transactions.unshift({
      id: 'tx_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
      userId: newUser.id,
      type: 'DAILY_BONUS',
      amount: 10.0,
      description: 'স্বাগতম বোনাস (Registration Welcome Bonus)',
      status: 'COMPLETED',
      createdAt: new Date().toISOString(),
    });

    // If referred by someone, record referral record and give referrer commission/bonus
    if (referrer) {
      const referralBonus = this.data.settings.referralDirectBonus || 10.0;
      referrer.balance = Number((referrer.balance + referralBonus).toFixed(2));
      referrer.totalEarned = Number((referrer.totalEarned + referralBonus).toFixed(2));

      this.data.referrals.unshift({
        id: 'ref_' + Date.now().toString(36),
        referrerId: referrer.id,
        referredUserId: newUser.id,
        referredUserName: newUser.name,
        referredUserPhone: newUser.phone,
        bonusAwarded: true,
        bonusAmount: referralBonus,
        createdAt: new Date().toISOString(),
      });

      this.data.transactions.unshift({
        id: 'tx_ref_' + Date.now().toString(36),
        userId: referrer.id,
        type: 'REFERRAL_BONUS',
        amount: referralBonus,
        description: `নতুন বন্ধু ${newUser.name} যোগ করায় রেফার বোনাস`,
        status: 'COMPLETED',
        createdAt: new Date().toISOString(),
      });
    }

    await this.save();
    return { user: newUser };
  }

  public async updateUserProfile(
    userId: string,
    updates: { name?: string; email?: string }
  ): Promise<User | undefined> {
    const user = this.getUserById(userId);
    if (!user) return undefined;

    if (updates.name) user.name = updates.name.trim();
    if (updates.email !== undefined) user.email = updates.email.trim();

    await this.save();
    return user;
  }

  public async changeUserPassword(
    userId: string,
    oldPass: string,
    newPass: string
  ): Promise<{ success: boolean; message: string }> {
    const user = this.getUserById(userId);
    if (!user) return { success: false, message: 'ব্যবহারকারী পাওয়া যায়নি।' };

    const match = await bcrypt.compare(oldPass, user.passwordHash);
    if (!match) return { success: false, message: 'বর্তমান পাসওয়ার্ড সঠিক নয়।' };

    const salt = await bcrypt.genSalt(10);
    user.passwordHash = await bcrypt.hash(newPass, salt);
    await this.save();
    return { success: true, message: 'পাসওয়ার্ড সফলভাবে পরিবর্তিত হয়েছে।' };
  }

  // --- Daily Bonus ---
  public async claimDailyBonus(userId: string): Promise<{ success: boolean; amount: number; message: string }> {
    const user = this.getUserById(userId);
    if (!user) return { success: false, amount: 0, message: 'ব্যবহারকারী পাওয়া যায়নি।' };

    const today = new Date().toISOString().slice(0, 10);
    if (user.dailyBonusClaimedDate === today) {
      return { success: false, amount: 0, message: 'আপনি আজকের দৈনিক বোনাস ইতোমধ্যে নিয়ে নিয়েছেন! আগামীকাল আবার চেষ্টা করুন।' };
    }

    const bonusAmount = this.data.settings.dailyBonusAmount || 5.0;
    user.balance = Number((user.balance + bonusAmount).toFixed(2));
    user.totalEarned = Number((user.totalEarned + bonusAmount).toFixed(2));
    user.dailyBonusClaimedDate = today;

    this.data.transactions.unshift({
      id: 'tx_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
      userId: user.id,
      type: 'DAILY_BONUS',
      amount: bonusAmount,
      description: 'দৈনিক চেক-ইন বোনাস (Daily Check-in Bonus)',
      status: 'COMPLETED',
      createdAt: new Date().toISOString(),
    });

    await this.save();
    return { success: true, amount: bonusAmount, message: `অভিনন্দন! আপনি ৳${bonusAmount} দৈনিক বোনাস পেয়েছেন।` };
  }

  // --- Ads / Video Watch ---
  public getAds(): AdVideo[] {
    return this.data.ads.filter((a) => a.active);
  }

  public getAdById(adId: string): AdVideo | undefined {
    return this.data.ads.find((a) => a.id === adId);
  }

  public async startAdSession(userId: string, adId: string): Promise<{ session?: AdWatchSession; error?: string }> {
    const user = this.getUserById(userId);
    if (!user) return { error: 'ব্যবহারকারী পাওয়া যায়নি।' };

    const today = new Date().toISOString().slice(0, 10);
    if (user.lastWatchDate !== today) {
      user.lastWatchDate = today;
      user.dailyWatchCount = 0;
    }

    if (user.dailyWatchCount >= this.data.settings.dailyAdLimit) {
      return { error: `আজকের সর্বোচ্চ সীমা (${this.data.settings.dailyAdLimit}টি ভিডিও) শেষ হয়েছে। আগামীকাল আবার চেষ্টা করুন!` };
    }

    const ad = this.getAdById(adId);
    if (!ad || !ad.active) {
      return { error: 'বিজ্ঞাপনটি বর্তমানে উপলব্ধ নেই।' };
    }

    const session: AdWatchSession = {
      id: 'sess_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      userId,
      adId,
      startedAt: Date.now(),
      durationSeconds: ad.durationSeconds,
      claimed: false,
    };

    this.data.adSessions.push(session);
    // Cleanup old sessions (keep last 200)
    if (this.data.adSessions.length > 300) {
      this.data.adSessions = this.data.adSessions.slice(-200);
    }

    await this.save();
    return { session };
  }

  public async claimAdReward(
    userId: string,
    sessionId: string
  ): Promise<{ success: boolean; rewardAmount: number; message: string; newBalance?: number }> {
    const user = this.getUserById(userId);
    if (!user) return { success: false, rewardAmount: 0, message: 'ব্যবহারকারী পাওয়া যায়নি।' };

    const sessionIndex = this.data.adSessions.findIndex((s) => s.id === sessionId && s.userId === userId);
    if (sessionIndex === -1) {
      return { success: false, rewardAmount: 0, message: 'বিজ্ঞাপন সেশনটি পাওয়া যায়নি বা মেয়াদোত্তীর্ণ।' };
    }

    const session = this.data.adSessions[sessionIndex];
    if (session.claimed) {
      return { success: false, rewardAmount: 0, message: 'এই ভিডিওটির রিওয়ার্ড ইতোমধ্যে নেওয়া হয়েছে!' };
    }

    const now = Date.now();
    const elapsedSeconds = (now - session.startedAt) / 1000;
    // Server-side anti-cheat: must have watched at least 90% of duration
    if (elapsedSeconds < session.durationSeconds * 0.9) {
      return {
        success: false,
        rewardAmount: 0,
        message: `ভিডিওটি সম্পূর্ণ দেখার পূর্বে রিওয়ার্ড দাবি করা যাবে না। বাকি সময়: ${Math.ceil(session.durationSeconds - elapsedSeconds)} সেকেন্ড।`,
      };
    }

    const ad = this.getAdById(session.adId);
    const reward = ad ? ad.rewardAmount : 3.0;

    const today = new Date().toISOString().slice(0, 10);
    if (user.lastWatchDate !== today) {
      user.lastWatchDate = today;
      user.dailyWatchCount = 0;
    }

    if (user.dailyWatchCount >= this.data.settings.dailyAdLimit) {
      return { success: false, rewardAmount: 0, message: 'আজকের দৈনিক ভিডিও দেখার কোটা পূর্ণ হয়েছে।' };
    }

    // Mark claimed
    session.claimed = true;
    session.claimedAt = now;

    // Credit user balance
    user.balance = Number((user.balance + reward).toFixed(2));
    user.totalEarned = Number((user.totalEarned + reward).toFixed(2));
    user.dailyWatchCount += 1;

    // Log transaction
    this.data.transactions.unshift({
      id: 'tx_ad_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
      userId: user.id,
      type: 'AD_REWARD',
      amount: reward,
      description: `ভিডিও দর্শন রিওয়ার্ড (${ad ? ad.title : 'বিজ্ঞাপন'})`,
      status: 'COMPLETED',
      createdAt: new Date().toISOString(),
      metadata: { adId: session.adId, duration: session.durationSeconds },
    });

    // Referrer passive commission (if any)
    if (user.referredBy) {
      const referrer = this.getUserById(user.referredBy);
      if (referrer && this.data.settings.referralCommissionPercent > 0) {
        const commission = Number(((reward * this.data.settings.referralCommissionPercent) / 100).toFixed(2));
        if (commission > 0) {
          referrer.balance = Number((referrer.balance + commission).toFixed(2));
          referrer.totalEarned = Number((referrer.totalEarned + commission).toFixed(2));
          this.data.transactions.unshift({
            id: 'tx_comm_' + Date.now().toString(36),
            userId: referrer.id,
            type: 'REFERRAL_BONUS',
            amount: commission,
            description: `রেফারেল কমিশন: ${user.name}-এর ভিডিও ওয়াচ থেকে`,
            status: 'COMPLETED',
            createdAt: new Date().toISOString(),
          });
        }
      }
    }

    await this.save();

    return {
      success: true,
      rewardAmount: reward,
      message: `অভিনন্দন! আপনার অ্যাকাউন্টে ৳${reward.toFixed(2)} যোগ করা হয়েছে।`,
      newBalance: user.balance,
    };
  }

  // --- Monetag Mini App Ads Claim & Verification ---
  public async claimMonetagReward(
    userId: string
  ): Promise<{ success: boolean; rewardAmount: number; message: string; newBalance?: number }> {
    const user = this.getUserById(userId);
    if (!user) return { success: false, rewardAmount: 0, message: 'ব্যবহারকারী পাওয়া যায়নি।' };

    const monetagConfig = this.data.settings.monetag || {
      enabled: true,
      rewardAmount: 3.5,
      dailyLimit: 20,
    };

    if (!monetagConfig.enabled) {
      return { success: false, rewardAmount: 0, message: 'মনিট্যাগ অ্যাড সিস্টেম সাময়িকভাবে স্থগিত আছে।' };
    }

    const today = new Date().toISOString().slice(0, 10);
    if (user.lastWatchDate !== today) {
      user.lastWatchDate = today;
      user.dailyWatchCount = 0;
    }

    if (user.dailyWatchCount >= (monetagConfig.dailyLimit || 20)) {
      return { success: false, rewardAmount: 0, message: 'আজকের মনিট্যাগ অ্যাড দেখার সীমা পূর্ণ হয়েছে।' };
    }

    const reward = monetagConfig.rewardAmount || 3.5;

    user.balance = Number((user.balance + reward).toFixed(2));
    user.totalEarned = Number((user.totalEarned + reward).toFixed(2));
    user.dailyWatchCount += 1;

    // Transaction Record
    this.data.transactions.unshift({
      id: 'tx_monetag_' + Date.now().toString(36),
      userId: user.id,
      type: 'AD_REWARD',
      amount: reward,
      description: 'মনিট্যাগ মিনি অ্যাপ রিওয়ার্ড বিজ্ঞাপন দর্শন',
      status: 'COMPLETED',
      createdAt: new Date().toISOString(),
      metadata: { source: 'Monetag_MiniApp_SDK' },
    });

    // Referrer Commission
    if (user.referredBy) {
      const referrer = this.getUserById(user.referredBy);
      if (referrer && this.data.settings.referralCommissionPercent > 0) {
        const commission = Number(((reward * this.data.settings.referralCommissionPercent) / 100).toFixed(2));
        if (commission > 0) {
          referrer.balance = Number((referrer.balance + commission).toFixed(2));
          referrer.totalEarned = Number((referrer.totalEarned + commission).toFixed(2));
          this.data.transactions.unshift({
            id: 'tx_comm_' + Date.now().toString(36),
            userId: referrer.id,
            type: 'REFERRAL_BONUS',
            amount: commission,
            description: `রেফারেল কমিশন: ${user.name}-এর মনিট্যাগ বিজ্ঞাপন দর্শন থেকে`,
            status: 'COMPLETED',
            createdAt: new Date().toISOString(),
          });
        }
      }
    }

    await this.save();

    return {
      success: true,
      rewardAmount: reward,
      message: `অভিনন্দন! মনিট্যাগ বিজ্ঞাপনের জন্য ৳${reward.toFixed(2)} আপনার ব্যালেন্সে যুক্ত হয়েছে।`,
      newBalance: user.balance,
    };
  }

  // --- Tasks ---
  public getTasks(): Task[] {
    return this.data.tasks.filter((t) => t.active);
  }

  public getTaskById(taskId: string): Task | undefined {
    return this.data.tasks.find((t) => t.id === taskId);
  }

  public getUserSubmissions(userId: string): TaskSubmission[] {
    return this.data.submissions.filter((s) => s.userId === userId);
  }

  public async submitTaskProof(
    userId: string,
    taskId: string,
    proofData: string
  ): Promise<{ success: boolean; submission?: TaskSubmission; message: string }> {
    const user = this.getUserById(userId);
    if (!user) return { success: false, message: 'ব্যবহারকারী পাওয়া যায়নি।' };

    const task = this.getTaskById(taskId);
    if (!task || !task.active) return { success: false, message: 'টাস্কটি বর্তমানে সক্রিয় নয়।' };

    // Check if user already submitted this task and is pending or approved
    const existing = this.data.submissions.find(
      (s) => s.userId === userId && s.taskId === taskId && (s.status === 'PENDING' || s.status === 'APPROVED')
    );
    if (existing) {
      if (existing.status === 'APPROVED') {
        return { success: false, message: 'আপনি এই টাস্কটি পূর্বে সফলভাবে সম্পন্ন করেছেন।' };
      }
      return { success: false, message: 'আপনার প্রমাণটি ইতোমধ্যে জমা দেওয়া হয়েছে এবং পর্যালোচনায় রয়েছে।' };
    }

    if (!proofData || proofData.trim().length < 3) {
      return { success: false, message: 'সঠিক প্রুফ বা প্রমাণ তথ্য প্রদান করুন।' };
    }

    const submission: TaskSubmission = {
      id: 'sub_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      taskId: task.id,
      taskTitle: task.title,
      userId: user.id,
      userName: user.name,
      userPhone: user.phone,
      proofData: proofData.trim(),
      rewardAmount: task.rewardAmount,
      status: 'PENDING',
      submittedAt: new Date().toISOString(),
    };

    this.data.submissions.unshift(submission);
    task.totalCompleted += 1;

    await this.save();

    return {
      success: true,
      submission,
      message: 'আপনার টাস্ক প্রুফ সফলভাবে জমা হয়েছে। অ্যাডমিন ভেরিফিকেশনের পর ব্যালেন্সে টাকা যোগ হবে।',
    };
  }

  // --- Wallet & Withdrawals ---
  public getUserWithdrawals(userId: string): WithdrawalRequest[] {
    return this.data.withdrawals.filter((w) => w.userId === userId);
  }

  public async requestWithdrawal(params: {
    userId: string;
    method: 'bKash' | 'Nagad' | 'Rocket';
    accountType: 'Personal' | 'Agent';
    accountNumber: string;
    amount: number;
  }): Promise<{ success: boolean; withdrawal?: WithdrawalRequest; message: string; newBalance?: number }> {
    const user = this.getUserById(params.userId);
    if (!user) return { success: false, message: 'ব্যবহারকারী পাওয়া যায়নি।' };

    if (!this.data.settings.isWithdrawalOpen) {
      return { success: false, message: 'বর্তমানে সার্ভার আপগ্রেডের জন্য উত্তোলন সাময়িকভাবে স্থগিত আছে।' };
    }

    if (user.status !== 'ACTIVE') {
      return { success: false, message: 'আপনার অ্যাকাউন্টটি স্থগিত বা সীমাবদ্ধ করা হয়েছে।' };
    }

    // Phone / Account number check (Bangladeshi 11-digit check)
    const cleanAccount = params.accountNumber.trim().replace(/\s+/g, '');
    const bdPhoneRegex = /^01[3-9]\d{8}$/;
    if (!bdPhoneRegex.test(cleanAccount)) {
      return { success: false, message: 'অনুগ্রহ করে সঠিক ১১ ডিজিটের মোবাইল নম্বর দিন (যেমন: 017XXXXXXXX)।' };
    }

    const amount = Number(params.amount);
    if (isNaN(amount) || amount <= 0) {
      return { success: false, message: 'সঠিক টাকার পরিমাণ উল্লেখ করুন।' };
    }

    const minAmount = this.data.settings.minWithdrawal || 50;
    if (amount < minAmount) {
      return { success: false, message: `সর্বনিম্ন উত্তোলনের পরিমাণ ৳${minAmount}।` };
    }

    if (user.balance < amount) {
      return { success: false, message: `অপর্যাপ্ত ব্যালেন্স! আপনার বর্তমান ব্যালেন্স ৳${user.balance.toFixed(2)}।` };
    }

    // Check pending withdrawals to prevent double submit spam
    const activePending = this.data.withdrawals.filter((w) => w.userId === user.id && w.status === 'PENDING');
    if (activePending.length >= 2) {
      return { success: false, message: 'আপনার ইতোমধ্যে দুটি উত্তোলন রিকোয়েস্ট অপেক্ষমাণ আছে। পূর্বের রিকোয়েস্ট সম্পন্ন হওয়া পর্যন্ত অপেক্ষা করুন।' };
    }

    const fee = 0; // 0 BDT withdrawal fee
    const finalAmount = amount - fee;

    // Deduct user balance atomically
    user.balance = Number((user.balance - amount).toFixed(2));
    user.totalWithdrawn = Number((user.totalWithdrawn + amount).toFixed(2));

    const withdrawal: WithdrawalRequest = {
      id: 'wd_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      userId: user.id,
      userName: user.name,
      method: params.method,
      accountType: params.accountType,
      accountNumber: cleanAccount,
      amount,
      fee,
      finalAmount,
      status: 'PENDING',
      requestedAt: new Date().toISOString(),
    };

    this.data.withdrawals.unshift(withdrawal);

    // Ledger transaction
    this.data.transactions.unshift({
      id: 'tx_wd_' + Date.now().toString(36),
      userId: user.id,
      type: 'WITHDRAWAL',
      amount: amount,
      description: `${params.method} (${params.accountType}) এ টাকা উত্তোলনের আবেদন`,
      status: 'PENDING',
      createdAt: new Date().toISOString(),
      metadata: { withdrawalId: withdrawal.id, method: params.method, account: cleanAccount },
    });

    await this.save();

    return {
      success: true,
      withdrawal,
      message: `৳${amount} টাকা উত্তোলনের রিকোয়েস্ট সফলভাবে গ্রহণ করা হয়েছে। দ্রুত বিকাশ/নগদে ট্রান্সফার করা হবে।`,
      newBalance: user.balance,
    };
  }

  // --- Transactions ---
  public getUserTransactions(userId: string): Transaction[] {
    return this.data.transactions.filter((t) => t.userId === userId).slice(0, 50);
  }

  // --- Referrals ---
  public getUserReferrals(userId: string): ReferralRecord[] {
    return this.data.referrals.filter((r) => r.referrerId === userId);
  }

  // --- Settings ---
  public getSettings(): SiteSettings {
    return this.data.settings;
  }

  // --- Dashboard Snapshot for User ---
  public getUserDashboard(userId: string) {
    const user = this.getUserById(userId);
    if (!user) return null;

    const today = new Date().toISOString().slice(0, 10);
    const todayWatchCount = user.lastWatchDate === today ? user.dailyWatchCount : 0;

    // Calculate today's earnings from today's completed transactions
    const todayEarnings = this.data.transactions
      .filter((t) => t.userId === userId && t.status === 'COMPLETED' && t.createdAt.startsWith(today) && t.type !== 'WITHDRAWAL')
      .reduce((sum, t) => sum + t.amount, 0);

    const recentTransactions = this.getUserTransactions(userId).slice(0, 5);
    const activeTasksCount = this.data.tasks.filter((t) => t.active).length;
    const userSubmissions = this.getUserSubmissions(userId);
    const completedTasksCount = userSubmissions.filter((s) => s.status === 'APPROVED').length;
    const referrals = this.getUserReferrals(userId);

    const hasClaimedDailyToday = user.dailyBonusClaimedDate === today;

    return {
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        email: user.email,
        balance: user.balance,
        totalEarned: user.totalEarned,
        totalWithdrawn: user.totalWithdrawn,
        referralCode: user.referralCode,
        status: user.status,
        role: user.role,
        createdAt: user.createdAt,
      },
      stats: {
        todayEarnings: Number(todayEarnings.toFixed(2)),
        todayWatchCount,
        dailyAdLimit: this.data.settings.dailyAdLimit,
        totalReferrals: referrals.length,
        referralEarnings: Number(referrals.reduce((sum, r) => sum + (r.bonusAmount || 0), 0).toFixed(2)),
        completedTasksCount,
        activeTasksCount,
        hasClaimedDailyToday,
      },
      recentTransactions,
      settings: this.data.settings,
    };
  }

  // --- Admin Methods ---
  public getRawData(): DatabaseSchema {
    return this.data;
  }

  public async updateAdminWithdrawal(id: string, action: 'APPROVE' | 'REJECT', note?: string) {
    const item = this.data.withdrawals.find((w) => w.id === id);
    if (!item) return { success: false, message: 'Withdrawal not found' };
    item.status = action === 'APPROVE' ? 'COMPLETED' : 'REJECTED';
    item.processedAt = new Date().toISOString();
    if (note) item.adminNote = note;

    const user = this.getUserById(item.userId);
    if (user) {
      if (action === 'REJECT') {
        user.balance += item.amount;
        user.totalWithdrawn = Math.max(0, user.totalWithdrawn - item.amount);
      }
    }
    await this.save();
    return { success: true, item };
  }

  public async adminAddTask(task: Task) {
    this.data.tasks.unshift(task);
    await this.save();
    return { success: true, task };
  }

  public async adminUpdateTaskSubmission(id: string, action: 'APPROVED' | 'REJECTED', reason?: string) {
    const submission = this.data.submissions.find((s) => s.id === id);
    if (!submission) return { success: false, message: 'প্রমাণটি পাওয়া যায়নি।' };

    submission.status = action;
    submission.reviewedAt = new Date().toISOString();
    if (reason) submission.rejectionReason = reason;

    if (action === 'APPROVED') {
      const user = this.getUserById(submission.userId);
      if (user) {
        user.balance = Number((user.balance + submission.rewardAmount).toFixed(2));
        user.totalEarned = Number((user.totalEarned + submission.rewardAmount).toFixed(2));

        this.data.transactions.unshift({
          id: 'tx_task_' + Date.now().toString(36),
          userId: user.id,
          type: 'TASK_REWARD',
          amount: submission.rewardAmount,
          description: `টাস্ক রিওয়ার্ড: ${submission.taskTitle}`,
          status: 'COMPLETED',
          createdAt: new Date().toISOString(),
          metadata: { taskId: submission.taskId, submissionId: submission.id },
        });
      }
    }

    await this.save();
    return { success: true, submission };
  }

  public async adminDeleteTask(id: string) {
    this.data.tasks = this.data.tasks.filter((t) => t.id !== id);
    await this.save();
    return { success: true };
  }

  public async adminAddAd(ad: AdVideo) {
    this.data.ads.unshift(ad);
    await this.save();
    return { success: true, ad };
  }

  public async adminDeleteAd(id: string) {
    this.data.ads = this.data.ads.filter((a) => a.id !== id);
    await this.save();
    return { success: true };
  }

  public async adminUpdateSettings(newSettings: Partial<SiteSettings> & { monetagZoneId?: string }) {
    if (newSettings.monetagZoneId && this.data.settings.monetag) {
      this.data.settings.monetag.zoneId = String(newSettings.monetagZoneId);
    }
    this.data.settings = { ...this.data.settings, ...newSettings };
    await this.save();
    return { success: true, settings: this.data.settings };
  }

  public async adminModifyUserBalance(userId: string, amount: number) {
    const user = this.getUserById(userId);
    if (!user) return { success: false, message: 'User not found' };
    user.balance += amount;
    if (amount > 0) user.totalEarned += amount;
    await this.save();
    return { success: true, user };
  }

  public async adminToggleUserStatus(userId: string) {
    const user = this.getUserById(userId);
    if (!user) return { success: false, message: 'User not found' };
    user.status = user.status === 'ACTIVE' ? 'BANNED' : 'ACTIVE';
    await this.save();
    return { success: true, user };
  }
}

export const db = new DatabaseService();
