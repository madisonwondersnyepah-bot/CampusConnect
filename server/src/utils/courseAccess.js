const prisma = require('../config/db');
const ApiError = require('./ApiError');

const STUDENT_ROLES = ['STUDENT', 'REP'];

// Loads a course (inside the caller's university only) and checks the caller may view it:
// ADMIN always, a LECTURER only for their own course, students only if enrolled.
async function getViewableCourse(user, courseId) {
  const course = await prisma.course.findFirst({
    where: { id: courseId, universityId: user.universityId },
    select: {
      id: true,
      lecturerId: true,
      enrollments: { where: { userId: user.id }, select: { id: true } },
    },
  });
  if (!course) throw ApiError.notFound('Course not found');

  const allowed =
    user.role === 'ADMIN' ||
    (user.role === 'LECTURER' && course.lecturerId === user.id) ||
    (STUDENT_ROLES.includes(user.role) && course.enrollments.length > 0);

  if (!allowed) throw ApiError.forbidden('You do not have access to this course');
  return course;
}

module.exports = { getViewableCourse, STUDENT_ROLES };