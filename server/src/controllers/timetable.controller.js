const prisma = require('../config/db');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

// Rejects a slot that overlaps another slot of the same course, or in the same room,
// on the same day. "HH:MM" strings compare correctly because they are zero-padded.
async function assertNoConflict(universityId, courseId, slot, excludeId) {
  const or = [{ courseId }];
  if (slot.room) or.push({ room: slot.room });

  const clash = await prisma.timetableSlot.findFirst({
    where: {
      id: excludeId ? { not: excludeId } : undefined,
      dayOfWeek: slot.dayOfWeek,
      startTime: { lt: slot.endTime },
      endTime: { gt: slot.startTime },
      course: { universityId },
      OR: or,
    },
    include: { course: { select: { code: true } } },
  });

  if (clash) {
    const sameCourse = clash.courseId === courseId;
    throw ApiError.conflict(
      sameCourse
        ? `This course already has a slot at that time (${clash.startTime}-${clash.endTime})`
        : `Room ${clash.room} is already booked by ${clash.course.code} (${clash.startTime}-${clash.endTime})`
    );
  }
}

// Weekly view, shaped by role.
exports.weekly = asyncHandler(async (req, res) => {
  const { id, role, universityId } = req.user;

  let courseFilter;
  if (role === 'LECTURER') courseFilter = { lecturerId: id };
  else if (role === 'ADMIN') courseFilter = {};
  else courseFilter = { enrollments: { some: { userId: id } } }; // STUDENT, REP

  const slots = await prisma.timetableSlot.findMany({
    where: { course: { universityId, ...courseFilter } },
    include: { course: { select: { id: true, code: true, title: true } } },
    orderBy: { startTime: 'asc' },
  });

  const week = Object.fromEntries(DAYS.map((d) => [d, []]));
  for (const s of slots) week[s.dayOfWeek].push(s);

  res.json({ week });
});

exports.listSlots = asyncHandler(async (req, res) => {
  const course = await prisma.course.findFirst({
    where: { id: req.params.courseId, universityId: req.user.universityId },
    select: { id: true },
  });
  if (!course) throw ApiError.notFound('Course not found');

  const slots = await prisma.timetableSlot.findMany({
    where: { courseId: course.id },
    orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
  });
  res.json({ slots });
});

exports.createSlot = asyncHandler(async (req, res) => {
  const { courseId } = req.params;
  const slot = { room: null, ...req.body };

  await assertNoConflict(req.user.universityId, courseId, slot);
  const created = await prisma.timetableSlot.create({ data: { courseId, ...slot } });
  res.status(201).json({ slot: created });
});

exports.updateSlot = asyncHandler(async (req, res) => {
  const { courseId, slotId } = req.params;

  const existing = await prisma.timetableSlot.findFirst({ where: { id: slotId, courseId } });
  if (!existing) throw ApiError.notFound('Slot not found');

  const merged = { ...existing, ...req.body };
  if (merged.startTime >= merged.endTime) {
    throw ApiError.badRequest('endTime must be after startTime');
  }

  await assertNoConflict(req.user.universityId, courseId, merged, slotId);
  const slot = await prisma.timetableSlot.update({ where: { id: slotId }, data: req.body });
  res.json({ slot });
});

exports.removeSlot = asyncHandler(async (req, res) => {
  const { courseId, slotId } = req.params;
  const { count } = await prisma.timetableSlot.deleteMany({ where: { id: slotId, courseId } });
  if (count === 0) throw ApiError.notFound('Slot not found');
  res.status(204).end();
});