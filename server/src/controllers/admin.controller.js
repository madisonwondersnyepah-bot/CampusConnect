const bcrypt = require('bcryptjs');
const prisma = require('../config/db');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

const userSelect = {
  id: true,
  email: true,
  name: true,
  role: true,
  studentNumber: true,
  isActive: true,
  createdAt: true,
};

async function findUserOr404(userId, universityId) {
  const user = await prisma.user.findFirst({ where: { id: userId, universityId }, select: userSelect });
  if (!user) throw ApiError.notFound('User not found');
  return user;
}

// How many OTHER active admins exist? Used to protect the last one.
const otherActiveAdmins = (universityId, excludeId) =>
  prisma.user.count({
    where: { universityId, role: 'ADMIN', isActive: true, id: { not: excludeId } },
  });

// ───────── Dashboard ─────────
exports.stats = asyncHandler(async (req, res) => {
  const universityId = req.user.universityId;
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 86400000);

  const [
    usersByRole, activeUsers, newUsers, recentUsers,
    courses, coursesWithoutLecturer, enrollments,
    assignments, upcomingAssignments,
    announcements, upcomingEvents, groups, notes,
  ] = await Promise.all([
    prisma.user.groupBy({ by: ['role'], where: { universityId }, _count: { _all: true } }),
    prisma.user.count({ where: { universityId, isActive: true } }),
    prisma.user.count({ where: { universityId, createdAt: { gte: weekAgo } } }),
    prisma.user.findMany({
      where: { universityId },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
    prisma.course.count({ where: { universityId } }),
    prisma.course.count({ where: { universityId, lecturerId: null } }),
    prisma.enrollment.count({ where: { course: { universityId } } }),
    prisma.assignment.count({ where: { course: { universityId } } }),
    prisma.assignment.count({ where: { course: { universityId }, dueAt: { gte: now } } }),
    prisma.announcement.count({ where: { universityId } }),
    prisma.event.count({
      where: {
        universityId,
        OR: [{ endsAt: { gte: now } }, { endsAt: null, startsAt: { gte: now } }],
      },
    }),
    prisma.studyGroup.count({ where: { owner: { universityId } } }),
    prisma.note.count({ where: { author: { universityId } } }),
  ]);

  const byRole = { STUDENT: 0, REP: 0, LECTURER: 0, ADMIN: 0 };
  let total = 0;
  for (const row of usersByRole) {
    byRole[row.role] = row._count._all;
    total += row._count._all;
  }

  res.json({
    users: { total, active: activeUsers, inactive: total - activeUsers, byRole, newThisWeek: newUsers },
    courses: { total: courses, withoutLecturer: coursesWithoutLecturer, enrollments },
    assignments: { total: assignments, upcoming: upcomingAssignments },
    content: { announcements, upcomingEvents, studyGroups: groups, notes },
    recentUsers,
  });
});

// ───────── Users ─────────
exports.listUsers = asyncHandler(async (req, res) => {
  const { role, active, search } = req.query;
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 25));

  const where = { universityId: req.user.universityId };
  if (role) where.role = role;
  if (active) where.isActive = active === 'true';
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
      { studentNumber: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [total, users] = await prisma.$transaction([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      select: userSelect,
      orderBy: [{ role: 'asc' }, { name: 'asc' }],
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  res.json({ users, page, limit, total });
});

exports.getUser = asyncHandler(async (req, res) => {
  const user = await prisma.user.findFirst({
    where: { id: req.params.userId, universityId: req.user.universityId },
    select: {
      ...userSelect,
      _count: { select: { enrollments: true, taughtCourses: true, ownedGroups: true, notes: true } },
      taughtCourses: { select: { id: true, code: true, title: true, semester: true } },
    },
  });
  if (!user) throw ApiError.notFound('User not found');
  res.json({ user });
});

exports.createUser = asyncHandler(async (req, res) => {
  const { name, email, password, role, studentNumber } = req.body;

  const exists = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (exists) throw ApiError.conflict('Email already registered');

  const user = await prisma.user.create({
    data: {
      name,
      email,
      role,
      studentNumber,
      universityId: req.user.universityId,
      passwordHash: await bcrypt.hash(password, 12),
    },
    select: userSelect,
  });
  res.status(201).json({ user });
});

exports.updateUser = asyncHandler(async (req, res) => {
  const target = await findUserOr404(req.params.userId, req.user.universityId);
  const { role, isActive } = req.body;

  const roleChanging = role !== undefined && role !== target.role;
  const deactivating = isActive === false && target.isActive;

  // Admins can't lock themselves out.
  if (target.id === req.user.id && (roleChanging || deactivating)) {
    throw ApiError.forbidden('You cannot change your own role or deactivate your own account');
  }

  // The last active admin must always remain.
  const losingAdmin = target.role === 'ADMIN' && target.isActive && (roleChanging || deactivating);
  if (losingAdmin && (await otherActiveAdmins(req.user.universityId, target.id)) === 0) {
    throw ApiError.conflict('This is the only active admin. Promote another admin first.');
  }

  const ops = [prisma.user.update({ where: { id: target.id }, data: req.body, select: userSelect })];

  // A former lecturer can no longer be assigned to courses.
  const unassigning = roleChanging && target.role === 'LECTURER';
  if (unassigning) {
    ops.push(prisma.course.updateMany({ where: { lecturerId: target.id }, data: { lecturerId: null } }));
  }

  // Deactivated users are signed out everywhere.
  if (deactivating) {
    ops.push(
      prisma.refreshToken.updateMany({
        where: { userId: target.id, revokedAt: null },
        data: { revokedAt: new Date() },
      })
    );
  }

  const results = await prisma.$transaction(ops);
  const body = { user: results[0] };
  if (unassigning) body.coursesUnassigned = results[1].count;
  res.json(body);
});

exports.resetPassword = asyncHandler(async (req, res) => {
  const target = await findUserOr404(req.params.userId, req.user.universityId);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: target.id },
      data: { passwordHash: await bcrypt.hash(req.body.newPassword, 12) },
    }),
    prisma.refreshToken.updateMany({
      where: { userId: target.id, revokedAt: null },
      data: { revokedAt: new Date() },
    }),
  ]);
  res.status(204).end();
});