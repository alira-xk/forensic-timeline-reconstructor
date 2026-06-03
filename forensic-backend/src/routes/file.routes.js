const express = require('express');
const { authenticate } = require('../middleware/auth');
const {
  upload,
  computeSha256,
  ensureCaseUploadAccess,
  handleUploadErrors,
  MAX_FILES_PER_UPLOAD,
} = require('../middleware/upload');
const fileController = require('../controllers/file.controller');

const router = express.Router();

router.use(authenticate);

router.post(
  '/upload/:caseId',
  ensureCaseUploadAccess,
  upload.array('files', MAX_FILES_PER_UPLOAD),
  handleUploadErrors,
  computeSha256,
  fileController.uploadFiles
);
router.get('/case/:caseId', fileController.getFilesByCase);
router.get('/:id/preview', fileController.previewFile);
router.get('/:id/download', fileController.downloadFile);
router.get('/:id', fileController.getFile);
router.delete('/:id', fileController.deleteFile);

module.exports = router;
