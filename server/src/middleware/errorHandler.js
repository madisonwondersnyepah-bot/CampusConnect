const env = require('../config/env');

module.exports = (err, req, res, next) => {
  if (err.code === 'P2002') {
    return res.status(409).json({ error: 'A record with that value already exists' });
  }
  const status = err.status || 500;
  if (status === 500) console.error(err);
  res.status(status).json({
    error: status === 500 && env.isProd ? 'Internal server error' : err.message,
    ...(err.details && { details: err.details }),
  });
};