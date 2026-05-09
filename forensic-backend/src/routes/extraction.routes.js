const express = require('express');
const { authenticate } = require('../middleware/auth');
const extractionController = require('../controllers/extraction.controller');

const router = express.Router();
router.use(authenticate);

router.post('/case/:caseId', extractionController.extractCase);
router.post('/file/:fileId', extractionController.extractFile);
router.get('/status/:caseId', extractionController.getExtractionStatus);

module.exports = router;
