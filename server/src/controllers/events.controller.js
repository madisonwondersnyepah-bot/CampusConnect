const prisma = require('../config/db');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

const POSTER_ROLES = ['ADMIN', 'REP', 'LECTURER'];
const include = { createdBy: { select: { id: true, name: true, role: true } } };

exports.load = asyncHandler(async (req, res, next) => {
  const event = await prisma.event.findFirst({
    where: { id: req.params.eventId, universityId: req.user.universityId },
    include,
  });
  if (!event) throw ApiError.notFound('Event not found');
  req.event = event;
  next();
});

exports.requireManage = (req, res, next) => {
  const { user, event } = req;
  const ok = user.role === 'ADMIN' || (POSTER_ROLES.includes(user.role) && event.createdById === user.id);
  if (!ok) return next(ApiError.forbidden('Only the creator or an admin can change this event'));
  next();
};

// Default: upcoming. ?past=true: finished events. ?from=&to=: a date range (calendar views).
exports.list = asyncHandler(async (req, res) => {
  const { past, from, to } = req.query;
  const now = new Date();
  const where = { universityId: req.user.universityId };
  let orderBy = { startsAt: 'asc' };

  if (from || to) {
    where.startsAt = {};
    if (from) where.startsAt.gte = new Date(from);
    if (to) where.startsAt.lte = new Date(to);
  } else if (past === 'true') {
    where.OR = [{ endsAt: { lt: now } }, { endsAt: null, startsAt: { lt: now } }];
    orderBy = { startsAt: 'desc' };
  } else {
    where.OR = [{ endsAt: { gte: now } }, { endsAt: null, startsAt: { gte: now } }];
  }

  const events = await prisma.event.findMany({ where, include, orderBy, take: 200 });
  res.json({ events });
});

exports.getOne = (req, res) => res.json({ event: req.event });

exports.create = asyncHandler(async (req, res) => {
  const event = await prisma.event.create({
    data: { ...req.body, universityId: req.user.universityId, createdById: req.user.id },
    include,
  });
  res.status(201).json({ event });
});

exports.update = asyncHandler(async (req, res) => {
  const merged = { ...req.event, ...req.body };
  if (merged.endsAt && merged.endsAt <= merged.startsAt) {
    throw ApiError.badRequest('endsAt must be after startsAt');
  }
  const event = await prisma.event.update({ where: { id: req.event.id }, data: req.body, include });
  res.json({ event });
});

exports.remove = asyncHandler(async (req, res) => {
  await prisma.event.delete({ where: { id: req.event.id } });
  res.status(204).end();
});