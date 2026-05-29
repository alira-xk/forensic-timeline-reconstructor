const Event = require('../models/Event');
const Case = require('../models/Case');
const { successResponse, errorResponse, paginatedResponse } = require('../utils/response');

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

    return successResponse(res, `Event ${event.isBookmarked ? 'bookmarked' : 'unbookmarked'}.`, { event });
  } catch (err) { next(err); }
};
