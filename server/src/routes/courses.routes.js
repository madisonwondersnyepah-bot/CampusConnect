const router = require('express').Router();
const ctrl = require('../controllers/courses.controller');
const timetable = require('../controllers/timetable.controller');
const assignments = require('../controllers/assignments.controller');
const { authenticate } = require('../middleware/auth');
const { requireRole, requireCourseManager } = require('../middleware/requireRole');
const validate = require('../middleware/validate');
const {
  createCourseSchema,
  updateCourseSchema,
  listQuerySchema,
} = require('../validators/course.validator');
const { createSlotSchema, updateSlotSchema } = require('../validators/timetable.validator');
const { createAssignmentSchema } = require('../validators/assignment.validator');

router.use(authenticate); // every route below requires login

router.get('/', validate(listQuerySchema, 'query'), ctrl.list);
router.get('/:courseId', ctrl.getOne);

// Admin only
router.post('/', requireRole('ADMIN'), validate(createCourseSchema), ctrl.create);
router.patch('/:courseId', requireRole('ADMIN'), validate(updateCourseSchema), ctrl.update);
router.delete('/:courseId', requireRole('ADMIN'), ctrl.remove);

// Students enroll themselves
router.post('/:courseId/enroll', requireRole('STUDENT', 'REP'), ctrl.enroll);
router.delete('/:courseId/enroll', requireRole('STUDENT', 'REP'), ctrl.unenroll);

// Course manager (admin, or the course's own lecturer)
router.get('/:courseId/students', requireCourseManager(), ctrl.roster);
router.delete('/:courseId/students/:userId', requireCourseManager(), ctrl.removeStudent);

// Timetable slots
router.get('/:courseId/slots', timetable.listSlots);
router.post('/:courseId/slots', requireCourseManager(), validate(createSlotSchema), timetable.createSlot);
router.patch('/:courseId/slots/:slotId', requireCourseManager(), validate(updateSlotSchema), timetable.updateSlot);
router.delete('/:courseId/slots/:slotId', requireCourseManager(), timetable.removeSlot);

// Assignments
router.get('/:courseId/assignments', assignments.listForCourse);
router.post('/:courseId/assignments', requireCourseManager(), validate(createAssignmentSchema), assignments.create);

module.exports = router;