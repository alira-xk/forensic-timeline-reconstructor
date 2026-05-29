const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    action: {
      type: String,
      required: true,
      enum: [
        'LOGIN',
        'LOGOUT',
        'REGISTER',
        'TOKEN_REFRESH',
        'CASE_CREATED',
        'CASE_UPDATED',
        'CASE_DELETED',
        'FILE_UPLOADED',
        'FILE_DELETED',
        'EXTRACTION_STARTED',
        'EXTRACTION_COMPLETED',
        'EXTRACTION_FAILED',
        'EXPORT_GENERATED',
        'PROFILE_UPDATED',
        'PASSWORD_CHANGED',
        'PASSWORD_RESET_REQUESTED',
        'PASSWORD_RESET_COMPLETED',
      ],
    },
    resource: {
      type: String,
      default: '',
    },
    resourceId: {
      type: String,
      default: '',
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    ipAddress: {
      type: String,
      default: '',
    },
    success: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    collection: 'auditlogs',
  }
);

// TTL index — auto-delete audit logs after 90 days
auditLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7776000 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
