const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const prisma = require('../config/db');
const env = require('../config/env');

const hash = (t) => crypto.createHash('sha256').update(t).digest('hex');

function signAccessToken(user) {
  return jwt.sign({ sub: user.id, role: user.role }, env.jwtAccessSecret, {
    expiresIn: env.accessTtl,
  });
}

async function issueRefreshToken(userId) {
  const token = crypto.randomBytes(48).toString('hex');
  await prisma.refreshToken.create({
    data: {
      userId,
      tokenHash: hash(token),
      expiresAt: new Date(Date.now() + env.refreshTtlDays * 86400000),
    },
  });
  return token;
}

// One-time use: the old token is revoked and a new one is issued.
async function rotateRefreshToken(token) {
  const record = await prisma.refreshToken.findUnique({
    where: { tokenHash: hash(token) },
    include: { user: true },
  });
  if (!record || record.revokedAt || record.expiresAt < new Date()) return null;
  if (!record.user.isActive) return null;

  await prisma.refreshToken.update({
    where: { id: record.id },
    data: { revokedAt: new Date() },
  });
  return { user: record.user, refreshToken: await issueRefreshToken(record.userId) };
}

async function revokeRefreshToken(token) {
  await prisma.refreshToken.updateMany({
    where: { tokenHash: hash(token), revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

module.exports = { signAccessToken, issueRefreshToken, rotateRefreshToken, revokeRefreshToken };