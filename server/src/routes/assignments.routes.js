const router = require('express').Router();
const ctrl = require('../controllers/assignments.controller');
const reminders = require('../controllers/reminders.controller');
const { authenticate } = require('../middleware/auth');
const { requireRole, requireCourseManager } = require('../middleware/requireRole');
const validate = require('../middleware/validate');
const {
  updateAssignmentSchema,
  setProgressSchema,
  createReminderSchema,
  listMineQuerySchema,
} = require('../validators/assignment.validator');

// The manager check needs the course, which we get from the already-loaded assignment.
const courseOf = (req) => req.assignment.courseId;

router.use(authenticate);

router.get('/', validate(listMineQuerySchema, 'query'), ctrl.listMine);

router.get('/:assignmentId', ctrl.load, ctrl.getOne);
router.patch('/:assignmentId', ctrl.load, requireCourseManager(courseOf), validate(updateAssignmentSchema), ctrl.update);
router.delete('/:assignmentId', ctrl.load, requireCourseManager(courseOf), ctrl.remove);

// Progress: students set their own, managers see everyone's
router.put('/:assignmentId/progress', ctrl.load, requireRole('STUDENT', 'REP'), validate(setProgressSchema), ctrl.setProgress);
router.get('/:assignmentId/progress', ctrl.load, requireCourseManager(courseOf), ctrl.progressSummary);

// Reminders: students create their own
router.post('/:assignmentId/reminders', ctrl.load, requireRole('STUDENT', 'REP'), validate(createReminderSchema), reminders.create);

module.exports = router;