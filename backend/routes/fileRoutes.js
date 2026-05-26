const express = require("express");
const multer = require("multer");
const path = require("path");
const {
  uploadEvidenceFile,
  getFilesByCase,
} = require("../controllers/fileController");

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${file.originalname}`;
    cb(null, uniqueName);
  },
});

const fileFilter = (req, file, cb) => {
  const allowedExtensions = [".pdf", ".docx", ".jpg", ".jpeg", ".png", ".log", ".txt"];
  const ext = path.extname(file.originalname).toLowerCase();

  if (allowedExtensions.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error("Unsupported file type. Allowed: PDF, DOCX, JPG, PNG, LOG, TXT"));
  }
};

const upload = multer({
  storage,
  fileFilter,
});

router.post("/:caseId/files", upload.single("evidence"), uploadEvidenceFile);
router.get("/:caseId/files", getFilesByCase);

module.exports = router;