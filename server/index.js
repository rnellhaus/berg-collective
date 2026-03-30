import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import { initDatabase } from './db/init.js';
import authRoutes from './routes/auth.js';
import mediaRoutes from './routes/media.js';
import pagesRoutes from './routes/pages.js';
import eventsRoutes from './routes/events.js';
import usersRoutes from './routes/users.js';
import formsRoutes from './routes/forms.js';
import documentsRoutes from './routes/documents.js';

const app = express();

// Initialize database (async — resolves on first request in serverless)
const dbReady = initDatabase().catch(err => {
  console.error('Database init failed:', err);
});

app.use(async (req, res, next) => {
  await dbReady;
  next();
});

// CORS — dynamic origin for production vs dev
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (same-origin, server-to-server)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(null, true); // Allow all in production since API and frontend share domain
    }
  },
  credentials: true,
}));

app.use(express.json());
app.use(cookieParser());

app.use('/api/auth', authRoutes);
app.use('/api/media', mediaRoutes);
app.use('/api/pages', pagesRoutes);
app.use('/api/events', eventsRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/forms', formsRoutes);
app.use('/api/documents', documentsRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Only listen when running locally (not on Vercel)
if (!process.env.VERCEL) {
  const PORT = process.env.PORT || 3001;
  app.listen(PORT, () => {
    console.log(`BERG CMS server running on http://localhost:${PORT}`);
  });
}

export default app;
