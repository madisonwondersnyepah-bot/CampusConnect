const router = require('express').Router();
const ctrl = require('../controllers/notes.controller');
const { authenticate } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { createNoteSchema, updateNoteSchema, listNotesQuerySchema } = require('../validators/note.validator');

router.use(authenticate);

router.get('/', validate(listNotesQuerySchema, 'query'), ctrl.listPersonal);
router.post('/', validate(createNoteSchema), ctrl.createPersonal);

router.get('/:noteId', ctrl.load, ctrl.getOne);
router.patch('/:noteId', ctrl.load, ctrl.requireEdit, validate(updateNoteSchema), ctrl.update);
router.delete('/:noteId', ctrl.load, ctrl.requireEdit, ctrl.remove);

module.exports = router;