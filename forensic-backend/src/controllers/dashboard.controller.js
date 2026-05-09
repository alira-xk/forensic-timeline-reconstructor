const Case = require('../models/Case');
const FileRecord = require('../models/FileRecord');
const Event = require('../models/Event');
const { successResponse } = require('../utils/response');

exports.getStats = async (req, res, next) => {
  try {
    const userId = req.user._id;

    // Get user's case IDs once
    const userCaseIds = await Case.find({ investigator: userId }).distinct('_id');

    const [totalCases, totalFiles, totalEvents, storageAgg, casesByStatus, recentCases, recentFiles] = await Promise.all([
      Case.countDocuments({ investigator: userId }),
      FileRecord.countDocuments({ case: { $in: userCaseIds } }),
      Event.countDocuments({ case: { $in: userCaseIds } }),
      FileRecord.aggregate([
        { $match: { case: { $in: userCaseIds } } },
        { $group: { _id: null, totalBytes: { $sum: '$fileSize' } } },
      ]),
      Case.aggregate([
        { $match: { investigator: userId } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      Case.find({ investigator: userId })
        .sort({ updatedAt: -1 })
        .limit(5)
        .select('title caseNumber status priority updatedAt stats'),
      FileRecord.find({ case: { $in: userCaseIds } })
        .sort({ createdAt: -1 })
        .limit(10)
        .select('originalName fileType status createdAt case')
        .populate('case', 'caseNumber title'),
    ]);

    const storageMB = storageAgg.length > 0
      ? Math.round((storageAgg[0].totalBytes / (1024 * 1024)) * 100) / 100
      : 0;

    return successResponse(res, 'Dashboard stats.', {
      totals: { cases: totalCases, files: totalFiles, events: totalEvents, storageMB },
      casesByStatus,
      recentCases,
      recentFiles,
    });
  } catch (err) { next(err); }
};
