const express = require("express");
const {
  extractMetadataForCase,
} = require("../controllers/extractionController");

const router = express.Router();

router.post("/:caseId/extract", extractMetadataForCase);

module.exports = router;