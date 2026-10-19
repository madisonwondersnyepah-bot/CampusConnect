const router = require('express').Router();

router.use('/auth', require('./auth.routes'));
router.use('/courses', require('./courses.routes'));
router.use('/timetable', require('./timetable.routes'));

module.exports = router;