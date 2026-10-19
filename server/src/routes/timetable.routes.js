const router = require('express').Router();
const ctrl = require('../controllers/timetable.controller');
const { authenticate } = require('../middleware/auth');

router.get('/', authenticate, ctrl.weekly);

module.exports = router;