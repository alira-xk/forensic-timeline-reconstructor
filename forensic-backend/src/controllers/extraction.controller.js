const FileRecord = require('../models/FileRecord');
const Case = require('../models/Case');
const Event = require('../models/Event');
const { successResponse, errorResponse } = require('../utils/response');
const { logAudit, AUDIT_ACTIONS } = require('../utils/auditLogger');
const { runPythonExtraction } = require('../utils/extraction');
const logger = require('../utils/logger');

const toValidDate = (value) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const processFile = async (file, caseId, userId, ip) => {
  try {
    await FileRecord.findByIdAndUpdate(file._id, {
      status: 'processing',
      errorReason: '',
      eventsExtracted: 0,
    });

    const result = await runPythonExtraction(
      file.filePath,
      file.fileType,
      file._id.toString(),
      caseId.toString()
    );

    await Event.deleteMany({ fileRecord: file._id });

    if (result.success && result.events && result.events.length > 0) {
      const eventDocs = result.events
        .map((evt) => {
          const timestamp = toValidDate(evt.timestamp);
          if (!timestamp) {
            return null;
          }

          return {
            case: caseId,
            fileRecord: file._id,
            timestamp,
            originalTimestamp: evt.original_timestamp || evt.timestamp,
            eventType: evt.event_type || 'custom',
            eventSource: file.fileType === 'unknown' ? 'txt' : file.fileType,
            title: evt.title || 'Extracted Event',
            description: evt.description || '',
            metadata: evt.metadata || {},
            confidence: evt.confidence || 50,
            tags: evt.tags || [],
          };
        })
        .filter(Boolean);

      if (eventDocs.length > 0) {
        await Event.insertMany(eventDocs);
      }

      await FileRecord.findByIdAndUpdate(file._id, {
        status: 'processed',
        eventsExtracted: eventDocs.length,
        extractedAt: new Date(),
        errorReason: '',
      });

      logAudit(userId, AUDIT_ACTIONS.EXTRACTION_COMPLETED, 'FileRecord', file._id.toString(), {
        caseId: caseId.toString(),
        fileId: file._id.toString(),
        originalName: file.originalName,
        sha256Hash: file.sha256Hash,
        eventsExtracted: eventDocs.length,
      }, ip);
    } else {
      await FileRecord.findByIdAndUpdate(file._id, {
        status: 'processed',
        eventsExtracted: 0,
        extractedAt: new Date(),
        errorReason: '',
      });
    }
  } catch (err) {
    logger.error('Extraction failed for file', {
      fileId: file._id.toString(),
      error: err.message,
    });

    await FileRecord.findByIdAndUpdate(file._id, {
      status: 'failed',
      errorReason: err.message.substring(0, 500),
    });

    logAudit(userId, AUDIT_ACTIONS.EXTRACTION_FAILED, 'FileRecord', file._id.toString(), {
      caseId: caseId.toString(),
      fileId: file._id.toString(),
      originalName: file.originalName,
      sha256Hash: file.sha256Hash,
      error: err.message,
    }, ip, false);
  }
};

const updateCaseStats = async (caseId) => {
  try {
    const totalFiles = await FileRecord.countDocuments({ case: caseId });
    const processedFiles = await FileRecord.countDocuments({ case: caseId, status: 'processed' });
    const failedFiles = await FileRecord.countDocuments({ case: caseId, status: 'failed' });
    const totalEvents = await Event.countDocuments({ case: caseId });

    await Case.findByIdAndUpdate(caseId, {
      stats: { totalFiles, processedFiles, failedFiles, totalEvents },
    });
  } catch (err) {
    logger.warn('Failed to update case stats', { caseId, error: err.message });
  }
};

exports.extractCase = async (req, res, next) => {
  try {
    const { caseId } = req.params;

    const caseData = await Case.findOne({ _id: caseId, investigator: req.user._id });
    if (!caseData) {
      return errorResponse(res, 'Case not found.', 404);
    }

    const pendingFiles = await FileRecord.find({
      case: caseId,
      status: { $in: ['pending', 'failed'] },
    });

    if (pendingFiles.length === 0) {
      return successResponse(res, 'No pending files to extract.');
    }

    logAudit(req.user._id, AUDIT_ACTIONS.EXTRACTION_STARTED, 'Case', caseId, {
      caseId,
      fileCount: pendingFiles.length,
      files: pendingFiles.map((file) => ({
        fileId: file._id.toString(),
        originalName: file.originalName,
        sha256Hash: file.sha256Hash,
      })),
    }, req.ip);

    // Respond immediately
    successResponse(res, 'Extraction started.', {
      filesQueued: pendingFiles.length,
      status: 'processing',
    });

    // Process in background after response is sent
    setImmediate(async () => {
      for (const file of pendingFiles) {
        await processFile(file, caseId, req.user._id, req.ip);
      }
      await updateCaseStats(caseId);
      logger.info('Case extraction complete', { caseId, filesProcessed: pendingFiles.length });
    });
  } catch (err) {
    next(err);
  }
};

exports.extractFile = async (req, res, next) => {
  try {
    const { fileId } = req.params;

    const file = await FileRecord.findById(fileId);
    if (!file) {
      return errorResponse(res, 'File not found.', 404);
    }

    const caseData = await Case.findOne({ _id: file.case, investigator: req.user._id });
    if (!caseData) {
      return errorResponse(res, 'File not found.', 404);
    }

    // Delete old events for re-extraction
    await Event.deleteMany({ fileRecord: file._id });

    logAudit(req.user._id, AUDIT_ACTIONS.EXTRACTION_STARTED, 'FileRecord', file._id.toString(), {
      caseId: file.case.toString(),
      fileId: file._id.toString(),
      originalName: file.originalName,
      sha256Hash: file.sha256Hash,
      fileCount: 1,
    }, req.ip);

    // Respond immediately
    successResponse(res, 'Re-extraction started.', { status: 'processing' });

    // Process in background
    setImmediate(async () => {
      await processFile(file, file.case, req.user._id, req.ip);
      await updateCaseStats(file.case);
    });
  } catch (err) {
    next(err);
  }
};

exports.getExtractionStatus = async (req, res, next) => {
  try {
    const { caseId } = req.params;

    const caseData = await Case.findOne({ _id: caseId, investigator: req.user._id });
    if (!caseData) {
      return errorResponse(res, 'Case not found.', 404);
    }

    const pending = await FileRecord.countDocuments({ case: caseId, status: 'pending' });
    const processing = await FileRecord.countDocuments({ case: caseId, status: 'processing' });
    const processed = await FileRecord.countDocuments({ case: caseId, status: 'processed' });
    const failed = await FileRecord.countDocuments({ case: caseId, status: 'failed' });
    const totalEvents = await Event.countDocuments({ case: caseId });

    return successResponse(res, 'Extraction status retrieved.', {
      pending,
      processing,
      processed,
      failed,
      total: pending + processing + processed + failed,
      totalEvents,
      isComplete: pending === 0 && processing === 0,
    });
  } catch (err) {
    next(err);
  }
};
