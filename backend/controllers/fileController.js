const Case = require("../models/Case");
const EvidenceFile = require("../models/EvidenceFile");
const TimelineEvent = require("../models/TimelineEvent");
const { generateSHA256 } = require("../services/hashService");


const getFileType = (filename) => {
  const ext = filename.split(".").pop().toLowerCase();

  if (ext === "pdf") return "PDF";
  if (ext === "docx") return "DOCX";
  if (["jpg", "jpeg", "png"].includes(ext)) return "IMAGE";
  if (["log", "txt"].includes(ext)) return "LOG";

  return "UNKNOWN";
};

const uploadEvidenceFile = async (req, res) => {
  try {
    const { caseId } = req.params;

    const caseData = await Case.findById(caseId);

    if (!caseData) {
      return res.status(404).json({
        success: false,
        message: "Case not found",
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded",
      });
    }

    const fileHash = await generateSHA256(req.file.path);

    const evidenceFile = await EvidenceFile.create({
      caseId,
      originalName: req.file.originalname,
      storedName: req.file.filename,
      fileType: getFileType(req.file.originalname),
      mimeType: req.file.mimetype,
      filePath: req.file.path,
      hash: fileHash,
      size: req.file.size,
      status: "PENDING",
    });

    await TimelineEvent.create({
  caseId,
  fileId: evidenceFile._id,
  eventType: "FILE_UPLOADED",
  timestamp: new Date(),
  rawTimestamp: new Date().toISOString(),
  source: "Evidence Upload",
  description: `Evidence file "${req.file.originalname}" uploaded and SHA-256 hash calculated.`,
});

    res.status(201).json({
      success: true,
      message: "Evidence file uploaded successfully",
      data: evidenceFile,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to upload evidence file",
      error: error.message,
    });
  }
};

const getFilesByCase = async (req, res) => {
  try {
    const { caseId } = req.params;

    const files = await EvidenceFile.find({ caseId }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: files.length,
      data: files,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch evidence files",
      error: error.message,
    });
  }
};

module.exports = {
  uploadEvidenceFile,
  getFilesByCase,
};