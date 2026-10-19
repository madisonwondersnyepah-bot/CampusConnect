const prisma = require('../config/db');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

// Usage: router.post('/', authenticate, requireRole('LECTURER', 'ADMIN'), handler)
const requireRole = (...allowed) => (req, res, next) => {
  if (!req.user) return next(ApiError.unauthorized());
  if (!allowed.includes(req.user.role)) {
    return next(ApiError.forbidden('You do not have permission to do this'));
  }
  next();
};

// Resource-level check: ADMIN can manage any course at their university,
// a LECTURER only the courses assigned to them.
// Usage: router.post('/courses/:courseId/assignments', authenticate,
//          requireCourseManager(), handler)
const requireCourseManager = (getCourseId = (req) => req.params.courseId) =>
  asyncHandler(async (req, res, next) => {
    const course = await prisma.course.findUnique({
      where: { id: getCourseId(req) },
      select: { id: true, lecturerId: true, universityId: true },
    });
    if (!course || course.universityId !== req.user.universityId) {
      throw ApiError.notFound('Course not found');
    }

    const isAdmin = req.user.role === 'ADMIN';
    const isOwnerLecturer = req.user.role === 'LECTURER' && course.lecturerId === req.user.id;
    if (!isAdmin && !isOwnerLecturer) {
      throw ApiError.forbidden('You do not manage this course');
    }

    req.course = course;
    next();
  });

// Usage: owner of a resource (e.g. a note) OR one of the given roles.
// getOwnerId is async: (req) => (await prisma.note.findUnique(...))?.authorId
const requireOwnerOrRole = (getOwnerId, ...roles) =>
  asyncHandler(async (req, res, next) => {
    if (roles.includes(req.user.role)) return next();
    const ownerId = await getOwnerId(req);
    if (!ownerId) throw ApiError.notFound();
    if (ownerId !== req.user.id) throw ApiError.forbidden();
    next();
  });

module.exports = { requireRole, requireCourseManager, requireOwnerOrRole };