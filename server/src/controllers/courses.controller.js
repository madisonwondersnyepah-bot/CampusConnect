const prisma = require('../config/db');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

// A lecturer assigned to a course must be an active LECTURER at the same university.
async function assertLecturer(lecturerId, universityId) {
  if (!lecturerId) return;
  const lecturer = await prisma.user.findFirst({
    where: { id: lecturerId, universityId, role: 'LECTURER', isActive: true },
    select: { id: true },
  });
  if (!lecturer) {
    throw ApiError.badRequest('lecturerId must be an active lecturer at your university');
  }
}

// Finds a course, but only inside the caller's university.
async function findCourseOr404(courseId, universityId) {
  const course = await prisma.course.findFirst({
    where: { id: courseId, universityId },
    select: { id: true },
  });
  if (!course) throw ApiError.notFound('Course not found');
  return course;
}

function shape(course) {
  const { enrollments, _count, ...rest } = course;
  return {
    ...rest,
    enrolledCount: _count.enrollments,
    isEnrolled: enrollments.length > 0,
  };
}

const courseInclude = (userId) => ({
  lecturer: { select: { id: true, name: true, email: true } },
  _count: { select: { enrollments: true } },
  enrollments: { where: { userId }, select: { id: true } }, // used only to compute isEnrolled
});

exports.list = asyncHandler(async (req, res) => {
  const { mine, search } = req.query;
  const { id: userId, role, universityId } = req.user;

  const where = { universityId };

  if (mine === 'true') {
    if (role === 'LECTURER') where.lecturerId = userId;
    else where.enrollments = { some: { userId } };
  }

  if (search) {
    where.OR = [
      { code: { contains: search, mode: 'insensitive' } },
      { title: { contains: search, mode: 'insensitive' } },
    ];
  }

  const courses = await prisma.course.findMany({
    where,
    include: courseInclude(userId),
    orderBy: [{ semester: 'desc' }, { code: 'asc' }],
  });

  res.json({ courses: courses.map(shape) });
});

exports.getOne = asyncHandler(async (req, res) => {
  const course = await prisma.course.findFirst({
    where: { id: req.params.courseId, universityId: req.user.universityId },
    include: {
      ...courseInclude(req.user.id),
      slots: { orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }] },
    },
  });
  if (!course) throw ApiError.notFound('Course not found');
  res.json({ course: shape(course) });
});

exports.create = asyncHandler(async (req, res) => {
  const { code, title, semester, lecturerId } = req.body;
  await assertLecturer(lecturerId, req.user.universityId);

  const course = await prisma.course.create({
    data: { code, title, semester, lecturerId: lecturerId ?? null, universityId: req.user.universityId },
  });
  res.status(201).json({ course });
});

exports.update = asyncHandler(async (req, res) => {
  await findCourseOr404(req.params.courseId, req.user.universityId);
  if (req.body.lecturerId !== undefined) {
    await assertLecturer(req.body.lecturerId, req.user.universityId);
  }

  const course = await prisma.course.update({
    where: { id: req.params.courseId },
    data: req.body,
  });
  res.json({ course });
});

exports.remove = asyncHandler(async (req, res) => {
  await findCourseOr404(req.params.courseId, req.user.universityId);
  // Enrollments, slots, assignments and course announcements are removed by cascade.
  await prisma.course.delete({ where: { id: req.params.courseId } });
  res.status(204).end();
});

// ───────── Enrollment ─────────
exports.enroll = asyncHandler(async (req, res) => {
  const { courseId } = req.params;
  await findCourseOr404(courseId, req.user.universityId);

  const existing = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId: req.user.id, courseId } },
  });
  if (existing) throw ApiError.conflict('You are already enrolled in this course');

  const enrollment = await prisma.enrollment.create({
    data: { userId: req.user.id, courseId },
  });
  res.status(201).json({ enrollment });
});

exports.unenroll = asyncHandler(async (req, res) => {
  const { courseId } = req.params;
  await findCourseOr404(courseId, req.user.universityId);

  const { count } = await prisma.enrollment.deleteMany({
    where: { userId: req.user.id, courseId },
  });
  if (count === 0) throw ApiError.notFound('You are not enrolled in this course');
  res.status(204).end();
});

// ───────── Roster (course managers only; checked in the route) ─────────
exports.roster = asyncHandler(async (req, res) => {
  const enrollments = await prisma.enrollment.findMany({
    where: { courseId: req.params.courseId },
    select: {
      enrolledAt: true,
      user: { select: { id: true, name: true, email: true, studentNumber: true } },
    },
    orderBy: { user: { name: 'asc' } },
  });
  res.json({ students: enrollments.map((e) => ({ ...e.user, enrolledAt: e.enrolledAt })) });
});

exports.removeStudent = asyncHandler(async (req, res) => {
  const { courseId, userId } = req.params;
  const { count } = await prisma.enrollment.deleteMany({ where: { courseId, userId } });
  if (count === 0) throw ApiError.notFound('That student is not enrolled in this course');
  res.status(204).end();
});