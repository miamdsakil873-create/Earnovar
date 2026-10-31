import { Router, Request, Response } from 'express';
import { db } from '../../../lib/db/db.ts';

const router = Router();

// Middleware to verify Admin PIN / Password
const adminAuthMiddleware = (req: Request, res: Response, next: Function) => {
  const pin = req.headers['x-admin-pin'] || req.query.pin;
  const validSecrets = [
    process.env.ADMIN_PASSWORD,
    'Earnova017@',
    '889900',
  ].filter(Boolean);

  if (!pin || !validSecrets.includes(pin as string)) {
    res.status(401).json({ success: false, message: 'ভুল অ্যাডমিন পাসওয়ার্ড / পিন' });
    return;
  }
  next();
};

// 1. Get Live Data (Users, Withdrawals, Tasks, Ads, Settings)
router.get('/data', adminAuthMiddleware, (_req: Request, res: Response) => {
  try {
    const raw = db.getRawData();
    const stats = {
      totalUsers: raw.users.length,
      totalBalance: raw.users.reduce((sum, u) => sum + (u.balance || 0), 0),
      totalWithdrawn: raw.users.reduce((sum, u) => sum + (u.totalWithdrawn || 0), 0),
      pendingWithdrawalsCount: raw.withdrawals.filter((w) => w.status === 'PENDING').length,
      pendingWithdrawalsAmount: raw.withdrawals
        .filter((w) => w.status === 'PENDING')
        .reduce((sum, w) => sum + (w.amount || 0), 0),
      paidWithdrawalsAmount: raw.withdrawals
        .filter((w) => w.status === 'COMPLETED')
        .reduce((sum, w) => sum + (w.amount || 0), 0),
    };

    const sanitizedUsers = raw.users.map((u) => ({
      id: u.id,
      name: u.name,
      phone: u.phone,
      email: u.email,
      balance: u.balance,
      totalEarned: u.totalEarned,
      totalWithdrawn: u.totalWithdrawn,
      referralCode: u.referralCode,
      referralCount: raw.referrals.filter((r) => r.referrerId === u.id).length,
      status: u.status,
      role: u.role,
      createdAt: u.createdAt,
    }));

    res.json({
      success: true,
      stats,
      users: sanitizedUsers,
      withdrawals: raw.withdrawals,
      tasks: raw.tasks,
      taskSubmissions: raw.submissions,
      ads: raw.ads,
      settings: raw.settings,
    });
  } catch (err: any) {
    console.error('Admin data fetch error:', err);
    res.status(500).json({ success: false, message: 'Failed to load live admin data' });
  }
});

// 2. Withdrawal Action (Approve / Reject)
router.post('/withdrawals/:id/action', adminAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { action, note } = req.body;
    if (!['APPROVE', 'REJECT'].includes(action)) {
      res.status(400).json({ success: false, message: 'Invalid action' });
      return;
    }

    const result = await db.updateAdminWithdrawal(id, action as 'APPROVE' | 'REJECT', note);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 3. Add Task
router.post('/tasks/add', adminAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { title, category, rewardAmount, taskUrl, description, proofPlaceholder, instructions, estimatedMinutes } = req.body;
    if (!title || !rewardAmount) {
      res.status(400).json({ success: false, message: 'Title and reward amount required' });
      return;
    }

    const taskInstructions = Array.isArray(instructions) && instructions.length > 0
      ? instructions
      : [
          description || 'নির্দেশ অনুযায়ী কাজটি সম্পূর্ণ করুন।',
          proofPlaceholder ? `প্রমাণ হিসেবে সাবমিট করুন: ${proofPlaceholder}` : 'প্রমাণ সাবমিট করুন।',
        ];

    const newTask = {
      id: 'task_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      title: String(title).trim(),
      description: description || title,
      category: (category || 'TELEGRAM').toUpperCase(),
      rewardAmount: Number(rewardAmount),
      instructions: taskInstructions,
      proofPlaceholder: proofPlaceholder || 'প্রমাণ লিখুন',
      proofType: 'text' as const,
      active: true,
      totalCompleted: 0,
      estimatedMinutes: Number(estimatedMinutes) || 2,
      taskUrl: taskUrl ? String(taskUrl).trim() : '',
    };

    const result = await db.adminAddTask(newTask as any);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 3b. Action on User Task Proof Submission (Approve / Reject)
router.post('/tasks/proofs/:id/action', adminAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { action, reason } = req.body;
    if (!['APPROVED', 'REJECTED'].includes(action)) {
      res.status(400).json({ success: false, message: 'Invalid action. Must be APPROVED or REJECTED' });
      return;
    }

    const result = await db.adminUpdateTaskSubmission(id, action as 'APPROVED' | 'REJECTED', reason);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 4. Delete Task
router.delete('/tasks/:id', adminAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await db.adminDeleteTask(id);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 5. Add Ad
router.post('/ads/add', adminAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { title, sponsorName, rewardAmount, durationSeconds, thumbnail, category } = req.body;
    if (!title || !rewardAmount) {
      res.status(400).json({ success: false, message: 'Title and reward amount required' });
      return;
    }

    const newAd = {
      id: 'ad_' + Date.now(),
      title,
      description: 'Watch video advertisement to earn reward.',
      rewardAmount: Number(rewardAmount),
      durationSeconds: Number(durationSeconds) || 15,
      category: category || 'স্পনসর',
      thumbnail: thumbnail || 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=600&q=80',
      sponsorName: sponsorName || 'Partner Sponsor',
      active: true,
    };

    const result = await db.adminAddAd(newAd);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 6. Delete Ad
router.delete('/ads/:id', adminAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await db.adminDeleteAd(id);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 7. Modify User Balance
router.post('/users/:id/balance', adminAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { amount } = req.body;
    const result = await db.adminModifyUserBalance(id, Number(amount));
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 8. Toggle User Status (Ban / Active)
router.post('/users/:id/toggle-status', adminAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await db.adminToggleUserStatus(id);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 9. Update Settings
router.post('/settings', adminAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const result = await db.adminUpdateSettings(req.body);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
