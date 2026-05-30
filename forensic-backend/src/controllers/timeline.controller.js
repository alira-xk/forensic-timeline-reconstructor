const Event = require('../models/Event');
const Case = require('../models/Case');
const FileRecord = require('../models/FileRecord');
const { successResponse, errorResponse, paginatedResponse } = require('../utils/response');
const { logAudit, AUDIT_ACTIONS } = require('../utils/auditLogger');

exports.getTimeline = async (req, res, next) => {
  try {
    const { caseId } = req.params;
    const {
      page = 1, limit = 50, startDate, endDate,
      eventType, eventSource, search, fileId,
      sortOrder = 'asc', bookmarked,
    } = req.query;

    const caseData = await Case.findOne({ _id: caseId, investigator: req.user._id });
    if (!caseData) return errorResponse(res, 'Case not found.', 404);

    const query = { case: caseId };
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) query.timestamp.$lte = new Date(endDate);
    }
    if (eventType) query.eventType = { $in: eventType.split(',') };
    if (eventSource) query.eventSource = { $in: eventSource.split(',') };
    if (fileId) query.fileRecord = fileId;
    if (bookmarked === 'true') query.isBookmarked = true;
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Event.countDocuments(query);
    const events = await Event.find(query)
      .sort({ timestamp: sortOrder === 'desc' ? -1 : 1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('fileRecord', 'originalName fileType sha256Hash');

    return paginatedResponse(res, 'Timeline retrieved.', events, {
      page: parseInt(page), limit: parseInt(limit), total,
      pages: Math.ceil(total / parseInt(limit)),
    });
  } catch (err) { next(err); }
};

exports.getTimelineSummary = async (req, res, next) => {
  try {
    const { caseId } = req.params;
    const caseData = await Case.findOne({ _id: caseId, investigator: req.user._id });
    if (!caseData) return errorResponse(res, 'Case not found.', 404);

    const [byType, bySource, byDay, timeRange] = await Promise.all([
      Event.aggregate([
        { $match: { case: caseData._id } },
        { $group: { _id: '$eventType', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      Event.aggregate([
        { $match: { case: caseData._id } },
        { $group: { _id: '$eventSource', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      Event.aggregate([
        { $match: { case: caseData._id } },
        { $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
          count: { $sum: 1 },
        }},
        { $sort: { _id: 1 } },
      ]),
      Event.aggregate([
        { $match: { case: caseData._id } },
        { $group: {
          _id: null,
          earliest: { $min: '$timestamp' },
          latest: { $max: '$timestamp' },
          total: { $sum: 1 },
        }},
      ]),
    ]);

    return successResponse(res, 'Timeline summary.', {
      byType, bySource, byDay,
      timeRange: timeRange[0] || { earliest: null, latest: null, total: 0 },
    });
  } catch (err) { next(err); }
};

exports.getFilterOptions = async (req, res, next) => {
  try {
    const { caseId } = req.params;
    const caseData = await Case.findOne({ _id: caseId, investigator: req.user._id });
    if (!caseData) return errorResponse(res, 'Case not found.', 404);

    const [eventTypes, eventSources] = await Promise.all([
      Event.distinct('eventType', { case: caseId }),
      Event.distinct('eventSource', { case: caseId }),
    ]);

    return successResponse(res, 'Filter options.', { eventTypes, eventSources });
  } catch (err) { next(err); }
};

exports.toggleBookmark = async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.eventId);
    if (!event) return errorResponse(res, 'Event not found.', 404);

    const caseData = await Case.findOne({ _id: event.case, investigator: req.user._id });
    if (!caseData) return errorResponse(res, 'Event not found.', 404);

    event.isBookmarked = !event.isBookmarked;
    await event.save();

    logAudit(
      req.user._id,
      event.isBookmarked ? AUDIT_ACTIONS.EVENT_BOOKMARKED : AUDIT_ACTIONS.EVENT_UNBOOKMARKED,
      'Event',
      event._id.toString(),
      {
        caseId: event.case.toString(),
        eventId: event._id.toString(),
        fileId: event.fileRecord.toString(),
        title: event.title,
        eventType: event.eventType,
      },
      req.ip
    );

    return successResponse(res, `Event ${event.isBookmarked ? 'bookmarked' : 'unbookmarked'}.`, { event });
  } catch (err) { next(err); }
};

const getEventAuthor = (event) => {
  const metadata = event.metadata || {};
  const candidates = [
    metadata.author,
    metadata.last_modified_by,
    metadata.last_saved_by,
    metadata.creator,
    metadata.owner,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim()) {
      return candidate.trim();
    }
  }

  return null;
};

const getEventGps = (event) => {
  const metadata = event.metadata || {};

  const directGps = metadata.gps || metadata.gps_coordinates || metadata.gpsLocation;
  if (typeof directGps === 'string' && directGps.trim()) {
    return directGps.trim();
  }

  const latitude = metadata.latitude ?? metadata.lat;
  const longitude = metadata.longitude ?? metadata.lng ?? metadata.lon;
  if (latitude !== undefined && longitude !== undefined) {
    return `${latitude},${longitude}`;
  }

  return null;
};

const normalizeTimestampKey = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date.toISOString().slice(0, 19);
};

exports.getRelationshipGraph = async (req, res, next) => {
  try {
    const { caseId } = req.params;
    const caseData = await Case.findOne({ _id: caseId, investigator: req.user._id });
    if (!caseData) {
      return errorResponse(res, 'Case not found.', 404);
    }

    const [files, events] = await Promise.all([
      FileRecord.find({ case: caseData._id })
        .select('_id originalName fileType sha256Hash')
        .lean(),
      Event.find({ case: caseData._id })
        .select('_id fileRecord eventType title timestamp metadata')
        .sort({ timestamp: 1 })
        .lean(),
    ]);

    const nodes = [];
    const links = [];
    const nodeSet = new Set();
    const linkSet = new Set();

    const addNode = (id, type, label, extra = {}) => {
      if (nodeSet.has(id)) {
        return;
      }
      nodeSet.add(id);
      nodes.push({ id, type, label, ...extra });
    };

    const addLink = (source, target, relation) => {
      const key = `${source}|${target}|${relation}`;
      if (linkSet.has(key)) {
        return;
      }
      linkSet.add(key);
      links.push({ source, target, relation });
    };

    const caseNodeId = `case:${caseData._id.toString()}`;
    addNode(caseNodeId, 'case', caseData.title || caseData.caseNumber || 'Case', {
      caseNumber: caseData.caseNumber || '',
    });

    const fileNodeIds = new Map();
    for (const file of files) {
      const fileNodeId = `file:${file._id.toString()}`;
      fileNodeIds.set(file._id.toString(), fileNodeId);
      addNode(fileNodeId, 'file', file.originalName || 'Evidence File', {
        fileType: file.fileType || 'unknown',
      });
      addLink(caseNodeId, fileNodeId, 'contains');
    }

    const MAX_EVENT_NODES = 250;
    const MAX_TIMESTAMP_NODES = 120;
    const timestampNodeIds = new Map();

    for (const event of events.slice(0, MAX_EVENT_NODES)) {
      const eventNodeId = `event:${event._id.toString()}`;
      const eventLabel = event.title || event.eventType || 'Event';
      addNode(eventNodeId, 'event', eventLabel);

      const fileId = event.fileRecord ? event.fileRecord.toString() : null;
      const fileNodeId = fileId ? fileNodeIds.get(fileId) : null;
      if (fileNodeId) {
        addLink(fileNodeId, eventNodeId, 'produces');
      } else {
        addLink(caseNodeId, eventNodeId, 'relates_to');
      }

      const author = getEventAuthor(event);
      if (author) {
        const authorNodeId = `author:${author.toLowerCase()}`;
        addNode(authorNodeId, 'author', author);
        addLink(eventNodeId, authorNodeId, 'authored_by');
      }

      const gps = getEventGps(event);
      if (gps) {
        const gpsNodeId = `gps:${gps.toLowerCase()}`;
        addNode(gpsNodeId, 'gps', gps);
        addLink(eventNodeId, gpsNodeId, 'located_at');
      }

      const timestampKey = normalizeTimestampKey(event.timestamp);
      if (timestampKey) {
        let timestampNodeId = timestampNodeIds.get(timestampKey);
        if (!timestampNodeId && timestampNodeIds.size < MAX_TIMESTAMP_NODES) {
          timestampNodeId = `timestamp:${timestampKey}`;
          timestampNodeIds.set(timestampKey, timestampNodeId);
          addNode(timestampNodeId, 'timestamp', timestampKey.replace('T', ' '));
        }
        if (timestampNodeId) {
          addLink(eventNodeId, timestampNodeId, 'occurred_at');
        }
      }
    }

    return successResponse(res, 'Relationship graph retrieved.', {
      caseId: caseData._id.toString(),
      nodes,
      links,
      stats: {
        files: files.length,
        events: events.length,
        nodes: nodes.length,
        links: links.length,
      },
    });
  } catch (err) {
    next(err);
  }
};
