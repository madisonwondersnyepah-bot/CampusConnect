const prisma = require('../config/db');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { getViewableCourse } = require('../utils/courseAccess');

const include = {
  author: { select: { id: true, name: true } },
  course: { select: { id: true, code: true, title: true } },
  group: { select: { id: true, name: true } },
};

// Lists return a short preview instead of the full content.
const toListItem = ({ content, ...note }) => ({ ...note, preview: content.slice(0, 140) });

function searchFilter(search) {
  return [
    { title: { contains: search, mode: 'insensitive' } },
    { content: { contains: search, mode: 'insensitive' } },
  ];
}

// Personal note: only its author can see it. Group note: only members can.
// Anyone else gets 404, so the note's existence isn't revealed.
exports.load = asyncHandler(async (req, res, next) => {
  const note = await prisma.note.findUnique({ where: { id: req.params.noteId }, include });
  if (!note) throw ApiError.notFound('Note not found');

  let myRole = null;
  if (note.groupId) {
    const membership = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId: note.groupId, userId: req.user.id } },
      select: { role: true },
    });
    if (!membership) throw ApiError.notFound('Note not found');
    myRole = membership.role;
  } else if (note.authorId !== req.user.id) {
    throw ApiError.notFound('Note not found');
  }

  req.note = note;
  req.canEdit = note.authorId === req.user.id || myRole === 'OWNER';
  next();
});

exports.requireEdit = (req, res, next) => {
  if (!req.canEdit) return next(ApiError.forbidden('Only the author or the group owner can change this note'));
  next();
};

exports.getOne = (req, res) => res.json({ note: req.note, canEdit: req.canEdit });

exports.listPersonal = asyncHandler(async (req, res) => {
  const { courseId, search } = req.query;
  const where = { authorId: req.user.id, groupId: null };
  if (courseId) where.courseId = courseId;
  if (search) where.OR = searchFilter(search);

  const notes = await prisma.note.findMany({ where, include, orderBy: { updatedAt: 'desc' }, take: 200 });
  res.json({ notes: notes.map(toListItem) });
});

exports.createPersonal = asyncHandler(async (req, res) => {
  const { title, content, courseId } = req.body;
  if (courseId) await getViewableCourse(req.user, courseId);

  const note = await prisma.note.create({
    data: { title, content, courseId: courseId ?? null, authorId: req.user.id },
    include,
  });
  res.status(201).json({ note });
});

// Group notes (the route has already checked membership)
exports.listForGroup = asyncHandler(async (req, res) => {
  const where = { groupId: req.group.id };
  if (req.query.search) where.OR = searchFilter(req.query.search);

  const notes = await prisma.note.findMany({ where, include, orderBy: { updatedAt: 'desc' }, take: 200 });
  res.json({ notes: notes.map(toListItem) });
});

exports.createInGroup = asyncHandler(async (req, res) => {
  const note = await prisma.note.create({
    data: {
      title: req.body.title,
      content: req.body.content,
      groupId: req.group.id,
      courseId: req.group.courseId,
      authorId: req.user.id,
    },
    include,
  });
  res.status(201).json({ note });
});

exports.update = asyncHandler(async (req, res) => {
  const note = await prisma.note.update({ where: { id: req.note.id }, data: req.body, include });
  res.json({ note });
});

exports.remove = asyncHandler(async (req, res) => {
  await prisma.note.delete({ where: { id: req.note.id } });
  res.status(204).end();
});