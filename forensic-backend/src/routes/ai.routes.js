const express = require('express');
const { authenticate } = require('../middleware/auth');
const aiController = require('../controllers/ai.controller');

const router = express.Router();

router.use(authenticate);

router.post('/case/:caseId/summary', aiController.generateCaseSummary);

module.exports = router;
