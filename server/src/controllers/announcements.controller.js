const prisma = require('../config/db');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { getViewableCourse } = require('../utils/courseAccess');

const POSTER_ROLES = ['ADMIN', 'REP', 'LECTURER'];
const PIN_ROLES = ['ADMIN', 'LECTURER'];

const include = {
  author: { select: { id: true, name: true, role: true } },
  course: { select: { id: true, code: true, title: true, lecturerId: true } },
};

// Which courses can this user read announcements for?
function visibleCourses(user) {
  const base = { universityId: user.universityId };
  if (user.role === 'ADMIN') return base;
  if (user.role === 'LECTURER') return { ...base, lecturerId: user.id };
  return { ...base, enrollments: { some: { userId: user.id } } }; // STUDENT, REP
}

exports.list = asyncHandler(async (req, res) => {
  const { courseId, scope } = req.query;
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));
  const courses = visibleCourses(req.user);

  let access;
  if (courseId) access = { courseId, course: courses };
  else if (scope === 'campus') access = { courseId: null };
  else if (scope === 'courses') access = { course: courses };
  else access = { OR: [{ courseId: null }, { course: courses }] };

  const where = { universityId: req.user.universityId, ...access };

  const [total, announcements] = await prisma.$transaction([
    prisma.announcement.count({ where }),
    prisma.announcement.findMany({
      where,
      include,
      orderBy: [{ pinned: 'desc' }, { createdAt: 'desc' }],
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  res.json({ announcements, page, limit, total });
});

// Loads the announcement and checks the caller is allowed to see it.
exports.load = asyncHandler(async (req, res, next) => {
  const announcement = await prisma.announcement.findFirst({
    where: { id: req.params.announcementId, universityId: req.user.universityId },
    include,
  });
  if (!announcement) throw ApiError.notFound('Announcement not found');
  if (announcement.courseId) await getViewableCourse(req.user, announcement.courseId);
  req.announcement = announcement;
  next();
});

exports.requireManage = (req, res, next) => {
  const { user, announcement: a } = req;
  const ok =
    user.role === 'ADMIN' ||
    (POSTER_ROLES.includes(user.role) && a.authorId === user.id) ||
    (user.role === 'LECTURER' && a.course?.lecturerId === user.id);
  if (!ok) return next(ApiError.forbidden('You cannot change this announcement'));
  next();
};

exports.getOne = (req, res) => res.json({ announcement: req.announcement });

exports.create = asyncHandler(async (req, res) => {
  const { title, body, courseId = null, pinned = false } = req.body;
  const user = req.user;

  if (pinned && !PIN_ROLES.includes(user.role)) {
    throw ApiError.forbidden('Only lecturers and admins can pin announcements');
  }

  if (courseId === null) {
    if (!['ADMIN', 'REP'].includes(user.role)) {
      throw ApiError.forbidden('Only admins and student reps can post campus-wide announcements');
    }
  } else {
    const course = await prisma.course.findFirst({
      where: { id: courseId, universityId: user.universityId },
      select: { lecturerId: true, enrollments: { where: { userId: user.id }, select: { id: true } } },
    });
    if (!course) throw ApiError.notFound('Course not found');

    const allowed =
      user.role === 'ADMIN' ||
      (user.role === 'LECTURER' && course.lecturerId === user.id) ||
      (user.role === 'REP' && course.enrollments.length > 0);
    if (!allowed) throw ApiError.forbidden('You cannot post to this course');
  }

  const announcement = await prisma.announcement.create({
    data: { title, body, pinned, courseId, authorId: user.id, universityId: user.universityId },
    include,
  });
  res.status(201).json({ announcement });
});

exports.update = asyncHandler(async (req, res) => {
  if (req.body.pinned !== undefined && !PIN_ROLES.includes(req.user.role)) {
    throw ApiError.forbidden('Only lecturers and admins can pin announcements');
  }
  const announcement = await prisma.announcement.update({
    where: { id: req.announcement.id },
    data: req.body,
    include,
  });
  res.json({ announcement });
});

exports.remove = asyncHandler(async (req, res) => {
  await prisma.announcement.delete({ where: { id: req.announcement.id } });
  res.status(204).end();
});