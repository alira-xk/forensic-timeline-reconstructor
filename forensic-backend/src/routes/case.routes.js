const express = require('express');
const { authenticate } = require('../middleware/auth');
const caseController = require('../controllers/case.controller');

const router = express.Router();

router.use(authenticate);

router.post('/', caseController.createCase);
router.get('/', caseController.getCases);
router.get('/:id/stats', caseController.getCaseStats);
router.get('/:id/chain-of-custody', caseController.getChainOfCustody);
router.get('/:id', caseController.getCaseById);
router.put('/:id', caseController.updateCase);
router.delete('/:id', caseController.deleteCase);

module.exports = router;
