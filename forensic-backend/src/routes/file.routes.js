const express = require('express');
const { authenticate } = require('../middleware/auth');
const { upload, computeSha256 } = require('../middleware/upload');
const fileController = require('../controllers/file.controller');

const router = express.Router();

router.use(authenticate);

router.post(
  '/upload/:caseId',
  upload.array('files', 20),
  computeSha256,
  fileController.uploadFiles
);
router.get('/case/:caseId', fileController.getFilesByCase);
router.get('/:id', fileController.getFile);
router.delete('/:id', fileController.deleteFile);

module.exports = router;
