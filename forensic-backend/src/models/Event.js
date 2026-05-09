const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema(
  {
    case: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Case',
      required: true,
    },
    fileRecord: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FileRecord',
      required: true,
    },
    timestamp: {
      type: Date,
      required: true,
    },
    originalTimestamp: {
      type: String,
      default: '',
    },
    eventType: {
      type: String,
      enum: [
        'file_created',
        'file_modified',
        'file_accessed',
        'file_printed',
        'author_info',
        'metadata',
        'exif_datetime',
        'gps_location',
        'log_entry',
        'log_error',
        'log_warning',
        'log_info',
        'document_property',
        'custom',
      ],
      default: 'custom',
    },
    eventSource: {
      type: String,
      enum: ['docx', 'pdf', 'image', 'log', 'txt'],
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      default: '',
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    confidence: {
      type: Number,
      min: 0,
      max: 100,
      default: 50,
    },
    tags: {
      type: [String],
      default: [],
    },
    isBookmarked: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    collection: 'events',
  }
);

eventSchema.index({ case: 1, timestamp: 1 });
eventSchema.index({ case: 1, eventType: 1 });
eventSchema.index({ fileRecord: 1 });

module.exports = mongoose.model('Event', eventSchema);
