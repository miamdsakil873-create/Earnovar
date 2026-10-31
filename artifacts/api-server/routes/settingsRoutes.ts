import { Router, Request, Response } from 'express';
import { db } from '../../../lib/db/db.ts';

const router = Router();

// Public site settings and notices
router.get('/public', (_req: Request, res: Response) => {
  try {
    const settings = db.getSettings();
    res.json({
      success: true,
      settings: {
        siteNotice: settings.siteNotice,
        noticeActive: settings.noticeActive,
        minWithdrawal: settings.minWithdrawal,
        dailyAdLimit: settings.dailyAdLimit,
        dailyBonusAmount: settings.dailyBonusAmount,
        referralDirectBonus: settings.referralDirectBonus,
        referralCommissionPercent: settings.referralCommissionPercent,
        isWithdrawalOpen: settings.isWithdrawalOpen,
        maintenanceMode: settings.maintenanceMode,
        supportTelegram: settings.supportTelegram,
        supportNotice: settings.supportNotice,
        paymentMethods: settings.paymentMethods,
      },
    });
  } catch (err: any) {
    console.error('Settings error:', err);
    res.status(500).json({ success: false, message: 'সাইট সেটিংস লোড করা যায়নি।' });
  }
});

export default router;
