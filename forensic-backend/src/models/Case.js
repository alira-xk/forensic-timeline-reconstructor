const mongoose = require('mongoose');

const caseSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Case title is required'],
      trim: true,
      maxlength: 200,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    caseNumber: {
      type: String,
      unique: true,
    },
    status: {
      type: String,
      enum: ['open', 'in_progress', 'closed', 'archived'],
      default: 'open',
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium',
    },
    category: {
      type: String,
      enum: ['cybercrime', 'fraud', 'data_breach', 'insider_threat', 'malware', 'other'],
      default: 'other',
    },
    investigator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    tags: {
      type: [String],
      default: [],
    },
    notes: {
      type: String,
      default: '',
    },
    stats: {
      totalFiles: { type: Number, default: 0 },
      processedFiles: { type: Number, default: 0 },
      failedFiles: { type: Number, default: 0 },
      totalEvents: { type: Number, default: 0 },
    },
  },
  {
    timestamps: true,
    collection: 'cases',
  }
);

caseSchema.pre('save', async function (next) {
  if (this.caseNumber) return next();
  try {
    const year = new Date().getFullYear();
    const latestCase = await mongoose
      .model('Case')
      .findOne({ caseNumber: { $regex: `^FTR-${year}-\\d{5}$` } })
      .sort({ caseNumber: -1 })
      .select('caseNumber')
      .lean();

    const latestSeq = latestCase?.caseNumber
      ? Number.parseInt(latestCase.caseNumber.split('-').pop(), 10)
      : 0;
    const seq = String((Number.isFinite(latestSeq) ? latestSeq : 0) + 1).padStart(5, '0');
    this.caseNumber = `FTR-${year}-${seq}`;
    next();
  } catch (err) {
    next(err);
  }
});

module.exports = mongoose.model('Case', caseSchema);
