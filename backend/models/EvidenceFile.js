const mongoose = require("mongoose");

const evidenceFileSchema = new mongoose.Schema(
  {
    caseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Case",
      required: true,
    },
    originalName: {
      type: String,
      required: true,
    },
    storedName: {
      type: String,
      required: true,
    },
    fileType: {
      type: String,
      required: true,
    },
    mimeType: {
      type: String,
      required: true,
    },
    filePath: {
      type: String,
      required: true,
    },
    hash: {
      type: String,
      required: true,
    },
    size: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ["PENDING", "PROCESSING", "PROCESSED", "FAILED"],
      default: "PENDING",
    },
    errorReason: {
      type: String,
      default: "",
    },
  },
  {
    timestamps:{
      type: String,
    required: true,
    }
  }
);

module.exports = mongoose.model("EvidenceFile", evidenceFileSchema);