const express = require("express");
const {
  exportTimelineJSON,
  exportTimelineCSV,
} = require("../controllers/exportController");

const router = express.Router();

router.get("/:caseId/export/json", exportTimelineJSON);
router.get("/:caseId/export/csv", exportTimelineCSV);

module.exports = router;