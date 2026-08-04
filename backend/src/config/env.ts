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

  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'),
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  },

  cron: {
    enabled: process.env.ENABLE_CRON_JOBS === 'true',
  },
};
