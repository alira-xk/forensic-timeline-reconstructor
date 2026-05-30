const mongoose = require('mongoose');

const investigationNoteSchema = new mongoose.Schema(
  {
    case: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Case',
      required: true,
      index: true,
    },
    fileRecord: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FileRecord',
      default: null,
      index: true,
    },
    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event',
      default: null,
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    body: {
      type: String,
      required: true,
      trim: true,
      maxlength: 3000,
    },
    tags: {
      type: [String],
      default: [],
    },
    findingType: {
      type: String,
      enum: ['general', 'suspicious', 'needs_review', 'confirmed', 'contradiction', 'report'],
      default: 'general',
    },
  },
  {
    timestamps: true,
    collection: 'investigationnotes',
  }
);

investigationNoteSchema.index({ case: 1, createdAt: -1 });
investigationNoteSchema.index({ case: 1, findingType: 1, createdAt: -1 });

module.exports = mongoose.model('InvestigationNote', investigationNoteSchema);
