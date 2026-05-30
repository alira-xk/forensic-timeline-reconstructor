const Case = require('../models/Case');
const Event = require('../models/Event');
const FileRecord = require('../models/FileRecord');
const InvestigationNote = require('../models/InvestigationNote');
const { successResponse, errorResponse, paginatedResponse } = require('../utils/response');
const { logAudit, AUDIT_ACTIONS } = require('../utils/auditLogger');

const ALLOWED_FINDING_TYPES = new Set([
  'general',
  'suspicious',
  'needs_review',
  'confirmed',
  'contradiction',
  'report',
]);

const normalizeTags = (tags) => {
  if (!Array.isArray(tags)) {
    return [];
  }

  return Array.from(
    new Set(
      tags
        .map((tag) => String(tag || '').trim().toLowerCase())
        .filter(Boolean)
        .slice(0, 8)
    )
  );
};

const verifyCaseOwnership = async (caseId, userId) => {
  return Case.findOne({ _id: caseId, investigator: userId });
};

const verifyLinkedResource = async ({ caseId, fileRecord, event }) => {
  if (fileRecord) {
    const file = await FileRecord.findOne({ _id: fileRecord, case: caseId });
    if (!file) {
      return false;
    }
  }

  if (event) {
    const timelineEvent = await Event.findOne({ _id: event, case: caseId });
    if (!timelineEvent) {
      return false;
    }
  }

  return true;
};

exports.getNotesByCase = async (req, res, next) => {
  try {
    const { caseId } = req.params;
    const { page = 1, limit = 50, findingType } = req.query;

    const caseData = await verifyCaseOwnership(caseId, req.user._id);
    if (!caseData) {
      return errorResponse(res, 'Case not found.', 404);
    }

    const query = { case: caseId };
    if (findingType && ALLOWED_FINDING_TYPES.has(findingType)) {
      query.findingType = findingType;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await InvestigationNote.countDocuments(query);
    const notes = await InvestigationNote.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('createdBy', 'name email role')
      .populate('fileRecord', 'originalName fileType sha256Hash')
      .populate('event', 'title eventType timestamp')
      .lean();

    return paginatedResponse(res, 'Investigation notes retrieved.', notes, {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / parseInt(limit)),
    });
  } catch (err) {
    next(err);
  }
};

exports.createNote = async (req, res, next) => {
  try {
    const {
      caseId,
      fileRecord = null,
      event = null,
      body,
      tags = [],
      findingType = 'general',
    } = req.body;

    if (!caseId) {
      return errorResponse(res, 'Case id is required.', 400);
    }

    if (!body || !String(body).trim()) {
      return errorResponse(res, 'Note text is required.', 400);
    }

    const caseData = await verifyCaseOwnership(caseId, req.user._id);
    if (!caseData) {
      return errorResponse(res, 'Case not found.', 404);
    }

    const linksAreValid = await verifyLinkedResource({ caseId, fileRecord, event });
    if (!linksAreValid) {
      return errorResponse(res, 'Linked evidence was not found in this case.', 400);
    }

    const note = await InvestigationNote.create({
      case: caseId,
      fileRecord,
      event,
      createdBy: req.user._id,
      body: String(body).trim(),
      tags: normalizeTags(tags),
      findingType: ALLOWED_FINDING_TYPES.has(findingType) ? findingType : 'general',
    });

    const populatedNote = await InvestigationNote.findById(note._id)
      .populate('createdBy', 'name email role')
      .populate('fileRecord', 'originalName fileType sha256Hash')
      .populate('event', 'title eventType timestamp');

    logAudit(req.user._id, AUDIT_ACTIONS.NOTE_CREATED, 'InvestigationNote', note._id.toString(), {
      caseId,
      noteId: note._id.toString(),
      fileId: fileRecord || null,
      eventId: event || null,
      findingType: note.findingType,
    }, req.ip);

    return successResponse(res, 'Investigation note created.', { note: populatedNote }, 201);
  } catch (err) {
    next(err);
  }
};

exports.updateNote = async (req, res, next) => {
  try {
    const { body, tags, findingType } = req.body;
    const note = await InvestigationNote.findById(req.params.id);

    if (!note) {
      return errorResponse(res, 'Investigation note not found.', 404);
    }

    const caseData = await verifyCaseOwnership(note.case, req.user._id);
    if (!caseData) {
      return errorResponse(res, 'Investigation note not found.', 404);
    }

    if (body !== undefined) {
      if (!String(body).trim()) {
        return errorResponse(res, 'Note text is required.', 400);
      }
      note.body = String(body).trim();
    }

    if (tags !== undefined) {
      note.tags = normalizeTags(tags);
    }

    if (findingType !== undefined && ALLOWED_FINDING_TYPES.has(findingType)) {
      note.findingType = findingType;
    }

    await note.save();

    const populatedNote = await InvestigationNote.findById(note._id)
      .populate('createdBy', 'name email role')
      .populate('fileRecord', 'originalName fileType sha256Hash')
      .populate('event', 'title eventType timestamp');

    logAudit(req.user._id, AUDIT_ACTIONS.NOTE_UPDATED, 'InvestigationNote', note._id.toString(), {
      caseId: note.case.toString(),
      noteId: note._id.toString(),
      findingType: note.findingType,
    }, req.ip);

    return successResponse(res, 'Investigation note updated.', { note: populatedNote });
  } catch (err) {
    next(err);
  }
};

exports.deleteNote = async (req, res, next) => {
  try {
    const note = await InvestigationNote.findById(req.params.id);

    if (!note) {
      return errorResponse(res, 'Investigation note not found.', 404);
    }

    const caseData = await verifyCaseOwnership(note.case, req.user._id);
    if (!caseData) {
      return errorResponse(res, 'Investigation note not found.', 404);
    }

    await InvestigationNote.findByIdAndDelete(note._id);

    logAudit(req.user._id, AUDIT_ACTIONS.NOTE_DELETED, 'InvestigationNote', note._id.toString(), {
      caseId: note.case.toString(),
      noteId: note._id.toString(),
      findingType: note.findingType,
    }, req.ip);

    return successResponse(res, 'Investigation note deleted.');
  } catch (err) {
    next(err);
  }
};
