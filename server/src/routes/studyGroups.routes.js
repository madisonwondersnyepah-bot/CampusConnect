const router = require('express').Router();
const ctrl = require('../controllers/studyGroups.controller');
const notes = require('../controllers/notes.controller');
const { authenticate } = require('../middleware/auth');
const validate = require('../middleware/validate');
const {
  createGroupSchema,
  updateGroupSchema,
  addMemberSchema,
  listGroupsQuerySchema,
} = require('../validators/studyGroup.validator');
const { createGroupNoteSchema, listNotesQuerySchema } = require('../validators/note.validator');

router.use(authenticate);

router.get('/', validate(listGroupsQuerySchema, 'query'), ctrl.list);
router.post('/', validate(createGroupSchema), ctrl.create);

router.get('/:groupId', ctrl.load, ctrl.getOne);
router.patch('/:groupId', ctrl.load, ctrl.requireOwner, validate(updateGroupSchema), ctrl.update);
router.delete('/:groupId', ctrl.load, ctrl.requireOwner, ctrl.remove);

// Membership ("members/me" must come before "members/:userId")
router.post('/:groupId/join', ctrl.load, ctrl.join);
router.delete('/:groupId/members/me', ctrl.load, ctrl.leave);
router.post('/:groupId/members', ctrl.load, ctrl.requireOwner, validate(addMemberSchema), ctrl.addMember);
router.delete('/:groupId/members/:userId', ctrl.load, ctrl.requireOwner, ctrl.removeMember);

// Shared notes
router.get('/:groupId/notes', ctrl.load, ctrl.requireMember, validate(listNotesQuerySchema, 'query'), notes.listForGroup);
router.post('/:groupId/notes', ctrl.load, ctrl.requireMember, validate(createGroupNoteSchema), notes.createInGroup);

module.exports = router;