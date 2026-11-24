import { Router, Response } from 'express';
import { db } from '../../../lib/db/db.ts';
import { authMiddleware, AuthenticatedRequest } from '../middleware/authMiddleware.ts';

const router = Router();

// Referral stats and list of joined friends
router.get('/stats', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    const referrals = db.getUserReferrals(user.id);
    const settings = db.getSettings();

    const totalReferrals = referrals.length;
    const totalBonusEarned = referrals.reduce((sum, r) => sum + (r.bonusAmount || 0), 0);

    res.json({
      success: true,
      referralCode: user.referralCode,
      totalReferrals,
      totalBonusEarned: Number(totalBonusEarned.toFixed(2)),
      referralDirectBonus: settings.referralDirectBonus,
      referralCommissionPercent: settings.referralCommissionPercent,
      referrals: referrals.map((r) => ({
        id: r.id,
        name: r.referredUserName,
        phone: r.referredUserPhone.replace(/(\d{3})\d{5}(\d{3})/, '$1*****$2'),
        bonusAmount: r.bonusAmount,
        createdAt: r.createdAt,
      })),
    });
  } catch (err: any) {
    console.error('Referral stats error:', err);
    res.status(500).json({ success: false, message: 'রেফারেল তথ্য লোড করা যায়নি।' });
  }
});

export default router;
