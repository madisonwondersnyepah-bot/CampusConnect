const router = require('express').Router();

router.use('/auth', require('./auth.routes'));
router.use('/courses', require('./courses.routes'));
router.use('/timetable', require('./timetable.routes'));
router.use('/assignments', require('./assignments.routes'));
router.use('/reminders', require('./reminders.routes'));
router.use('/announcements', require('./announcements.routes'));
router.use('/events', require('./events.routes'));
router.use('/study-groups', require('./studyGroups.routes'));
router.use('/notes', require('./notes.routes'));
router.use('/admin', require('./admin.routes'));

module.exports = router;