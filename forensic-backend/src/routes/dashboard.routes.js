const express = require('express');
const { authenticate } = require('../middleware/auth');
const dc = require('../controllers/dashboard.controller');
const router = express.Router();
router.use(authenticate);
router.get('/stats', dc.getStats);
module.exports = router;
