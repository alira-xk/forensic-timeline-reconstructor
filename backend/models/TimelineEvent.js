const mongoose = require("mongoose");

const timelineEventSchema = new mongoose.Schema(
  {
    caseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Case",
      required: true,
    },
    fileId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "EvidenceFile",
      required: true,
    },
    eventType: {
      type: String,
      required: true,
    },
    timestamp: {
      type: Date,
      required: true,
    },
    rawTimestamp: {
      type: String,
      default: "",
    },
    source: {
      type: String,
      default: "",
    },
    description: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("TimelineEvent", timelineEventSchema);