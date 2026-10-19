const prisma = require('../config/db');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { getViewableCourse, STUDENT_ROLES } = require('../utils/courseAccess');

const isStudent = (user) => STUDENT_ROLES.includes(user.role);

const include = (userId) => ({
  course: { select: { id: true, code: true, title: true } },
  progress: { where: { userId }, select: { status: true } }, // only this user's own row
});

// Students get "myStatus"; a student with no progress row yet is TODO.
function shape(assignment, user) {
  const { progress, ...rest } = assignment;
  return isStudent(user) ? { ...rest, myStatus: progress[0]?.status ?? 'TODO' } : rest;
}

// Route middleware: loads the assignment (own university only) into req.assignment.
exports.load = asyncHandler(async (req, res, next) => {
  const assignment = await prisma.assignment.findFirst({
    where: { id: req.params.assignmentId, course: { universityId: req.user.universityId } },
    include: include(req.user.id),
  });
  if (!assignment) throw ApiError.notFound('Assignment not found');
  req.assignment = assignment;
  next();
});

exports.listMine = asyncHandler(async (req, res) => {
  const { id: userId, role, universityId } = req.user;
  const { status, upcoming } = req.query;

  let courseFilter;
  if (role === 'LECTURER') courseFilter = { lecturerId: userId };
  else if (role === 'ADMIN') courseFilter = {};
  else courseFilter = { enrollments: { some: { userId } } };

  const where = { course: { universityId, ...courseFilter } };
  if (upcoming === 'true') where.dueAt = { gte: new Date() };

  if (status && isStudent(req.user)) {
    if (status === 'TODO') {
      // No progress row at all also counts as TODO
      where.AND = [
        { OR: [{ progress: { none: { userId } } }, { progress: { some: { userId, status: 'TODO' } } }] },
      ];
    } else {
      where.progress = { some: { userId, status } };
    }
  }

  const assignments = await prisma.assignment.findMany({
    where,
    include: include(userId),
    orderBy: { dueAt: 'asc' },
  });
  res.json({ assignments: assignments.map((a) => shape(a, req.user)) });
});

exports.listForCourse = asyncHandler(async (req, res) => {
  await getViewableCourse(req.user, req.params.courseId);
  const assignments = await prisma.assignment.findMany({
    where: { courseId: req.params.courseId },
    include: include(req.user.id),
    orderBy: { dueAt: 'asc' },
  });
  res.json({ assignments: assignments.map((a) => shape(a, req.user)) });
});

exports.getOne = asyncHandler(async (req, res) => {
  await getViewableCourse(req.user, req.assignment.courseId);
  res.json({ assignment: shape(req.assignment, req.user) });
});

exports.create = asyncHandler(async (req, res) => {
  const assignment = await prisma.assignment.create({
    data: { ...req.body, courseId: req.course.id, createdById: req.user.id },
  });
  res.status(201).json({ assignment });
});

exports.update = asyncHandler(async (req, res) => {
  const { assignment } = req;
  const ops = [prisma.assignment.update({ where: { id: assignment.id }, data: req.body })];

  // If the due date moved, shift every pending reminder by the same amount.
  if (req.body.dueAt) {
    const delta = req.body.dueAt.getTime() - assignment.dueAt.getTime();
    if (delta !== 0) {
      const pending = await prisma.reminder.findMany({
        where: { assignmentId: assignment.id, sent: false },
      });
      for (const r of pending) {
        ops.push(
          prisma.reminder.update({
            where: { id: r.id },
            data: { remindAt: new Date(r.remindAt.getTime() + delta) },
          })
        );
      }
    }
  }

  const [updated] = await prisma.$transaction(ops);
  res.json({ assignment: updated });
});

exports.remove = asyncHandler(async (req, res) => {
  // Progress rows and reminders are removed by cascade.
  await prisma.assignment.delete({ where: { id: req.assignment.id } });
  res.status(204).end();
});

// ───────── Progress ─────────
exports.setProgress = asyncHandler(async (req, res) => {
  const { id: assignmentId, courseId } = req.assignment;
  const userId = req.user.id;
  const { status } = req.body;

  await getViewableCourse(req.user, courseId); // students must be enrolled

  const progress = await prisma.assignmentProgress.upsert({
    where: { assignmentId_userId: { assignmentId, userId } },
    update: { status },
    create: { assignmentId, userId, status },
    select: { status: true, updatedAt: true },
  });

  // Nothing left to remind them about
  if (status === 'DONE') {
    await prisma.reminder.deleteMany({ where: { userId, assignmentId, sent: false } });
  }
  res.json({ progress });
});

// Course managers: who has done what.
exports.progressSummary = asyncHandler(async (req, res) => {
  const { id: assignmentId, courseId } = req.assignment;

  const enrollments = await prisma.enrollment.findMany({
    where: { courseId },
    select: {
      user: {
        select: {
          id: true, name: true, email: true, studentNumber: true,
          progress: { where: { assignmentId }, select: { status: true } },
        },
      },
    },
    orderBy: { user: { name: 'asc' } },
  });

  const students = enrollments.map(({ user }) => ({
    id: user.id,
    name: user.name,
    email: user.email,
    studentNumber: user.studentNumber,
    status: user.progress[0]?.status ?? 'TODO',
  }));

  const summary = { TODO: 0, IN_PROGRESS: 0, DONE: 0 };
  for (const s of students) summary[s.status]++;

  res.json({ total: students.length, summary, students });
});