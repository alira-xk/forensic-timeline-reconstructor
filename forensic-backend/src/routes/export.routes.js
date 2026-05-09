const express = require('express');
const { authenticate } = require('../middleware/auth');
const ec = require('../controllers/export.controller');
const router = express.Router();
router.use(authenticate);
router.get('/json/:caseId', ec.exportJSON);
router.get('/csv/:caseId', ec.exportCSV);
module.exports = router;
