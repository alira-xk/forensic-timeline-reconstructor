const express = require('express');
const { authenticate } = require('../middleware/auth');
const noteController = require('../controllers/note.controller');

const router = express.Router();

router.use(authenticate);

router.get('/case/:caseId', noteController.getNotesByCase);
router.post('/', noteController.createNote);
router.put('/:id', noteController.updateNote);
router.delete('/:id', noteController.deleteNote);

module.exports = router;
