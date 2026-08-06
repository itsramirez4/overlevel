export const config = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3001'),
  apiUrl: process.env.API_URL || 'http://localhost:3001',

  supabase: {
    url: process.env.SUPABASE_URL || '',
    anonKey: process.env.SUPABASE_ANON_KEY || '',
    serviceKey: process.env.SUPABASE_SERVICE_KEY || '',
  },

  jwt: {
    secret: process.env.JWT_SECRET || 'dev-secret',
    expireAccess: process.env.JWT_EXPIRE_ACCESS || '15m',
    expireRefresh: process.env.JWT_EXPIRE_REFRESH || '7d',
  },

  // Kept strict for auth (brute-force protection matters there even for a
  // single-user app). Everything else sits behind a valid JWT already and
  // a single active workout-logging session can legitimately fire dozens
  // of requests in a few minutes, so it gets a much more generous cap.
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'),
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  },
  apiRateLimit: {
    maxRequests: parseInt(process.env.API_RATE_LIMIT_MAX_REQUESTS || '2000'),
  },

  cron: {
    enabled: process.env.ENABLE_CRON_JOBS === 'true',
  },
};
