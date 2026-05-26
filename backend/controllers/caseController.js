const fs = require("fs");
const path = require("path");

const Case = require("../models/Case");
const EvidenceFile = require("../models/EvidenceFile");
const TimelineEvent = require("../models/TimelineEvent");

const getUserIdFromRequest = (req) => {
  return req.headers["x-user-id"] || req.body.userId || req.query.userId;
};

// Create new case for logged-in user
const createCase = async (req, res) => {
  try {
    const { title, description, status } = req.body;
    const userId = getUserIdFromRequest(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "User ID is required to create a case",
      });
    }

    if (!title || !title.trim()) {
      return res.status(400).json({
        success: false,
        message: "Case title is required",
      });
    }

    const newCase = await Case.create({
      userId,
      title: title.trim(),
      description: description || "",
      status: status || "Active",
    });

    res.status(201).json({
      success: true,
      message: "Case created successfully",
      data: newCase,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to create case",
      error: error.message,
    });
  }
};

// Get cases for logged-in user only
const getCases = async (req, res) => {
  try {
    const userId = getUserIdFromRequest(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "User ID is required to fetch cases",
      });
    }

    const cases = await Case.find({ userId }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: cases.length,
      data: cases,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch cases",
      error: error.message,
    });
  }
};

// Get single case only if it belongs to logged-in user
const getCaseById = async (req, res) => {
  try {
    const userId = getUserIdFromRequest(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "User ID is required to fetch case",
      });
    }

    const caseData = await Case.findOne({
      _id: req.params.id,
      userId,
    });

    if (!caseData) {
      return res.status(404).json({
        success: false,
        message: "Case not found for this user",
      });
    }

    res.status(200).json({
      success: true,
      data: caseData,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch case",
      error: error.message,
    });
  }
};

// Delete case only if it belongs to logged-in user
const deleteCase = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = getUserIdFromRequest(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "User ID is required to delete case",
      });
    }

    const caseData = await Case.findOne({
      _id: id,
      userId,
    });

    if (!caseData) {
      return res.status(404).json({
        success: false,
        message: "Case not found for this user",
      });
    }

    const evidenceFiles = await EvidenceFile.find({ caseId: id });

    for (const file of evidenceFiles) {
      if (file.filePath) {
        const fullPath = path.join(__dirname, "..", file.filePath);

        if (fs.existsSync(fullPath)) {
          fs.unlinkSync(fullPath);
        }
      }
    }

    await TimelineEvent.deleteMany({ caseId: id });
    await EvidenceFile.deleteMany({ caseId: id });
    await Case.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: "Case and related evidence deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to delete case",
      error: error.message,
    });
  }
};

module.exports = {
  createCase,
  getCases,
  getCaseById,
  deleteCase,
};