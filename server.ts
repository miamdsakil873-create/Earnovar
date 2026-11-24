import express from 'express';
import path from 'path';
import fs from 'fs';
import { exec } from 'child_process';
import util from 'util';
import { fileURLToPath } from 'url';
import authRoutes from './artifacts/api-server/routes/authRoutes.ts';
import userRoutes from './artifacts/api-server/routes/userRoutes.ts';
import adsRoutes from './artifacts/api-server/routes/adsRoutes.ts';
import tasksRoutes from './artifacts/api-server/routes/tasksRoutes.ts';
import walletRoutes from './artifacts/api-server/routes/walletRoutes.ts';
import referralRoutes from './artifacts/api-server/routes/referralRoutes.ts';
import settingsRoutes from './artifacts/api-server/routes/settingsRoutes.ts';
import adminRoutes from './artifacts/api-server/routes/adminRoutes.ts';

const execPromise = util.promisify(exec);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Enable CORS for API and Admin requests (enables downloaded standalone admin.html to connect from any device)
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, x-admin-pin');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
    return;
  }
  next();
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/ads', adsRoutes);
app.use('/api/tasks', tasksRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/referrals', referralRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/admin', adminRoutes);

// Health check endpoint
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', app: 'Earnova', timestamp: new Date().toISOString() });
});

// Admin Panel Direct & Download routes
const serveAdminWithHost = (req: express.Request, res: express.Response, isDownload: boolean = false) => {
  try {
    let adminPath = path.resolve(__dirname, 'public', 'admin.html');
    if (!fs.existsSync(adminPath)) {
      adminPath = path.resolve(__dirname, 'admin.html');
    }
    let content = fs.readFileSync(adminPath, 'utf-8');
    const host = req.get('host') || 'ais-dev-b3ys7arbac3o37i2wsl7ez-176341157454.asia-southeast1.run.app';
    const proto = (req.headers['x-forwarded-proto'] as string) || (req.secure ? 'https' : 'http');
    const serverUrl = process.env.APP_URL || `${proto}://${host}`;
    content = content.replace(/__SERVER_URL_PLACEHOLDER__/g, serverUrl);

    if (isDownload) {
      res.setHeader('Content-Disposition', 'attachment; filename="earnova-admin.html"');
    }
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(content);
  } catch (err) {
    const fallbackPath = fs.existsSync(path.resolve(__dirname, 'admin.html'))
      ? path.resolve(__dirname, 'admin.html')
      : path.resolve(__dirname, 'public', 'admin.html');
    if (isDownload) {
      res.download(fallbackPath, 'earnova-admin.html');
    } else {
      res.sendFile(fallbackPath);
    }
  }
};

app.get('/admin', (_req, res) => res.redirect('/#admin'));
app.get('/admin.html', (req, res) => serveAdminWithHost(req, res, false));
app.get('/download-admin', (req, res) => serveAdminWithHost(req, res, true));
app.get('/download-admin.html', (req, res) => serveAdminWithHost(req, res, true));
app.get('/download', (req, res) => serveAdminWithHost(req, res, true));
app.get('/api/admin/download', (req, res) => serveAdminWithHost(req, res, true));
app.get('/api/admin/raw', (req, res) => serveAdminWithHost(req, res, false));

async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    // In dev mode, mount Vite middleware
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // In production, serve static dist assets
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Earn-Watch-Bot] Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal error starting server:', err);
  process.exit(1);
});
