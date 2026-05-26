const fs = require("fs");
const path = require("path");
const { Parser } = require("json2csv");
const TimelineEvent = require("../models/TimelineEvent");

const getTimelineEvents = async (caseId) => {
  const events = await TimelineEvent.find({ caseId })
    .populate("fileId", "originalName fileType hash")
    .sort({ timestamp: 1 });

  return events.map((event) => ({
    timestamp: event.timestamp,
    eventType: event.eventType,
    fileName: event.fileId?.originalName || "N/A",
    fileType: event.fileId?.fileType || "N/A",
    hash: event.fileId?.hash || "N/A",
    source: event.source,
    rawTimestamp: event.rawTimestamp,
    description: event.description,
  }));
};

const exportTimelineJSON = async (req, res) => {
  try {
    const { caseId } = req.params;

    const timelineData = await getTimelineEvents(caseId);

    if (timelineData.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No timeline events found for this case",
      });
    }

    const exportsDir = path.join(__dirname, "../exports");

    if (!fs.existsSync(exportsDir)) {
      fs.mkdirSync(exportsDir);
    }

    const fileName = `timeline-${caseId}-${Date.now()}.json`;
    const filePath = path.join(exportsDir, fileName);

    fs.writeFileSync(filePath, JSON.stringify(timelineData, null, 2));

    res.download(filePath, fileName);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to export timeline as JSON",
      error: error.message,
    });
  }
};

const exportTimelineCSV = async (req, res) => {
  try {
    const { caseId } = req.params;

    const timelineData = await getTimelineEvents(caseId);

    if (timelineData.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No timeline events found for this case",
      });
    }

    const fields = [
      "timestamp",
      "eventType",
      "fileName",
      "fileType",
      "hash",
      "source",
      "rawTimestamp",
      "description",
    ];

    const parser = new Parser({ fields });
    const csv = parser.parse(timelineData);

    const exportsDir = path.join(__dirname, "../exports");

    if (!fs.existsSync(exportsDir)) {
      fs.mkdirSync(exportsDir);
    }

    const fileName = `timeline-${caseId}-${Date.now()}.csv`;
    const filePath = path.join(exportsDir, fileName);

    fs.writeFileSync(filePath, csv);

    res.download(filePath, fileName);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to export timeline as CSV",
      error: error.message,
    });
  }
};

module.exports = {
  exportTimelineJSON,
  exportTimelineCSV,
};