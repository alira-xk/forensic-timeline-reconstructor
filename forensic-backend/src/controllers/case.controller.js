const Case = require('../models/Case');
const FileRecord = require('../models/FileRecord');
const Event = require('../models/Event');
const { successResponse, errorResponse, paginatedResponse } = require('../utils/response');
const { logAudit, AUDIT_ACTIONS } = require('../utils/auditLogger');
const fs = require('fs');
const path = require('path');

exports.createCase = async (req, res, next) => {
  try {
    const { title, description, priority, category, tags, notes } = req.body;

    if (!title) {
      return errorResponse(res, 'Case title is required.', 400);
    }

    const caseData = await Case.create({
      title,
      description,
      priority,
      category,
      tags: tags || [],
      notes,
      investigator: req.user._id,
    });

    logAudit(req.user._id, AUDIT_ACTIONS.CASE_CREATED, 'Case', caseData._id.toString(), { title }, req.ip);

    return successResponse(res, 'Case created successfully.', { case: caseData }, 201);
  } catch (err) {
    next(err);
  }
};

exports.getCases = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 20,
      search,
      status,
      priority,
      category,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    const query = { investigator: req.user._id };

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { caseNumber: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }
    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (category) query.category = category;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Case.countDocuments(query);
    const cases = await Case.find(query)
      .sort({ [sortBy]: sortOrder === 'asc' ? 1 : -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('investigator', 'name email role');

    return paginatedResponse(res, 'Cases retrieved.', cases, {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / parseInt(limit)),
    });
  } catch (err) {
    next(err);
  }
};

exports.getCaseById = async (req, res, next) => {
  try {
    const caseData = await Case.findOne({
      _id: req.params.id,
      investigator: req.user._id,
    }).populate('investigator', 'name email role');

    if (!caseData) {
      return errorResponse(res, 'Case not found.', 404);
    }

    return successResponse(res, 'Case retrieved.', { case: caseData });
  } catch (err) {
    next(err);
  }
};

exports.updateCase = async (req, res, next) => {
  try {
    const { title, description, status, priority, category, tags, notes } = req.body;
    const updates = {};

    if (title !== undefined) updates.title = title;
    if (description !== undefined) updates.description = description;
    if (status !== undefined) updates.status = status;
    if (priority !== undefined) updates.priority = priority;
    if (category !== undefined) updates.category = category;
    if (tags !== undefined) updates.tags = tags;
    if (notes !== undefined) updates.notes = notes;

    const caseData = await Case.findOneAndUpdate(
      { _id: req.params.id, investigator: req.user._id },
      updates,
      { new: true, runValidators: true }
    );

    if (!caseData) {
      return errorResponse(res, 'Case not found.', 404);
    }

    logAudit(req.user._id, AUDIT_ACTIONS.CASE_UPDATED, 'Case', caseData._id.toString(), updates, req.ip);

    return successResponse(res, 'Case updated.', { case: caseData });
  } catch (err) {
    next(err);
  }
};

exports.deleteCase = async (req, res, next) => {
  try {
    const caseData = await Case.findOne({
      _id: req.params.id,
      investigator: req.user._id,
    });

    if (!caseData) {
      return errorResponse(res, 'Case not found.', 404);
    }

    // Delete all related events
    await Event.deleteMany({ case: caseData._id });

    // Delete all related files (physical + DB)
    const files = await FileRecord.find({ case: caseData._id });
    for (const file of files) {
      try {
        if (fs.existsSync(file.filePath)) {
          fs.unlinkSync(file.filePath);
        }
      } catch (e) {
        // Non-blocking file deletion
      }
    }
    await FileRecord.deleteMany({ case: caseData._id });

    // Delete case upload directory
    const baseDir = path.resolve(__dirname, '../..');
    const uploadRoot = path.resolve(baseDir, process.env.UPLOAD_DIR || 'uploads');
    const uploadDir = path.join(uploadRoot, caseData._id.toString());
    try {
      if (fs.existsSync(uploadDir)) {
        fs.rmSync(uploadDir, { recursive: true, force: true });
      }
    } catch (e) {
      // Non-blocking
    }

    await Case.findByIdAndDelete(caseData._id);

    logAudit(req.user._id, AUDIT_ACTIONS.CASE_DELETED, 'Case', caseData._id.toString(), { title: caseData.title }, req.ip);

    return successResponse(res, 'Case and all related data deleted.');
  } catch (err) {
    next(err);
  }
};

exports.getCaseStats = async (req, res, next) => {
  try {
    const caseData = await Case.findOne({
      _id: req.params.id,
      investigator: req.user._id,
    });

    if (!caseData) {
      return errorResponse(res, 'Case not found.', 404);
    }

    // Refresh stats from actual counts
    const totalFiles = await FileRecord.countDocuments({ case: caseData._id });
    const processedFiles = await FileRecord.countDocuments({ case: caseData._id, status: 'processed' });
    const failedFiles = await FileRecord.countDocuments({ case: caseData._id, status: 'failed' });
    const totalEvents = await Event.countDocuments({ case: caseData._id });

    const stats = { totalFiles, processedFiles, failedFiles, totalEvents };

    // Update case stats
    await Case.findByIdAndUpdate(caseData._id, { stats });

    return successResponse(res, 'Case stats retrieved.', { stats });
  } catch (err) {
    next(err);
  }
};
