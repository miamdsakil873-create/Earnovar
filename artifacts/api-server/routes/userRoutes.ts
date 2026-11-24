import { Router, Response } from 'express';
import { db } from '../../../lib/db/db.ts';
import { authMiddleware, AuthenticatedRequest } from '../middleware/authMiddleware.ts';

const router = Router();

// Get complete dashboard data
router.get('/dashboard', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  try {
    const dashboard = db.getUserDashboard(req.user!.id);
    if (!dashboard) {
      res.status(404).json({ success: false, message: 'ব্যবহারকারী পাওয়া যায়নি।' });
      return;
    }
    res.json({ success: true, ...dashboard });
  } catch (err: any) {
    console.error('Dashboard error:', err);
    res.status(500).json({ success: false, message: 'ড্যাশবোর্ড তথ্য লোড করা যায়নি।' });
  }
});

// Claim Daily Check-in Bonus
router.post('/daily-bonus', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const result = await db.claimDailyBonus(req.user!.id);
    if (!result.success) {
      res.status(400).json(result);
      return;
    }
    const updatedUser = db.getUserById(req.user!.id);
    res.json({
      ...result,
      newBalance: updatedUser?.balance,
    });
  } catch (err: any) {
    console.error('Daily bonus error:', err);
    res.status(500).json({ success: false, message: 'দৈনিক বোনাস প্রসেস করতে ব্যর্থ হয়েছে।' });
  }
});

// Update Profile
router.put('/profile', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, email } = req.body;
    if (!name || name.trim().length < 2) {
      res.status(400).json({ success: false, message: 'সঠিক নাম লিখুন।' });
      return;
    }

    const updated = await db.updateUserProfile(req.user!.id, { name, email });
    res.json({
      success: true,
      message: 'প্রোফাইল সফলভাবে আপডেট হয়েছে।',
      user: {
        id: updated?.id,
        name: updated?.name,
        phone: updated?.phone,
        email: updated?.email,
      },
    });
  } catch (err: any) {
    console.error('Update profile error:', err);
    res.status(500).json({ success: false, message: 'প্রোফাইল আপডেট ব্যর্থ হয়েছে।' });
  }
});

// Change Password
router.post('/change-password', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      res.status(400).json({ success: false, message: 'বর্তমান ও নতুন পাসওয়ার্ড উভয়ই প্রদান করুন।' });
      return;
    }

    if (newPassword.length < 6) {
      res.status(400).json({ success: false, message: 'নতুন পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।' });
      return;
    }

    const result = await db.changeUserPassword(req.user!.id, currentPassword, newPassword);
    if (!result.success) {
      res.status(400).json(result);
      return;
    }

    res.json(result);
  } catch (err: any) {
    console.error('Change password error:', err);
    res.status(500).json({ success: false, message: 'পাসওয়ার্ড পরিবর্তন ব্যর্থ হয়েছে।' });
  }
});

export default router;
