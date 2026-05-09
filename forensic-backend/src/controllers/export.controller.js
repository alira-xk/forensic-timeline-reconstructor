const Event = require('../models/Event');
const Case = require('../models/Case');
const { errorResponse } = require('../utils/response');
const { logAudit, AUDIT_ACTIONS } = require('../utils/auditLogger');
const { Parser } = require('json2csv');

const buildQuery = (caseId, query) => {
  const filter = { case: caseId };
  if (query.startDate || query.endDate) {
    filter.timestamp = {};
    if (query.startDate) filter.timestamp.$gte = new Date(query.startDate);
    if (query.endDate) filter.timestamp.$lte = new Date(query.endDate);
  }
  if (query.eventType) filter.eventType = { $in: query.eventType.split(',') };
  if (query.eventSource) filter.eventSource = { $in: query.eventSource.split(',') };
  if (query.fileId) filter.fileRecord = query.fileId;
  if (query.bookmarked === 'true') filter.isBookmarked = true;
  if (query.search) {
    filter.$or = [
      { title: { $regex: query.search, $options: 'i' } },
      { description: { $regex: query.search, $options: 'i' } },
    ];
  }
  return filter;
};

exports.exportJSON = async (req, res, next) => {
  try {
    const { caseId } = req.params;
    const caseData = await Case.findOne({ _id: caseId, investigator: req.user._id });
    if (!caseData) return errorResponse(res, 'Case not found.', 404);

    const filter = buildQuery(caseId, req.query);
    const events = await Event.find(filter)
      .sort({ timestamp: 1 })
      .populate('fileRecord', 'originalName fileType');

    const filename = `${caseData.caseNumber}_timeline_${Date.now()}.json`;
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    logAudit(req.user._id, AUDIT_ACTIONS.EXPORT_GENERATED, 'Case', caseId, { format: 'json', count: events.length }, req.ip);

    return res.json({
      caseNumber: caseData.caseNumber,
      caseTitle: caseData.title,
      exportDate: new Date().toISOString(),
      totalEvents: events.length,
      events,
    });
  } catch (err) { next(err); }
};

exports.exportCSV = async (req, res, next) => {
  try {
    const { caseId } = req.params;
    const caseData = await Case.findOne({ _id: caseId, investigator: req.user._id });
    if (!caseData) return errorResponse(res, 'Case not found.', 404);

    const filter = buildQuery(caseId, req.query);
    const events = await Event.find(filter)
      .sort({ timestamp: 1 })
      .populate('fileRecord', 'originalName fileType')
      .lean();

    const rows = events.map((e) => ({
      timestamp: e.timestamp,
      originalTimestamp: e.originalTimestamp,
      eventType: e.eventType,
      eventSource: e.eventSource,
      title: e.title,
      description: e.description,
      confidence: e.confidence,
      sourceFile: e.fileRecord?.originalName || '',
      isBookmarked: e.isBookmarked,
      tags: (e.tags || []).join('; '),
    }));

    const parser = new Parser({
      fields: ['timestamp', 'originalTimestamp', 'eventType', 'eventSource', 'title', 'description', 'confidence', 'sourceFile', 'isBookmarked', 'tags'],
    });
    const csv = parser.parse(rows);

    const filename = `${caseData.caseNumber}_timeline_${Date.now()}.csv`;
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    logAudit(req.user._id, AUDIT_ACTIONS.EXPORT_GENERATED, 'Case', caseId, { format: 'csv', count: events.length }, req.ip);

    return res.send(csv);
  } catch (err) { next(err); }
};
