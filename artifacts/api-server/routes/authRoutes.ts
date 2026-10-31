import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../../../lib/db/db.ts';
import { generateToken, authMiddleware, AuthenticatedRequest } from '../middleware/authMiddleware.ts';

const router = Router();

// Register new user
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { name, phone, email, password, referralCode } = req.body;

    if (!name || !phone || !password) {
      res.status(400).json({ success: false, message: 'নাম, মোবাইল নম্বর এবং পাসওয়ার্ড পূরণ করা আবশ্যক।' });
      return;
    }

    const cleanPhone = phone.trim().replace(/\s+/g, '');
    const bdPhoneRegex = /^01[3-9]\d{8}$/;
    if (!bdPhoneRegex.test(cleanPhone)) {
      res.status(400).json({ success: false, message: 'অনুগ্রহ করে সঠিক ১১ ডিজিটের বাংলাদেশি নম্বর লিখুন (যেমন: 01712345678)।' });
      return;
    }

    if (password.length < 6) {
      res.status(400).json({ success: false, message: 'পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।' });
      return;
    }

    const result = await db.createUser({
      name: name.trim(),
      phone: cleanPhone,
      email: email ? email.trim() : undefined,
      password: password,
      referralCodeInput: referralCode ? referralCode.trim() : undefined,
    });

    if (result.error) {
      res.status(400).json({ success: false, message: result.error });
      return;
    }

    const token = generateToken(result.user);
    res.json({
      success: true,
      message: 'রেজিস্ট্রেশন সফল হয়েছে! ৳১০ স্বাগতম বোনাস আপনার অ্যাকাউন্টে যোগ হয়েছে।',
      token,
      user: {
        id: result.user.id,
        name: result.user.name,
        phone: result.user.phone,
        email: result.user.email,
        balance: result.user.balance,
        totalEarned: result.user.totalEarned,
        totalWithdrawn: result.user.totalWithdrawn,
        referralCode: result.user.referralCode,
        status: result.user.status,
        role: result.user.role,
        createdAt: result.user.createdAt,
      },
    });
  } catch (err: any) {
    console.error('Registration error:', err);
    res.status(500).json({ success: false, message: 'সার্ভারে সমস্যা হয়েছে। অনুগ্রহ করে কিছুক্ষণ পর আবার চেষ্টা করুন।' });
  }
});

// Login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
      res.status(400).json({ success: false, message: 'মোবাইল নম্বর ও পাসওয়ার্ড প্রদান করুন।' });
      return;
    }

    const cleanIdentifier = identifier.trim().replace(/\s+/g, '');
    const user = db.getUserByPhone(cleanIdentifier);

    if (!user) {
      res.status(400).json({ success: false, message: 'এই নম্বরে কোনো অ্যাকাউন্ট পাওয়া যায়নি। সঠিক নম্বর দিন অথবা নতুন অ্যাকাউন্ট তৈরি করুন।' });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      res.status(400).json({ success: false, message: 'পাসওয়ার্ড সঠিক নয়। অনুগ্রহ করে পুনরায় চেষ্টা করুন।' });
      return;
    }

    if (user.status === 'BANNED' || user.status === 'SUSPENDED') {
      res.status(403).json({ success: false, message: 'আপনার অ্যাকাউন্টটি স্থগিত রাখা হয়েছে। সাপোর্টে যোগাযোগ করুন।' });
      return;
    }

    const token = generateToken(user);
    res.json({
      success: true,
      message: 'লগইন সফল হয়েছে!',
      token,
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
    });
  } catch (err: any) {
    console.error('Login error:', err);
    res.status(500).json({ success: false, message: 'লগইন ব্যর্থ হয়েছে। সার্ভার এরর।' });
  }
});

// Current user verification
router.get('/me', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  res.json({
    success: true,
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
  });
});

export default router;
