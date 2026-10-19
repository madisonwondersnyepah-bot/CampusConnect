const router = require('express').Router();
const ctrl = require('../controllers/admin.controller');
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/requireRole');
const validate = require('../middleware/validate');
const {
  createUserSchema,
  updateUserSchema,
  resetPasswordSchema,
  listUsersQuerySchema,
} = require('../validators/admin.validator');

router.use(authenticate, requireRole('ADMIN')); // everything below is admin-only

router.get('/stats', ctrl.stats);

router.get('/users', validate(listUsersQuerySchema, 'query'), ctrl.listUsers);
router.post('/users', validate(createUserSchema), ctrl.createUser);
router.get('/users/:userId', ctrl.getUser);
router.patch('/users/:userId', validate(updateUserSchema), ctrl.updateUser);
router.post('/users/:userId/reset-password', validate(resetPasswordSchema), ctrl.resetPassword);

module.exports = router;