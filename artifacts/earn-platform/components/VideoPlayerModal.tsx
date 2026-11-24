import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { AdItem } from '../types.ts';
import { api } from '../services/api.ts';
import { useAuth } from '../context/AuthContext.tsx';
import {
  X,
  Play,
  Pause,
  Volume2,
  VolumeX,
  ShieldAlert,
  Sparkles,
  CheckCircle2,
  Clock,
  Coins,
  Tv,
} from 'lucide-react';

interface VideoPlayerModalProps {
  ad: AdItem | null;
  onClose: () => void;
  onSuccess: (reward: number, message: string) => void;
}

// Fast CDN Promotional Video Streams
const PROMO_VIDEOS = [
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyBlazes.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WeAreGoingOnBullrun.mp4',
];

export const VideoPlayerModal: React.FC<VideoPlayerModalProps> = ({
  ad,
  onClose,
  onSuccess,
}) => {
  const { updateUserLocally } = useAuth();
  const [session, setSession] = useState<{ id: string; durationSeconds: number } | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [isMuted, setIsMuted] = useState<boolean>(true); // Start muted for reliable mobile autoplay
  const [timeLeft, setTimeLeft] = useState<number>(15);
  const [totalDuration, setTotalDuration] = useState<number>(15);
  const [canClaim, setCanClaim] = useState<boolean>(false);
  const [claiming, setClaiming] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingSession, setLoadingSession] = useState<boolean>(true);
  const [videoError, setVideoError] = useState<boolean>(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Pick video source
  const videoSource = React.useMemo(() => {
    if (!ad) return PROMO_VIDEOS[0];
    if ((ad as any).videoUrl) return (ad as any).videoUrl;
    // Map ad id to one of the promo video clips
    let hash = 0;
    const str = ad.id || ad.title;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
    }
    const idx = Math.abs(hash) % PROMO_VIDEOS.length;
    return PROMO_VIDEOS[idx];
  }, [ad]);

  // Initialize server session
  useEffect(() => {
    if (!ad) return;

    let isMounted = true;
    setLoadingSession(true);
    setError(null);
    setCanClaim(false);

    api
      .startAdSession(ad.id)
      .then((res) => {
        if (!isMounted) return;
        if (res.success && res.session) {
          setSession(res.session);
          const duration = ad.durationSeconds || res.session.durationSeconds || 15;
          setTotalDuration(duration);
          setTimeLeft(duration);
          setIsPlaying(true);
        }
      })
      .catch((err: any) => {
        if (!isMounted) return;
        setError(err.message || 'ভিডিও সেশন শুরু করতে ব্যর্থ হয়েছে।');
      })
      .finally(() => {
        if (isMounted) setLoadingSession(false);
      });

    return () => {
      isMounted = false;
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [ad]);

  // Video playback countdown loop
  useEffect(() => {
    if (!session || !isPlaying || canClaim) return;

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          setCanClaim(true);
          confetti({
            particleCount: 50,
            spread: 60,
            origin: { y: 0.65 },
          });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [session, isPlaying, canClaim]);

  // Handle play/pause with HTML5 video element
  const togglePlayPause = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play().catch(() => {});
      setIsPlaying(true);
    }
  };

  // Handle audio mute/unmute
  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
    }
    setIsMuted(!isMuted);
  };

  if (!ad) return null;

  const handleClaimReward = async () => {
    if (!session || !canClaim || claiming) return;

    setClaiming(true);
    setError(null);

    try {
      const res = await api.claimAdReward(session.id);
      if (res.success) {
        if (res.user && res.user.balance !== undefined) {
          updateUserLocally((prev) => ({
            ...prev,
            balance: res.user.balance,
            totalEarned: res.user.totalEarned ?? prev.totalEarned,
          }));
        }

        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
        });

        onSuccess(res.rewardAmount || ad.rewardAmount, res.message || 'বিজ্ঞাপন রিওয়ার্ড সফলভাবে যুক্ত হয়েছে!');
        onClose();
      }
    } catch (err: any) {
      setError(err.message || 'রিওয়ার্ড দাবি ব্যর্থ হয়েছে।');
    } finally {
      setClaiming(false);
    }
  };

  const progressPercent = totalDuration > 0 ? ((totalDuration - timeLeft) / totalDuration) * 100 : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl flex flex-col text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
            <span className="text-xs font-bold text-red-400 uppercase tracking-wider flex items-center gap-1.5">
              <Tv className="w-3.5 h-3.5" />
              <span>ভিডিও বিজ্ঞাপন চলছে (LIVE AD)</span>
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Real HTML5 Video Screen */}
        <div className="relative aspect-video bg-black flex flex-col justify-between overflow-hidden select-none">
          {/* HTML5 Video element */}
          {!videoError ? (
            <video
              ref={videoRef}
              src={videoSource}
              poster={ad.thumbnail}
              className="absolute inset-0 w-full h-full object-cover"
              playsInline
              autoPlay
              muted={isMuted}
              loop
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onError={() => {
                setVideoError(true);
              }}
            />
          ) : (
            // Fallback image animation if video stream is blocked by ISP
            <div className="absolute inset-0 w-full h-full">
              <img
                src={ad.thumbnail}
                alt={ad.title}
                className={`w-full h-full object-cover transition-transform duration-700 ${
                  isPlaying ? 'scale-105 opacity-80' : 'opacity-60'
                }`}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/50 to-transparent" />
            </div>
          )}

          {/* Dark gradient overlay for readable controls */}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-black/60 pointer-events-none" />

          {/* Top overlay badges */}
          <div className="relative z-10 p-3 flex items-center justify-between">
            <span className="bg-black/75 backdrop-blur-md text-[11px] font-bold text-emerald-300 px-2.5 py-1 rounded-lg border border-emerald-500/30 flex items-center gap-1.5 shadow-md">
              <Coins className="w-3.5 h-3.5 text-amber-400" />
              <span>রিওয়ার্ড: ৳{ad.rewardAmount.toFixed(2)}</span>
            </span>

            <button
              onClick={toggleMute}
              className="w-7 h-7 rounded-full bg-black/70 backdrop-blur-md flex items-center justify-center text-slate-200 hover:text-white border border-slate-700 transition"
              title={isMuted ? 'আনমিউট করুন' : 'মিউট করুন'}
            >
              {isMuted ? <VolumeX className="w-3.5 h-3.5 text-amber-400" /> : <Volume2 className="w-3.5 h-3.5 text-emerald-400" />}
            </button>
          </div>

          {/* Center ad sponsor info */}
          <div className="relative z-10 px-4 py-1 text-center pointer-events-none">
            <span className="inline-block px-2.5 py-0.5 rounded-full bg-emerald-500/30 border border-emerald-400/50 text-emerald-300 text-[10px] font-extrabold mb-1">
              {ad.sponsorName}
            </span>
            <h3 className="font-bold text-sm text-white drop-shadow-md line-clamp-1">
              {ad.title}
            </h3>
          </div>

          {/* Bottom Progress Controls */}
          <div className="relative z-10 p-3 space-y-1.5 bg-gradient-to-t from-black/90 to-transparent">
            <div className="flex items-center justify-between text-[11px] font-semibold text-slate-300">
              <button
                onClick={togglePlayPause}
                disabled={canClaim}
                className="flex items-center gap-1.5 text-xs hover:text-white bg-black/50 px-2 py-0.5 rounded-md border border-slate-700"
              >
                {isPlaying ? <Pause className="w-3.5 h-3.5 text-amber-300" /> : <Play className="w-3.5 h-3.5 text-emerald-400" />}
                <span>{isPlaying ? 'পজ' : 'চালু করুন'}</span>
              </button>

              <div className="flex items-center gap-1.5 bg-black/70 px-2.5 py-0.5 rounded-md border border-amber-500/40 text-amber-300 font-mono font-bold">
                <Clock className="w-3.5 h-3.5" />
                <span>{canClaim ? 'সম্পূর্ণ!' : `${timeLeft} সেকেন্ড বাকি`}</span>
              </div>
            </div>

            {/* Progress bar */}
            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-amber-400 transition-all duration-300 rounded-full"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Content & Validation Feedback */}
        <div className="p-4 space-y-3 bg-slate-900">
          {loadingSession ? (
            <div className="text-center py-2 text-xs text-slate-400 animate-pulse">
              সার্ভারের সাথে নিরাপদ সংযোগ স্থাপন করা হচ্ছে...
            </div>
          ) : error ? (
            <div className="p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-red-300 text-xs flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
              <span>{error}</span>
            </div>
          ) : canClaim ? (
            <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <div>
                <p className="font-bold">ভিডিও দেখা সম্পন্ন হয়েছে!</p>
                <p className="text-[11px] text-slate-300">
                  নিচের বাটনে চাপ দিয়ে ৳{ad.rewardAmount.toFixed(2)} আপনার ওয়ালেটে যোগ করে নিন।
                </p>
              </div>
            </div>
          ) : (
            <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/50 text-[11px] text-slate-300 flex items-center justify-between">
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                ভিডিও বিজ্ঞাপন সম্পূর্ণ দেখুন
              </span>
              <span className="text-emerald-400 font-semibold font-mono">
                {Math.ceil(progressPercent)}%
              </span>
            </div>
          )}

          {/* Action Button */}
          <button
            onClick={handleClaimReward}
            disabled={!canClaim || claiming || !!error}
            className={`w-full py-3 px-4 rounded-xl font-black text-xs flex items-center justify-center gap-2 transition-all duration-200 active:scale-95 shadow-lg ${
              canClaim && !claiming
                ? 'bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 text-slate-950 shadow-emerald-500/25 hover:brightness-110 cursor-pointer animate-pulse'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/60'
            }`}
          >
            {claiming ? (
              <>
                <span className="w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
                <span>রিওয়ার্ড অ্যাকাউন্টে জমা হচ্ছে...</span>
              </>
            ) : canClaim ? (
              <>
                <Sparkles className="w-4 h-4" />
                <span>রিওয়ার্ড দাবি করুন (+৳{ad.rewardAmount.toFixed(2)})</span>
              </>
            ) : (
              <>
                <Clock className="w-4 h-4" />
                <span>ভিডিও শেষ হওয়া পর্যন্ত অপেক্ষা করুন ({timeLeft}s)</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
