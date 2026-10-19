const prisma = require('../config/db');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { getViewableCourse } = require('../utils/courseAccess');

const include = (userId) => ({
  course: { select: { id: true, code: true, title: true } },
  owner: { select: { id: true, name: true } },
  _count: { select: { members: true } },
  members: { where: { userId }, select: { role: true } }, // only the caller's own membership
});

function shape(group) {
  const { members, _count, ...rest } = group;
  return { ...rest, memberCount: _count.members, myRole: members[0]?.role ?? null };
}

// Loads the group. Private groups look like they don't exist unless you're a member (or ADMIN).
exports.load = asyncHandler(async (req, res, next) => {
  const group = await prisma.studyGroup.findFirst({
    where: { id: req.params.groupId, owner: { universityId: req.user.universityId } },
    include: include(req.user.id),
  });
  if (!group) throw ApiError.notFound('Study group not found');

  const myRole = group.members[0]?.role ?? null;
  if (group.isPrivate && !myRole && req.user.role !== 'ADMIN') {
    throw ApiError.notFound('Study group not found');
  }
  req.group = group;
  req.myRole = myRole;
  next();
});

exports.requireOwner = (req, res, next) => {
  if (req.myRole !== 'OWNER' && req.user.role !== 'ADMIN') {
    return next(ApiError.forbidden('Only the group owner can do this'));
  }
  next();
};

exports.requireMember = (req, res, next) => {
  if (!req.myRole) return next(ApiError.forbidden('Join this group to access its notes'));
  next();
};

exports.list = asyncHandler(async (req, res) => {
  const { id: userId, universityId } = req.user;
  const { mine, courseId, search } = req.query;

  const where = { owner: { universityId } };
  if (mine === 'true') where.members = { some: { userId } };
  else where.OR = [{ isPrivate: false }, { members: { some: { userId } } }];
  if (courseId) where.courseId = courseId;
  if (search) {
    where.AND = [
      {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ],
      },
    ];
  }

  const groups = await prisma.studyGroup.findMany({
    where,
    include: include(userId),
    orderBy: { createdAt: 'desc' },
    take: 100,
  });
  res.json({ groups: groups.map(shape) });
});

exports.getOne = asyncHandler(async (req, res) => {
  const group = shape(req.group);
  const body = { group };

  // Only members (and admins) can see who is in the group.
  if (req.myRole || req.user.role === 'ADMIN') {
    const rows = await prisma.groupMember.findMany({
      where: { groupId: group.id },
      select: { role: true, joinedAt: true, user: { select: { id: true, name: true } } },
      orderBy: { joinedAt: 'asc' },
    });
    body.members = rows.map((m) => ({ ...m.user, role: m.role, joinedAt: m.joinedAt }));
  }
  res.json(body);
});

exports.create = asyncHandler(async (req, res) => {
  const { name, description, courseId, isPrivate } = req.body;
  if (courseId) await getViewableCourse(req.user, courseId); // must be your course

  const group = await prisma.studyGroup.create({
    data: {
      name,
      description,
      courseId: courseId ?? null,
      isPrivate: isPrivate ?? false,
      ownerId: req.user.id,
      members: { create: { userId: req.user.id, role: 'OWNER' } },
    },
    include: include(req.user.id),
  });
  res.status(201).json({ group: shape(group) });
});

exports.update = asyncHandler(async (req, res) => {
  const group = await prisma.studyGroup.update({
    where: { id: req.group.id },
    data: req.body,
    include: include(req.user.id),
  });
  res.json({ group: shape(group) });
});

exports.remove = asyncHandler(async (req, res) => {
  // Members and the group's shared notes are removed by cascade.
  await prisma.studyGroup.delete({ where: { id: req.group.id } });
  res.status(204).end();
});

// ───────── Membership ─────────
exports.join = asyncHandler(async (req, res) => {
  if (req.myRole) throw ApiError.conflict('You are already a member of this group');
  if (req.group.isPrivate) throw ApiError.forbidden('This group is private. Ask the owner to add you.');

  await prisma.groupMember.create({ data: { groupId: req.group.id, userId: req.user.id } });
  res.status(201).json({ joined: true });
});

exports.leave = asyncHandler(async (req, res) => {
  if (!req.myRole) throw ApiError.notFound('You are not a member of this group');
  if (req.myRole === 'OWNER') {
    throw ApiError.badRequest('Owners cannot leave their group. Delete the group instead.');
  }
  await prisma.groupMember.deleteMany({ where: { groupId: req.group.id, userId: req.user.id } });
  res.status(204).end();
});

exports.addMember = asyncHandler(async (req, res) => {
  const user = await prisma.user.findFirst({
    where: { email: req.body.email, universityId: req.user.universityId, isActive: true },
    select: { id: true, name: true, email: true },
  });
  if (!user) throw ApiError.notFound('No active user with that email at your university');

  const existing = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId: req.group.id, userId: user.id } },
  });
  if (existing) throw ApiError.conflict('That user is already in the group');

  await prisma.groupMember.create({ data: { groupId: req.group.id, userId: user.id } });
  res.status(201).json({ member: user });
});

exports.removeMember = asyncHandler(async (req, res) => {
  if (req.params.userId === req.group.ownerId) {
    throw ApiError.badRequest('The owner cannot be removed');
  }
  const { count } = await prisma.groupMember.deleteMany({
    where: { groupId: req.group.id, userId: req.params.userId },
  });
  if (count === 0) throw ApiError.notFound('That user is not in the group');
  res.status(204).end();
});