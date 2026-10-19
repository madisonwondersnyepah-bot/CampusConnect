const prisma = require('../config/db');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { getViewableCourse } = require('../utils/courseAccess');

const MAX_PER_ASSIGNMENT = 5;

// POST /assignments/:assignmentId/reminders   body: { "hoursBefore": 24 }
exports.create = asyncHandler(async (req, res) => {
  const { assignment } = req; // loaded by the route
  const userId = req.user.id;

  await getViewableCourse(req.user, assignment.courseId);

  const remindAt = new Date(assignment.dueAt.getTime() - req.body.hoursBefore * 3600000);
  if (remindAt <= new Date()) {
    throw ApiError.badRequest('That reminder time has already passed. Choose fewer hours.');
  }

  const existing = await prisma.reminder.findMany({
    where: { userId, assignmentId: assignment.id },
    select: { remindAt: true },
  });
  if (existing.length >= MAX_PER_ASSIGNMENT) {
    throw ApiError.conflict(`You can set at most ${MAX_PER_ASSIGNMENT} reminders per assignment`);
  }
  if (existing.some((r) => r.remindAt.getTime() === remindAt.getTime())) {
    throw ApiError.conflict('You already have a reminder for that time');
  }

  const reminder = await prisma.reminder.create({
    data: { userId, assignmentId: assignment.id, remindAt },
  });
  res.status(201).json({ reminder });
});

// GET /reminders  -> "triggered" ones are your in-app notifications
exports.list = asyncHandler(async (req, res) => {
  const where = { userId: req.user.id };
  if (req.query.status === 'upcoming') where.sent = false;
  if (req.query.status === 'triggered') where.sent = true;

  const reminders = await prisma.reminder.findMany({
    where,
    include: {
      assignment: {
        select: {
          id: true, title: true, dueAt: true,
          course: { select: { code: true, title: true } },
        },
      },
    },
    orderBy: { remindAt: 'asc' },
  });
  res.json({ reminders });
});

// DELETE /reminders/:reminderId  (cancel an upcoming one or dismiss a triggered one)
exports.remove = asyncHandler(async (req, res) => {
  const { count } = await prisma.reminder.deleteMany({
    where: { id: req.params.reminderId, userId: req.user.id },
  });
  if (count === 0) throw ApiError.notFound('Reminder not found');
  res.status(204).end();
});