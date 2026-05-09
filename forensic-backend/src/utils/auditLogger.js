const logger = require('./logger');

let AuditLog;

const getAuditLogModel = () => {
  if (!AuditLog) {
    AuditLog = require('../models/AuditLog');
  }
  return AuditLog;
};

const logAudit = async (userId, action, resource, resourceId, details = {}, ipAddress = '', success = true) => {
  try {
    const Model = getAuditLogModel();
    await Model.create({
      user: userId,
      action,
      resource,
      resourceId,
      details,
      ipAddress,
      success,
    });
  } catch (err) {
    logger.warn('Audit log failed (non-blocking)', {
      action,
      resource,
      resourceId,
      error: err.message,
    });
  }
};

const AUDIT_ACTIONS = {
  LOGIN: 'LOGIN',
  LOGOUT: 'LOGOUT',
  REGISTER: 'REGISTER',
  TOKEN_REFRESH: 'TOKEN_REFRESH',
  CASE_CREATED: 'CASE_CREATED',
  CASE_UPDATED: 'CASE_UPDATED',
  CASE_DELETED: 'CASE_DELETED',
  FILE_UPLOADED: 'FILE_UPLOADED',
  FILE_DELETED: 'FILE_DELETED',
  EXTRACTION_STARTED: 'EXTRACTION_STARTED',
  EXTRACTION_COMPLETED: 'EXTRACTION_COMPLETED',
  EXTRACTION_FAILED: 'EXTRACTION_FAILED',
  EXPORT_GENERATED: 'EXPORT_GENERATED',
  PROFILE_UPDATED: 'PROFILE_UPDATED',
  PASSWORD_CHANGED: 'PASSWORD_CHANGED',
};

module.exports = { logAudit, AUDIT_ACTIONS };
