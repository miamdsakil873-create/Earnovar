import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { db } from '../../../lib/db/db.ts';
import { User } from '../../../lib/db/types.ts';

const JWT_SECRET = process.env.JWT_SECRET || 'earn_watch_bot_super_secret_jwt_key_2026';

export interface AuthenticatedRequest extends Request {
  user?: User;
}

export function generateToken(user: User): string {
  return jwt.sign(
    {
      id: user.id,
      phone: user.phone,
      role: user.role,
    },
    JWT_SECRET,
    { expiresIn: '30d' }
  );
}

export function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ success: false, message: 'লগইন অনুমোদনের টোকেন পাওয়া যায়নি।' });
    return;
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string; phone: string; role: string };
    const user = db.getUserById(decoded.id);

    if (!user) {
      res.status(401).json({ success: false, message: 'ব্যবহারকারীর অ্যাকাউন্ট সক্রিয় নয়।' });
      return;
    }

    if (user.status === 'BANNED' || user.status === 'SUSPENDED') {
      res.status(403).json({ success: false, message: 'আপনার অ্যাকাউন্টটি স্থগিত রাখা হয়েছে।' });
      return;
    }

    req.user = user;
    next();
  } catch (err) {
    res.status(401).json({ success: false, message: 'টোকেনের মেয়াদ শেষ বা অবৈধ। অনুগ্রহ করে পুনরায় লগইন করুন।' });
  }
}
