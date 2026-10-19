const router = require('express').Router();

router.use('/auth', require('./auth.routes'));
router.use('/courses', require('./courses.routes'));
router.use('/timetable', require('./timetable.routes'));
router.use('/assignments', require('./assignments.routes'));
router.use('/reminders', require('./reminders.routes'));

module.exports = router;