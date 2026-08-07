import 'dotenv/config';
import 'express-async-errors';
import express from 'express';
import cors from 'cors';
import { errorHandler } from './middleware/errorHandler';
import { authRateLimiter, apiRateLimiter } from './middleware/rateLimiter';
import { logger } from './utils/logger';

// Routes
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import exerciseRoutes from './routes/exercises';
import routineRoutes from './routes/routines';
import workoutRoutes from './routes/workouts';
import setRoutes from './routes/sets';
import analyticsRoutes from './routes/analytics';
import characterRoutes from './routes/characters';
import battleRoutes from './routes/battles';

// Cron Jobs
import { initCronJobs } from './services/cronService';

// node-cron doesn't await or wrap its callbacks — an unhandled rejection
// inside a cron job (or anywhere else outside the Express request cycle)
// would otherwise terminate the whole process by Node's default behavior,
// taking down the API for every user over one background job's bug.
process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled promise rejection', reason);
});
process.on('uncaughtException', (err) => {
  logger.error('Uncaught exception', err);
});

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
// Dev backend reachable from localhost, LAN IPs (phone testing), and native
// clients (no Origin header at all) — there's no fixed production origin to
// pin down, and auth uses Bearer tokens rather than cookies, so reflecting
// any origin here doesn't weaken anything.
app.use(cors({
  origin: true,
  credentials: true,
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use(apiRateLimiter);

// Routes
app.use('/api/auth', authRateLimiter, authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/exercises', exerciseRoutes);
app.use('/api/routines', routineRoutes);
app.use('/api/workouts', workoutRoutes);
app.use('/api/sets', setRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/characters', characterRoutes);
app.use('/api/battles', battleRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error Handler (debe ser último)
app.use(errorHandler);

// Start Server
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    logger.info(`Server running on port ${PORT}`);

    if (process.env.ENABLE_CRON_JOBS === 'true') {
      initCronJobs();
      logger.info('Cron jobs initialized');
    }
  });
}

export default app;
