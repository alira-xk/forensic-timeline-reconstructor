const FileRecord = require('../models/FileRecord');
const Case = require('../models/Case');
const Event = require('../models/Event');
const { successResponse, errorResponse, paginatedResponse } = require('../utils/response');
const { logAudit, AUDIT_ACTIONS } = require('../utils/auditLogger');
const fs = require('fs');

exports.uploadFiles = async (req, res, next) => {
  try {
    const { caseId } = req.params;

    const caseData = await Case.findOne({ _id: caseId, investigator: req.user._id });
    if (!caseData) {
      return errorResponse(res, 'Case not found.', 404);
    }

    if (!req.files || req.files.length === 0) {
      return errorResponse(res, 'No files uploaded.', 400);
    }

    const fileRecords = [];

    for (const file of req.files) {
      const record = await FileRecord.create({
        case: caseId,
        uploadedBy: req.user._id,
        originalName: file.originalname,
        storedName: file.filename,
        filePath: file.path,
        mimeType: file.mimetype,
        fileType: file.fileType || 'unknown',
        fileSize: file.size,
        sha256Hash: file.sha256Hash || '',
        status: 'pending',
      });
      fileRecords.push(record);
    }

    // Update case stats
    const totalFiles = await FileRecord.countDocuments({ case: caseId });
    await Case.findByIdAndUpdate(caseId, { 'stats.totalFiles': totalFiles });

    logAudit(
      req.user._id,
      AUDIT_ACTIONS.FILE_UPLOADED,
      'FileRecord',
      caseId,
      { count: fileRecords.length, files: fileRecords.map((f) => f.originalName) },
      req.ip
    );

    return successResponse(res, `${fileRecords.length} file(s) uploaded successfully.`, { files: fileRecords }, 201);
  } catch (err) {
    next(err);
  }
};

exports.getFilesByCase = async (req, res, next) => {
  try {
    const { caseId } = req.params;
    const { page = 1, limit = 50 } = req.query;

    const caseData = await Case.findOne({ _id: caseId, investigator: req.user._id });
    if (!caseData) {
      return errorResponse(res, 'Case not found.', 404);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await FileRecord.countDocuments({ case: caseId });
    const files = await FileRecord.find({ case: caseId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    return paginatedResponse(res, 'Files retrieved.', files, {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / parseInt(limit)),
    });
  } catch (err) {
    next(err);
  }
};

exports.getFile = async (req, res, next) => {
  try {
    const file = await FileRecord.findById(req.params.id).populate('case');
    if (!file) {
      return errorResponse(res, 'File not found.', 404);
    }

    // Verify ownership
    const caseData = await Case.findOne({ _id: file.case, investigator: req.user._id });
    if (!caseData) {
      return errorResponse(res, 'File not found.', 404);
    }

    return successResponse(res, 'File retrieved.', { file });
  } catch (err) {
    next(err);
  }
};

exports.deleteFile = async (req, res, next) => {
  try {
    const file = await FileRecord.findById(req.params.id);
    if (!file) {
      return errorResponse(res, 'File not found.', 404);
    }

    const caseData = await Case.findOne({ _id: file.case, investigator: req.user._id });
    if (!caseData) {
      return errorResponse(res, 'File not found.', 404);
    }

    // Delete physical file
    try {
      if (fs.existsSync(file.filePath)) {
        fs.unlinkSync(file.filePath);
      }
    } catch (e) {
      // Non-blocking
    }

    // Delete related events
    await Event.deleteMany({ fileRecord: file._id });

    // Delete file record
    await FileRecord.findByIdAndDelete(file._id);

    // Update case stats
    const totalFiles = await FileRecord.countDocuments({ case: file.case });
    const processedFiles = await FileRecord.countDocuments({ case: file.case, status: 'processed' });
    const failedFiles = await FileRecord.countDocuments({ case: file.case, status: 'failed' });
    const totalEvents = await Event.countDocuments({ case: file.case });
    await Case.findByIdAndUpdate(file.case, {
      stats: { totalFiles, processedFiles, failedFiles, totalEvents },
    });

    logAudit(req.user._id, AUDIT_ACTIONS.FILE_DELETED, 'FileRecord', file._id.toString(), { originalName: file.originalName }, req.ip);

    return successResponse(res, 'File deleted.');
  } catch (err) {
    next(err);
  }
};
