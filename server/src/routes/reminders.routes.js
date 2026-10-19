const router = require('express').Router();
const ctrl = require('../controllers/reminders.controller');
const { authenticate } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { listRemindersQuerySchema } = require('../validators/assignment.validator');

router.use(authenticate);

router.get('/', validate(listRemindersQuerySchema, 'query'), ctrl.list);
router.delete('/:reminderId', ctrl.remove);

module.exports = router;