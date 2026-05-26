const express = require("express");
const {
  getTimelineByCase,
  createTestTimelineEvent,
} = require("../controllers/timelineController");

const router = express.Router();

router.get("/:caseId/timeline", getTimelineByCase);

// Temporary test route. We will remove or stop using this later.
router.post("/:caseId/timeline/test", createTestTimelineEvent);

module.exports = router;