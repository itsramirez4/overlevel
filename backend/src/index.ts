import 'dotenv/config';
import 'express-async-errors';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
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
app.use(helmet());

app.use(cors({
  origin: true,
  credentials: true,
}));

// Piped through the existing winston logger instead of writing straight to
// stdout, so request logs get the same timestamp/JSON formatting (and the
// same eventual destination) as everything else already logged. Silenced
// under Jest — nobody wants request-log noise interleaved with test output.
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined', { stream: { write: (message) => logger.info(message.trim()) } }));
}

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
  const server = app.listen(PORT, () => {
    logger.info(`Server running on port ${PORT}`);
  });

  const cronTasks = process.env.ENABLE_CRON_JOBS === 'true' ? initCronJobs() : [];
  if (cronTasks.length > 0) logger.info('Cron jobs initialized');

  // Without this, a deploy/restart (SIGTERM from the process manager) or a
  // Ctrl+C (SIGINT) kills in-flight requests mid-response instead of letting
  // them finish — server.close() stops accepting new connections but lets
  // existing ones complete first.
  const shutdown = (signal: string) => {
    logger.info(`${signal} received, shutting down gracefully`);
    cronTasks.forEach((task) => task.stop());
    server.close((err) => {
      if (err) {
        logger.error('Error during shutdown', err);
        process.exit(1);
      }
      logger.info('Server closed');
      process.exit(0);
    });
    // Belt-and-suspenders: if some connection never closes (e.g. a stuck
    // keep-alive), don't hang the deploy forever waiting for it.
    setTimeout(() => {
      logger.error('Forced shutdown after timeout');
      process.exit(1);
    }, 10000).unref();
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

export default app;
