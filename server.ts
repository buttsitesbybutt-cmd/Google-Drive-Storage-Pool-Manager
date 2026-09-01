import express from 'express';
import path from 'path';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import apiRouter from './src/server/routes';
import { CleanupService } from './src/server/cleanup';

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // JSON & URL-encoded parsing (exclude raw multipart streams which busboy handles in /api/files/upload)
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());

  // API Routes
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      service: 'Google Drive Storage Pool Manager',
      timestamp: new Date().toISOString(),
      zeroStoragePolicy: 'STRICT_STREAMING_PROXY',
    });
  });

  app.use('/api', apiRouter);

  // Catch unhandled /api/* routes so they ALWAYS return JSON 404 instead of returning index.html
  app.all('/api/*', (req, res) => {
    res.status(404).json({ error: `API endpoint not found: ${req.method} ${req.path}` });
  });

  // Global Error Handler for API routes
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (req.path.startsWith('/api')) {
      console.error('API Error:', err);
      res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
    } else {
      next(err);
    }
  });

  // Start periodic cleanup background routine
  CleanupService.startPeriodicCleanup();

  // Vite middleware for development vs static build for production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Google Drive Storage Pool Manager running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
