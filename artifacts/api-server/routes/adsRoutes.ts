import { Router, Response } from 'express';
import { db } from '../../../lib/db/db.ts';
import { authMiddleware, AuthenticatedRequest } from '../middleware/authMiddleware.ts';

const router = Router();

// Get list of active ads and user's current watch status
router.get('/list', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  try {
    const ads = db.getAds();
    const user = db.getUserById(req.user!.id);
    const settings = db.getSettings();

    const today = new Date().toISOString().slice(0, 10);
    const todayWatchCount = user?.lastWatchDate === today ? user.dailyWatchCount : 0;
    const remainingCount = Math.max(0, settings.dailyAdLimit - todayWatchCount);

    res.json({
      success: true,
      ads,
      stats: {
        todayWatchCount,
        dailyAdLimit: settings.dailyAdLimit,
        remainingCount,
        isLimitReached: remainingCount <= 0,
      },
    });
  } catch (err: any) {
    console.error('Ads list error:', err);
    res.status(500).json({ success: false, message: 'বিজ্ঞাপনের তালিকা লোড করা যায়নি।' });
  }
});

// Start an ad watch session
router.post('/start-session', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { adId } = req.body;
    if (!adId) {
      res.status(400).json({ success: false, message: 'বিজ্ঞাপন আইডি পাওয়া যায়নি।' });
      return;
    }

    const result = await db.startAdSession(req.user!.id, adId);
    if (result.error) {
      res.status(400).json({ success: false, message: result.error });
      return;
    }

    res.json({
      success: true,
      session: {
        id: result.session?.id,
        durationSeconds: result.session?.durationSeconds,
        adId: result.session?.adId,
      },
    });
  } catch (err: any) {
    console.error('Start session error:', err);
    res.status(500).json({ success: false, message: 'ভিডিও সেশন শুরু করা ব্যর্থ হয়েছে।' });
  }
});

// Claim reward for completing the ad
router.post('/claim', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { sessionId } = req.body;
    if (!sessionId) {
      res.status(400).json({ success: false, message: 'সেশন আইডি আবশ্যক।' });
      return;
    }

    const result = await db.claimAdReward(req.user!.id, sessionId);
    if (!result.success) {
      res.status(400).json(result);
      return;
    }

    const updatedUser = db.getUserById(req.user!.id);
    res.json({
      ...result,
      user: {
        balance: updatedUser?.balance,
        totalEarned: updatedUser?.totalEarned,
        dailyWatchCount: updatedUser?.dailyWatchCount,
      },
    });
  } catch (err: any) {
    console.error('Claim ad reward error:', err);
    res.status(500).json({ success: false, message: 'রিওয়ার্ড ক্লেইম করা সম্ভব হয়নি।' });
  }
});

// Claim reward for Monetag Mini App Ads
router.post('/monetag-claim', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const result = await db.claimMonetagReward(req.user!.id);
    if (!result.success) {
      res.status(400).json(result);
      return;
    }

    const updatedUser = db.getUserById(req.user!.id);
    res.json({
      ...result,
      user: {
        balance: updatedUser?.balance,
        totalEarned: updatedUser?.totalEarned,
        dailyWatchCount: updatedUser?.dailyWatchCount,
      },
    });
  } catch (err: any) {
    console.error('Monetag claim error:', err);
    res.status(500).json({ success: false, message: 'মনিট্যাগ রিওয়ার্ড প্রসেস ব্যর্থ হয়েছে।' });
  }
});

export default router;
