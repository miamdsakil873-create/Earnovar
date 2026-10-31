import { Router, Response } from 'express';
import { db } from '../../../lib/db/db.ts';
import { authMiddleware, AuthenticatedRequest } from '../middleware/authMiddleware.ts';

const router = Router();

// Wallet summary
router.get('/summary', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = db.getUserById(req.user!.id);
    const settings = db.getSettings();
    const withdrawals = db.getUserWithdrawals(req.user!.id);
    const transactions = db.getUserTransactions(req.user!.id);

    res.json({
      success: true,
      balance: user?.balance || 0,
      totalEarned: user?.totalEarned || 0,
      totalWithdrawn: user?.totalWithdrawn || 0,
      minWithdrawal: settings.minWithdrawal,
      isWithdrawalOpen: settings.isWithdrawalOpen,
      paymentMethods: settings.paymentMethods,
      recentWithdrawals: withdrawals.slice(0, 10),
      recentTransactions: transactions.slice(0, 15),
    });
  } catch (err: any) {
    console.error('Wallet summary error:', err);
    res.status(500).json({ success: false, message: 'ওয়ালেট তথ্য লোড করা যায়নি।' });
  }
});

// Request withdrawal (bKash, Nagad, Rocket)
router.post('/withdraw', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { method, accountType, accountNumber, amount } = req.body;

    if (!method || !accountType || !accountNumber || !amount) {
      res.status(400).json({ success: false, message: 'সবগুলো ঘর সঠিকভাবে পূরণ করুন।' });
      return;
    }

    if (!['bKash', 'Nagad', 'Rocket'].includes(method)) {
      res.status(400).json({ success: false, message: 'অবৈধ পেমেন্ট মেথড।' });
      return;
    }

    if (!['Personal', 'Agent'].includes(accountType)) {
      res.status(400).json({ success: false, message: 'অবৈধ অ্যাকাউন্ট টাইপ।' });
      return;
    }

    const result = await db.requestWithdrawal({
      userId: req.user!.id,
      method,
      accountType,
      accountNumber,
      amount: Number(amount),
    });

    if (!result.success) {
      res.status(400).json(result);
      return;
    }

    res.json(result);
  } catch (err: any) {
    console.error('Withdrawal request error:', err);
    res.status(500).json({ success: false, message: 'উত্তোলন রিকোয়েস্ট পাঠাতে ব্যর্থ হয়েছে।' });
  }
});

// Full transactions history
router.get('/transactions', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  try {
    const transactions = db.getUserTransactions(req.user!.id);
    res.json({
      success: true,
      transactions,
    });
  } catch (err: any) {
    console.error('Transactions history error:', err);
    res.status(500).json({ success: false, message: 'লেনদেনের বিবরণ লোড করা যায়নি।' });
  }
});

// Full withdrawal requests history
router.get('/withdrawals', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  try {
    const withdrawals = db.getUserWithdrawals(req.user!.id);
    res.json({
      success: true,
      withdrawals,
    });
  } catch (err: any) {
    console.error('Withdrawals history error:', err);
    res.status(500).json({ success: false, message: 'উত্তোলনের বিবরণ লোড করা যায়নি।' });
  }
});

export default router;
