import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { db } from '../../../lib/db/db.ts';
import { authMiddleware, AuthenticatedRequest } from '../middleware/authMiddleware.ts';

const JWT_SECRET = process.env.JWT_SECRET || 'earn_watch_bot_super_secret_jwt_key_2026';
const router = Router();

// Get available tasks (Publicly accessible, attaches user submission status if logged in)
router.get('/list', (req: Request, res: Response) => {
  try {
    const tasks = db.getTasks();
    let mySubmissions: any[] = [];

    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      try {
        const decoded = jwt.verify(token, JWT_SECRET) as { id: string };
        if (decoded && decoded.id) {
          mySubmissions = db.getUserSubmissions(decoded.id);
        }
      } catch (e) {
        // Token expired or invalid, keep user as guest
      }
    }

    // Map each task with user submission status
    const tasksWithStatus = tasks.map((t) => {
      const sub = mySubmissions.find((s) => s.taskId === t.id);
      return {
        ...t,
        submissionStatus: sub ? sub.status : null,
        submittedAt: sub ? sub.submittedAt : null,
      };
    });

    res.json({
      success: true,
      tasks: tasksWithStatus,
    });
  } catch (err: any) {
    console.error('Tasks list error:', err);
    res.status(500).json({ success: false, message: 'টাস্ক তালিকা লোড করা যায়নি।' });
  }
});

// Submit proof for a task
router.post('/submit', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { taskId, proofData } = req.body;
    if (!taskId || !proofData) {
      res.status(400).json({ success: false, message: 'টাস্ক আইডি এবং প্রমাণ তথ্য প্রদান করুন।' });
      return;
    }

    const result = await db.submitTaskProof(req.user!.id, taskId, proofData);
    if (!result.success) {
      res.status(400).json(result);
      return;
    }

    res.json(result);
  } catch (err: any) {
    console.error('Submit task proof error:', err);
    res.status(500).json({ success: false, message: 'প্রমাণ জমা দেওয়া ব্যর্থ হয়েছে।' });
  }
});

// Get user's own task submission history (returns empty array if not logged in or account inactive)
router.get('/my-submissions', (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.json({ success: true, submissions: [] });
      return;
    }
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { id: string };
      if (decoded && decoded.id) {
        const user = db.getUserById(decoded.id);
        if (user && user.status !== 'BANNED' && user.status !== 'SUSPENDED') {
          const submissions = db.getUserSubmissions(decoded.id);
          res.json({ success: true, submissions });
          return;
        }
      }
    } catch (e) {
      // Invalid or expired token
    }
    res.json({ success: true, submissions: [] });
  } catch (err: any) {
    console.error('My submissions error:', err);
    res.json({ success: true, submissions: [] });
  }
});

export default router;
