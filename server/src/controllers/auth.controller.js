const bcrypt = require('bcryptjs');
const prisma = require('../config/db');
const env = require('../config/env');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const tokens = require('../services/token.service');

const COOKIE = 'refreshToken';
const cookieOpts = {
  httpOnly: true,
  secure: env.isProd,
  sameSite: env.isProd ? 'none' : 'lax', // 'none' needed when client and API are on different domains
  maxAge: env.refreshTtlDays * 86400000,
  path: '/api/auth',
};

const publicUser = ({ passwordHash, ...rest }) => rest;

exports.register = asyncHandler(async (req, res) => {
  const { name, email, password, universityId, studentNumber } = req.body;

  const university = await prisma.university.findUnique({ where: { id: universityId } });
  if (!university) throw ApiError.badRequest('Unknown university');

  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) throw ApiError.conflict('Email already registered');

  // Self-registration is ALWAYS a student. REP/LECTURER/ADMIN are granted by an admin.
  const user = await prisma.user.create({
    data: {
      name, email, universityId, studentNumber,
      passwordHash: await bcrypt.hash(password, 12),
      role: 'STUDENT',
    },
  });

  const refreshToken = await tokens.issueRefreshToken(user.id);
  res.cookie(COOKIE, refreshToken, cookieOpts);
  res.status(201).json({ user: publicUser(user), accessToken: tokens.signAccessToken(user) });
});

exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await prisma.user.findUnique({ where: { email } });

  const ok = user && user.isActive && (await bcrypt.compare(password, user.passwordHash));
  if (!ok) throw ApiError.unauthorized('Invalid email or password');

  const refreshToken = await tokens.issueRefreshToken(user.id);
  res.cookie(COOKIE, refreshToken, cookieOpts);
  res.json({ user: publicUser(user), accessToken: tokens.signAccessToken(user) });
});

exports.refresh = asyncHandler(async (req, res) => {
  const token = req.cookies[COOKIE];
  if (!token) throw ApiError.unauthorized('No refresh token');

  const result = await tokens.rotateRefreshToken(token);
  if (!result) {
    res.clearCookie(COOKIE, cookieOpts);
    throw ApiError.unauthorized('Session expired, please log in again');
  }

  res.cookie(COOKIE, result.refreshToken, cookieOpts);
  res.json({ user: publicUser(result.user), accessToken: tokens.signAccessToken(result.user) });
});

exports.logout = asyncHandler(async (req, res) => {
  const token = req.cookies[COOKIE];
  if (token) await tokens.revokeRefreshToken(token);
  res.clearCookie(COOKIE, cookieOpts);
  res.status(204).end();
});

exports.me = asyncHandler(async (req, res) => {
  res.json({ user: req.user });
});

exports.universities = asyncHandler(async (req, res) => {
  const universities = await prisma.university.findMany({
    select: { id: true, name: true, city: true },
    orderBy: { name: 'asc' },
  });
  res.json({ universities });
});