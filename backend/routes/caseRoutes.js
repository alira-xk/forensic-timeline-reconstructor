const express = require("express");
const {
  createCase,
  getCases,
  getCaseById,
  deleteCase,
} = require("../controllers/caseController");

const router = express.Router();

router.post("/", createCase);
router.get("/", getCases);
router.get("/:id", getCaseById);
router.delete("/:id", deleteCase);

module.exports = router;