const router = require('express').Router();
const ctrl = require('../controllers/events.controller');
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/requireRole');
const validate = require('../middleware/validate');
const { createEventSchema, updateEventSchema, listEventsQuerySchema } = require('../validators/event.validator');

router.use(authenticate);

router.get('/', validate(listEventsQuerySchema, 'query'), ctrl.list);
router.post('/', requireRole('ADMIN', 'REP', 'LECTURER'), validate(createEventSchema), ctrl.create);

router.get('/:eventId', ctrl.load, ctrl.getOne);
router.patch('/:eventId', ctrl.load, ctrl.requireManage, validate(updateEventSchema), ctrl.update);
router.delete('/:eventId', ctrl.load, ctrl.requireManage, ctrl.remove);

module.exports = router;