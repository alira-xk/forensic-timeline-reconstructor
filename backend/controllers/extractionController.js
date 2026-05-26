const EvidenceFile = require("../models/EvidenceFile");
const TimelineEvent = require("../models/TimelineEvent");
const { runPythonExtractor } = require("../services/pythonService");

const normalizeTimestamp = (value) => {
  if (!value) {
    return new Date();
  }

  let timestamp = String(value).trim();

  // Fix invalid timestamp format like:
  // 2013-12-23T23:15:00+00:00Z
  if (timestamp.endsWith("+00:00Z")) {
    timestamp = timestamp.replace("+00:00Z", "Z");
  }

  if (timestamp.endsWith("-00:00Z")) {
    timestamp = timestamp.replace("-00:00Z", "Z");
  }

  // Fix duplicate Z issue if any extractor returns something like 2026-05-21T10:00:00ZZ
  timestamp = timestamp.replace(/Z+$/, "Z");

  const parsedDate = new Date(timestamp);

  if (Number.isNaN(parsedDate.getTime())) {
    return new Date();
  }

  return parsedDate;
};

const buildEventDescription = (event, file) => {
  if (event.description) {
    return event.description;
  }

  if (event.eventType?.includes("MODIFIED")) {
    return `Modified timestamp extracted from ${file.originalName}`;
  }

  if (event.eventType?.includes("CREATED")) {
    return `Created timestamp extracted from ${file.originalName}`;
  }

  if (event.eventType?.includes("ACCESSED")) {
    return `Accessed timestamp extracted from ${file.originalName}`;
  }

  return `Timeline event extracted from ${file.originalName}`;
};

const extractMetadataForCase = async (req, res) => {
  try {
    const { caseId } = req.params;

    const files = await EvidenceFile.find({
      caseId,
      status: { $in: ["PENDING", "FAILED"] },
    });

    if (files.length === 0) {
      return res.status(200).json({
        success: true,
        message: "No pending files found for extraction",
        extractedFiles: 0,
        eventsCreated: 0,
        results: [],
      });
    }

    let extractedFiles = 0;
    let eventsCreated = 0;
    const results = [];

    for (const file of files) {
      try {
        file.status = "PROCESSING";
        file.errorReason = "";
        await file.save();

        const result = await runPythonExtractor(file.filePath, file.fileType);

        if (!result || !result.success) {
          file.status = "FAILED";
          file.errorReason =
            result?.error || "Python extraction failed. No result returned.";
          await file.save();

          results.push({
            fileId: file._id,
            originalName: file.originalName,
            status: "FAILED",
            error: file.errorReason,
          });

          continue;
        }

        const extractedEvents = Array.isArray(result.events) ? result.events : [];
        let fileEventsCreated = 0;

        for (const event of extractedEvents) {
          const normalizedDate = normalizeTimestamp(event.timestamp);
          const rawTimestamp =
            event.rawTimestamp || event.timestamp || normalizedDate.toISOString();

          const eventType = event.eventType || "METADATA_EVENT";
          const source = event.source || "Metadata Extraction";
          const description = buildEventDescription(event, file);

          const existingEvent = await TimelineEvent.findOne({
            caseId,
            fileId: file._id,
            eventType,
            timestamp: normalizedDate,
          });

          if (!existingEvent) {
            await TimelineEvent.create({
              caseId,
              fileId: file._id,
              eventType,
              timestamp: normalizedDate,
              rawTimestamp,
              source,
              description,
            });

            eventsCreated++;
            fileEventsCreated++;
          }
        }

        file.status = "PROCESSED";
        file.errorReason = "";
        await file.save();

        extractedFiles++;

        results.push({
          fileId: file._id,
          originalName: file.originalName,
          status: "PROCESSED",
          eventsFound: extractedEvents.length,
          eventsCreated: fileEventsCreated,
        });
      } catch (error) {
        file.status = "FAILED";
        file.errorReason = error.message;
        await file.save();

        results.push({
          fileId: file._id,
          originalName: file.originalName,
          status: "FAILED",
          error: error.message,
        });
      }
    }

    return res.status(200).json({
      success: true,
      message: "Extraction completed",
      extractedFiles,
      eventsCreated,
      results,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Extraction process failed",
      error: error.message,
    });
  }
};

module.exports = {
  extractMetadataForCase,
};