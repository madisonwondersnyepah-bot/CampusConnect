const jwt = require('jsonwebtoken');
const prisma = require('../config/db');
const env = require('../config/env');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

// Verifies the access token, then loads the CURRENT user from the DB so that
// role changes and deactivations take effect immediately, not at token expiry.
const authenticate = asyncHandler(async (req, res, next) => {
  const [scheme, token] = (req.headers.authorization || '').split(' ');
  if (scheme !== 'Bearer' || !token) throw ApiError.unauthorized('Missing access token');

  let payload;
  try {
    payload = jwt.verify(token, env.jwtAccessSecret);
  } catch {
    throw ApiError.unauthorized('Invalid or expired token');
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    select: { id: true, email: true, name: true, role: true, universityId: true, isActive: true },
  });
  if (!user || !user.isActive) throw ApiError.unauthorized('Account not available');

  req.user = user;
  next();
});

module.exports = { authenticate };