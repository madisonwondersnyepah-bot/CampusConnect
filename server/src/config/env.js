require('dotenv').config();

for (const key of ['DATABASE_URL', 'JWT_ACCESS_SECRET']) {
  if (!process.env[key]) throw new Error(`Missing env var: ${key}`);
}

module.exports = {
  port: process.env.PORT || 5000,
  isProd: process.env.NODE_ENV === 'production',
  jwtAccessSecret: process.env.JWT_ACCESS_SECRET,
  accessTtl: '15m',
  refreshTtlDays: 7,
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
};