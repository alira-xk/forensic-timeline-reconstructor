const mongoose = require('mongoose');

const fileRecordSchema = new mongoose.Schema(
  {
    case: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Case',
      required: true,
      index: true,
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
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
    filePath: {
      type: String,
      required: true,
    },
    mimeType: {
      type: String,
      default: 'application/octet-stream',
    },
    fileType: {
      type: String,
      enum: ['doc', 'docx', 'pdf', 'image', 'log', 'txt', 'unknown'],
      default: 'unknown',
    },
    fileSize: {
      type: Number,
      default: 0,
    },
    sha256Hash: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: ['pending', 'processing', 'processed', 'failed'],
      default: 'pending',
    },
    errorReason: {
      type: String,
      default: '',
    },
    eventsExtracted: {
      type: Number,
      default: 0,
    },
    extractedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    collection: 'filerecords',
  }
);

module.exports = mongoose.model('FileRecord', fileRecordSchema);
