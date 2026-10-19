const router = require('express').Router();
const ctrl = require('../controllers/announcements.controller');
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/requireRole');
const validate = require('../middleware/validate');
const {
  createAnnouncementSchema,
  updateAnnouncementSchema,
  listAnnouncementsQuerySchema,
} = require('../validators/announcement.validator');

router.use(authenticate);

router.get('/', validate(listAnnouncementsQuerySchema, 'query'), ctrl.list);
router.post('/', requireRole('ADMIN', 'REP', 'LECTURER'), validate(createAnnouncementSchema), ctrl.create);

router.get('/:announcementId', ctrl.load, ctrl.getOne);
router.patch('/:announcementId', ctrl.load, ctrl.requireManage, validate(updateAnnouncementSchema), ctrl.update);
router.delete('/:announcementId', ctrl.load, ctrl.requireManage, ctrl.remove);

module.exports = router;