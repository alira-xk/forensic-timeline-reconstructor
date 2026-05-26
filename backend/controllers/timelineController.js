const TimelineEvent = require("../models/TimelineEvent");

const getTimelineByCase = async (req, res) => {
  try {
    const { caseId } = req.params;

    const events = await TimelineEvent.find({ caseId })
      .populate("fileId", "originalName fileType hash")
      .sort({ timestamp: 1 });

    res.status(200).json({
      success: true,
      count: events.length,
      data: events,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch timeline events",
      error: error.message,
    });
  }
};

const createTestTimelineEvent = async (req, res) => {
  try {
    const { caseId } = req.params;
    const { fileId, eventType, timestamp, rawTimestamp, source, description } = req.body;

    if (!fileId || !eventType || !timestamp) {
      return res.status(400).json({
        success: false,
        message: "fileId, eventType and timestamp are required",
      });
    }

    const event = await TimelineEvent.create({
      caseId,
      fileId,
      eventType,
      timestamp,
      rawTimestamp,
      source,
      description,
    });

    res.status(201).json({
      success: true,
      message: "Timeline event created successfully",
      data: event,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to create timeline event",
      error: error.message,
    });
  }
};

module.exports = {
  getTimelineByCase,
  createTestTimelineEvent,
};