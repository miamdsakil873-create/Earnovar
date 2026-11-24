import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { AdItem } from '../types.ts';
import { api } from '../services/api.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { useLanguage } from '../context/LanguageContext.tsx';
import { VideoPlayerModal } from '../components/VideoPlayerModal.tsx';
import { MonetagService } from '../services/monetagSdk.ts';
import { firebaseAds } from '../services/firebaseService.ts';
import { DEFAULT_ADS_30 } from '../data/defaultCatalog.ts';
import {
  PlaySquare,
  Clock,
  Coins,
  Sparkles,
  RefreshCw,
  ShieldCheck,
  Zap,
  X,
  Play,
} from 'lucide-react';

interface WatchEarnViewProps {
  onSuccessToast: (msg: string) => void;
}

// User's private Zone ID is hardcoded securely - invisible and uneditable by users!
const ACTIVE_ZONE_ID = '9537184';

export const WatchEarnView: React.FC<WatchEarnViewProps> = ({ onSuccessToast }) => {
  const { user, updateUserLocally } = useAuth();
  const { t } = useLanguage();
  const [ads, setAds] = useState<AdItem[]>([]);
  const [stats, setStats] = useState<{
    todayWatchCount: number;
    dailyAdLimit: number;
    remainingCount: number;
    isLimitReached: boolean;
  } | null>(null);
  const [selectedAd, setSelectedAd] = useState<AdItem | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [cooldownSeconds, setCooldownSeconds] = useState<number>(0);

  // 5-Hour Cooldown for Ads and Super Ad
  const [adCooldowns, setAdCooldowns] = useState<Record<string, number>>(() => {
    try {
      const key = `earnova_ad_cooldowns_${user?.phone || 'guest'}`;
      const saved = localStorage.getItem(key);
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      return {};
    }
  });

  // Ticker for real-time 5-hour countdown display
  const [, setTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setTick((v) => v + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  // Sync cooldowns on user change
  useEffect(() => {
    try {
      const key = `earnova_ad_cooldowns_${user?.phone || 'guest'}`;
      const saved = localStorage.getItem(key);
      if (saved) setAdCooldowns(JSON.parse(saved));
    } catch (e) {}
  }, [user?.phone]);

  const markAdCooldown = (adId: string) => {
    const updated = { ...adCooldowns, [adId]: Date.now() };
    setAdCooldowns(updated);
    try {
      const key = `earnova_ad_cooldowns_${user?.phone || 'guest'}`;
      localStorage.setItem(key, JSON.stringify(updated));
    } catch (e) {}
  };

  const getAdRemainingMs = (adId: string): number => {
    const completedAt = adCooldowns[adId];
    if (!completedAt) return 0;
    const remaining = completedAt + 5 * 60 * 60 * 1000 - Date.now();
    return remaining > 0 ? remaining : 0;
  };

  const formatRemainingText = (ms: number): string => {
    if (ms <= 0) return '';
    const totalSecs = Math.floor(ms / 1000);
    const hours = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    if (hours > 0) {
      return `${hours} ঘণ্টা ${mins} মি.`;
    }
    return `${mins} মি. ${secs} সে.`;
  };

  // Sponsored Ads States (White-labeled)
  const [showAdModal, setShowAdModal] = useState<boolean>(false);
  const [adTimeLeft, setAdTimeLeft] = useState<number>(10);
  const [adClaimable, setAdClaimable] = useState<boolean>(false);
  const [adClaiming, setAdClaiming] = useState<boolean>(false);

  const fetchAds = async () => {
    try {
      const res = await api.getAds();
      if (res.success && res.ads && res.ads.length > 0) {
        setAds(res.ads.length >= 10 ? res.ads : DEFAULT_ADS_30);
        if (res.stats) setStats(res.stats);
      } else {
        setAds(DEFAULT_ADS_30);
      }
    } catch (err) {
      console.error('Failed to fetch ads:', err);
      setAds(DEFAULT_ADS_30);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAds();

    // Live Firebase Ads subscription
    const unsubAds = firebaseAds.subscribe((liveAds) => {
      if (liveAds && liveAds.length > 0) {
        setAds(liveAds.length >= 10 ? liveAds : DEFAULT_ADS_30);
        setLoading(false);
      } else {
        setAds(DEFAULT_ADS_30);
        setLoading(false);
      }
    });

    // Silently initialize the ad network SDK
    MonetagService.loadScript(ACTIVE_ZONE_ID);

    return () => {
      unsubAds();
    };
  }, []);

  // Quick cooldown timer (anti-spam)
  useEffect(() => {
    if (cooldownSeconds <= 0) return;
    const timer = setInterval(() => {
      setCooldownSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldownSeconds]);

  // Sponsored ad countdown timer
  useEffect(() => {
    if (!showAdModal || adClaimable) return;
    const timer = setInterval(() => {
      setAdTimeLeft((prev) => {
        if (prev <= 1) {
          setAdClaimable(true);
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [showAdModal, adClaimable]);

  const categories = ['all', ...Array.from(new Set(ads.map((a) => a.category)))];
  const filteredAds =
    selectedCategory === 'all'
      ? ads
      : ads.filter((a) => a.category === selectedCategory);

  const handleStartWatch = (ad: AdItem) => {
    const remaining5h = getAdRemainingMs(ad.id);
    if (remaining5h > 0) {
      alert(`এই বিজ্ঞাপনটি দেখা সম্পন্ন হয়েছে। ${formatRemainingText(remaining5h)} পর এটি স্বয়ংক্রিয়ভাবে আবার আনলক হবে।`);
      return;
    }
    if (stats?.isLimitReached) {
      alert('দৈনিক ভিডিও দেখার কোটা শেষ। অনুগ্রহ করে আগামীকাল চেষ্টা করুন!');
      return;
    }
    if (cooldownSeconds > 0) {
      alert(`অনুগ্রহ করে পরবর্তী ভিডিও দেখার পূর্বে ${cooldownSeconds} সেকেন্ড অপেক্ষা করুন।`);
      return;
    }

    // Direct User Gesture: Trigger Monetag SDK show_9537184 / Direct Ad
    try {
      MonetagService.showRewardedAd(ACTIVE_ZONE_ID).catch(() => {});
    } catch (e) {
      console.warn('Monetag trigger error:', e);
    }

    setSelectedAd(ad);
  };

  const handleVideoSuccess = (reward: number, message: string) => {
    onSuccessToast(message);
    if (selectedAd) {
      markAdCooldown(selectedAd.id);
    }
    setCooldownSeconds(10);
    fetchAds();
  };

  // Launch Sponsored Ad
  const superRemaining = getAdRemainingMs('super_ad');
  const handleStartSponsoredAd = async () => {
    if (superRemaining > 0) {
      alert(`সুপার বিজ্ঞাপনটি সম্পন্ন হয়েছে। ${formatRemainingText(superRemaining)} পর এটি আবার দেখতে পারবেন।`);
      return;
    }
    if (cooldownSeconds > 0) {
      alert(`Please wait ${cooldownSeconds} seconds before viewing next ad.`);
      return;
    }

    setAdTimeLeft(10);
    setAdClaimable(false);
    setShowAdModal(true);

    // Call ad SDK programmatic reward flow
    MonetagService.showRewardedAd(ACTIVE_ZONE_ID).catch(() => {});
  };

  const handleClaimSponsoredReward = async () => {
    if (!adClaimable || adClaiming) return;
    setAdClaiming(true);
    try {
      const res = await MonetagService.claimReward();
      if (res.success) {
        if (res.user && res.user.balance !== undefined) {
          updateUserLocally((prev) => ({
            ...prev,
            balance: res.user.balance,
            totalEarned: res.user.totalEarned ?? prev.totalEarned,
          }));
        }

        confetti({
          particleCount: 80,
          spread: 60,
          origin: { y: 0.6 },
        });

        markAdCooldown('super_ad');
        onSuccessToast(res.message);
        setShowAdModal(false);
        setCooldownSeconds(10);
        fetchAds();
      } else {
        alert(res.message || 'Reward claim failed.');
      }
    } catch (e: any) {
      alert(e.message || 'Reward claim failed.');
    } finally {
      setAdClaiming(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-slate-400 gap-3">
        <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs">Loading videos...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-20">
      {/* Featured High-Reward Sponsored Video Ad Card (White-labeled, no third-party branding) */}
      <div className="p-4 rounded-3xl bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-emerald-500/15 border-2 border-amber-500/40 space-y-3 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-amber-500/30 text-amber-300 font-bold border border-amber-400/40">
              <Zap className="w-4 h-4 text-amber-300 fill-current" />
            </span>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-sm font-black text-white">{t('superAdTitle')}</h3>
                <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 shadow-sm">
                  HIGH PAYING
                </span>
              </div>
              <p className="text-[11px] text-amber-200/90 font-medium">
                {t('superAdDesc')}
              </p>
            </div>
          </div>
        </div>

        <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between text-xs">
          <div>
            <p className="text-[10px] text-slate-400">Reward per Video:</p>
            <p className="font-bold text-amber-400 font-mono text-sm">+৳৩.৫০ / $0.035 BDT</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-slate-400">Status:</p>
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Active Now
            </span>
          </div>
        </div>

        <button
          onClick={handleStartSponsoredAd}
          disabled={superRemaining > 0 || cooldownSeconds > 0}
          className={`w-full py-3 px-4 rounded-2xl font-black text-xs flex items-center justify-center gap-2 transition active:scale-95 shadow-md ${
            superRemaining > 0
              ? 'bg-slate-800 text-amber-400/90 border border-amber-500/30 cursor-not-allowed'
              : cooldownSeconds > 0
              ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
              : 'bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-slate-950 shadow-amber-500/25 hover:brightness-110 cursor-pointer animate-pulse'
          }`}
        >
          {superRemaining > 0 ? (
            <>
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span>🔒 সম্পন্ন (৫ ঘণ্টা লক — {formatRemainingText(superRemaining)} বাকি)</span>
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{t('superAdBtn')}</span>
            </>
          )}
        </button>
      </div>

      {/* Header Banner */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border border-slate-800 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <PlaySquare className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">{t('watchVideos')}</h2>
              <p className="text-[11px] text-slate-300">{t('earnPerView')}</p>
            </div>
          </div>
          <button
            onClick={fetchAds}
            className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
            title="Refresh"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Daily Limit Status Bar */}
        <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between text-xs">
          <span className="text-slate-400">{t('dailyVideoProgress')}:</span>
          <div className="flex items-center gap-2">
            <span className="font-mono font-bold text-emerald-400">
              {stats?.todayWatchCount} / {stats?.dailyAdLimit}
            </span>
            {stats?.isLimitReached ? (
              <span className="px-2 py-0.5 rounded bg-red-500/20 text-red-400 text-[10px] font-bold">
                {t('quotaFinished')}
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">
                {stats?.remainingCount} {t('remaining')}
              </span>
            )}
          </div>
        </div>

        {cooldownSeconds > 0 && (
          <div className="p-2 rounded-lg bg-amber-500/15 border border-amber-500/30 text-[11px] text-amber-300 flex items-center gap-1.5 font-medium">
            <Clock className="w-3.5 h-3.5 shrink-0" />
            <span>{t('cooldownActive')} ({cooldownSeconds}s)</span>
          </div>
        )}
      </div>

      {/* Category Filter Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1 text-xs">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3 py-1.5 rounded-xl font-medium shrink-0 transition-all ${
              selectedCategory === cat
                ? 'bg-emerald-500 text-slate-950 font-bold shadow-md shadow-emerald-500/20'
                : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-slate-200'
            }`}
          >
            {cat === 'all' ? 'All Videos' : cat}
          </button>
        ))}
      </div>

      {/* Ads List Grid */}
      <div className="space-y-3">
        {filteredAds.map((ad) => {
          const remaining5h = getAdRemainingMs(ad.id);
          const isLocked = remaining5h > 0;

          return (
            <div
              key={ad.id}
              className={`rounded-2xl bg-slate-900 border transition-all duration-200 shadow-md group overflow-hidden ${
                isLocked ? 'border-amber-500/30 opacity-90' : 'border-slate-800 hover:border-slate-700/80'
              }`}
            >
              <div className="flex flex-row p-3 gap-3">
                <div className="relative w-28 h-20 rounded-xl overflow-hidden shrink-0 bg-slate-950">
                  <img
                    src={ad.thumbnail}
                    alt={ad.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                  />
                  <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shadow-md ${
                      isLocked ? 'bg-amber-500/80 text-slate-950' : 'bg-emerald-500/90 text-slate-950'
                    }`}>
                      {isLocked ? (
                        <Clock className="w-4 h-4" />
                      ) : (
                        <PlaySquare className="w-4 h-4 fill-current ml-0.5" />
                      )}
                    </div>
                  </div>
                  <div className="absolute bottom-1 right-1 bg-black/80 text-[10px] text-white px-1.5 py-0.5 rounded font-mono font-medium">
                    {ad.durationSeconds}s
                  </div>
                </div>

                <div className="flex flex-col justify-between flex-1 min-w-0">
                  <div>
                    <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                      <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                        {ad.category}
                      </span>
                      <span className="text-[10px] text-slate-400 truncate">
                        {ad.sponsorName}
                      </span>
                      {isLocked && (
                        <span className="text-[9px] font-bold text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded-full border border-amber-500/30">
                          ৫ ঘণ্টা লক ({formatRemainingText(remaining5h)})
                        </span>
                      )}
                    </div>
                    <h3 className="font-bold text-xs text-white line-clamp-1 group-hover:text-emerald-300 transition">
                      {ad.title}
                    </h3>
                    <p className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">
                      {ad.description}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-1 text-emerald-400 font-bold font-mono text-xs">
                      <Coins className="w-3.5 h-3.5 text-amber-400" />
                      <span>+৳{ad.rewardAmount.toFixed(2)}</span>
                    </div>

                    <button
                      onClick={() => handleStartWatch(ad)}
                      disabled={isLocked || stats?.isLimitReached || cooldownSeconds > 0}
                      className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1 transition active:scale-95 ${
                        isLocked
                          ? 'bg-amber-500/15 border border-amber-500/30 text-amber-300 cursor-not-allowed'
                          : stats?.isLimitReached || cooldownSeconds > 0
                          ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                          : 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 shadow-md shadow-emerald-500/20 hover:brightness-110'
                      }`}
                    >
                      {isLocked ? (
                        <>
                          <Clock className="w-3 h-3 text-amber-400" />
                          <span>লক ({formatRemainingText(remaining5h)})</span>
                        </>
                      ) : (
                        <>
                          <span>{t('watchNow')}</span>
                          <Sparkles className="w-3 h-3" />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Rules & Guidelines */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2 text-xs text-slate-400">
        <h4 className="font-bold text-slate-200 flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Earning Rules & Policy:</span>
        </h4>
        <ul className="space-y-1 text-[11px] list-disc list-inside">
          <li>Watch the video ad completely until the countdown reaches 0 seconds.</li>
          <li>প্রতিটি ভিডিও অ্যাড দেখার পর সেটি ৫ ঘণ্টার জন্য লক থাকবে এবং ৫ ঘণ্টা পর আবার আনলক হবে।</li>
          <li>Click the Claim Reward button to instantly credit real cash to your balance.</li>
          <li>Multiple withdrawals are supported daily via bKash, Nagad, Crypto, and PayPal.</li>
        </ul>
      </div>

      {/* Sponsored Ad Interactive Modal (White-labeled) */}
      {showAdModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/90 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-slate-900 border-2 border-amber-500/50 rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl flex flex-col text-slate-100">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-950">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
                <span className="text-xs font-black text-amber-300 uppercase tracking-wider">
                  Sponsored Partner Video
                </span>
              </div>
              <button
                onClick={() => setShowAdModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Interactive Real Video Ad Screen */}
            <div className="relative aspect-video bg-black overflow-hidden select-none flex items-center justify-center">
              <video
                src="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4"
                poster="https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=700&q=80"
                className="absolute inset-0 w-full h-full object-cover"
                playsInline
                autoPlay
                muted
                loop
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-black/60 pointer-events-none" />

              <div className="relative z-10 text-center px-4 space-y-1.5">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[10px] font-bold">
                  <Zap className="w-3 h-3 fill-current" />
                  <span>Sponsor Partner Ad Active</span>
                </span>
                <h4 className="text-sm font-black text-white drop-shadow">
                  High-Reward Sponsored Campaign
                </h4>
                <p className="text-[11px] text-slate-300 drop-shadow line-clamp-1">
                  Watch full 10 seconds to receive ৳3.50 instant credit
                </p>

                {/* Animated visual audio/video equalizer */}
                {!adClaimable && (
                  <div className="flex items-center justify-center gap-1 pt-1">
                    <span className="w-1 h-3 bg-emerald-400 rounded-full animate-bounce" />
                    <span className="w-1 h-5 bg-teal-400 rounded-full animate-bounce delay-100" />
                    <span className="w-1 h-7 bg-amber-400 rounded-full animate-bounce delay-200" />
                    <span className="w-1 h-4 bg-teal-400 rounded-full animate-bounce delay-150" />
                    <span className="w-1 h-2 bg-emerald-400 rounded-full animate-bounce" />
                  </div>
                )}
              </div>

              {/* Progress timer badge */}
              <div className="absolute bottom-2 right-2 z-10 bg-black/80 backdrop-blur-md px-2 py-0.5 rounded-md text-[10px] font-mono font-bold text-amber-300 border border-slate-700">
                {adClaimable ? 'Ready!' : `${adTimeLeft}s`}
              </div>
            </div>

            <div className="p-4 space-y-3 bg-slate-900">
              {/* Progress Bar */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-slate-400">Ad Progress:</span>
                  <span className="text-emerald-400 font-mono">
                    {adClaimable ? 'Complete (100%)' : `${Math.round(((10 - adTimeLeft) / 10) * 100)}%`}
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                  <div
                    className="h-full bg-gradient-to-r from-amber-500 to-emerald-400 transition-all duration-500 rounded-full"
                    style={{ width: `${((10 - adTimeLeft) / 10) * 100}%` }}
                  />
                </div>
              </div>

              <button
                onClick={handleClaimSponsoredReward}
                disabled={!adClaimable || adClaiming}
                className={`w-full py-3 px-4 rounded-2xl font-black text-xs flex items-center justify-center gap-2 shadow-lg transition active:scale-95 ${
                  adClaimable && !adClaiming
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 shadow-emerald-500/30 hover:brightness-110 cursor-pointer animate-bounce'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                }`}
              >
                {adClaiming ? (
                  <>
                    <span className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                    <span>Depositing cash to balance...</span>
                  </>
                ) : adClaimable ? (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>{t('claimReward')} (+৳৩.৫০ / $0.035)</span>
                  </>
                ) : (
                  <>
                    <Clock className="w-4 h-4" />
                    <span>Streaming Sponsored Video ({adTimeLeft}s)</span>
                  </>
                )}
              </button>

              <p className="text-[10px] text-slate-500 text-center">
                Note: If full-screen ads don't open, please disable phone AdBlocker or Private DNS.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Video Player Modal */}
      <VideoPlayerModal
        ad={selectedAd}
        onClose={() => setSelectedAd(null)}
        onSuccess={handleVideoSuccess}
      />
    </div>
  );
};
