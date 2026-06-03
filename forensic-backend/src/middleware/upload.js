const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');
const { errorResponse } = require('../utils/response');
const Case = require('../models/Case');

const BASE_DIR = path.resolve(__dirname, '../..');
const UPLOAD_DIR = path.resolve(BASE_DIR, process.env.UPLOAD_DIR || 'uploads');
const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE) || 52428800; // 50MB
const MAX_FILES_PER_UPLOAD = parseInt(process.env.MAX_FILES_PER_UPLOAD, 10) || 100;

const ALLOWED_MIMES = [
  'application/msword', // doc
  'application/vnd.ms-word', // doc
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // docx
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/tiff',
  'image/gif',
  'image/webp',
  'text/plain',
  'text/csv',
  'application/octet-stream',
  'text/x-log',
  'application/x-log',
];

const getFileType = (mimetype, originalname) => {
  const ext = path.extname(originalname).toLowerCase();
  if (ext === '.log' || ext === '.txt' || ext === '.csv') return 'log';
  if (ext === '.doc' || mimetype === 'application/msword' || mimetype === 'application/vnd.ms-word') return 'doc';
  if (ext === '.docx' || mimetype.includes('wordprocessingml')) return 'docx';
  if (ext === '.pdf' || mimetype === 'application/pdf') return 'pdf';
  if (mimetype.startsWith('image/')) return 'image';
  if (mimetype.startsWith('text/')) return 'log';
  return 'unknown';
};

const isSupportedFile = (file) => {
  const ext = path.extname(file.originalname || '').toLowerCase();
  const type = getFileType(file.mimetype || '', file.originalname || '');
  return type !== 'unknown' || ['.log', '.txt', '.csv'].includes(ext);
};

const ensureCaseUploadAccess = async (req, res, next) => {
  try {
    const { caseId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(caseId)) {
      return errorResponse(res, 'Case not found.', 404);
    }

    const caseData = await Case.findOne({ _id: caseId, investigator: req.user._id }).select('_id');
    if (!caseData) {
      return errorResponse(res, 'Case not found.', 404);
    }

    req.caseData = caseData;
    next();
  } catch (err) {
    next(err);
  }
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const caseId = req.params.caseId;
    const uploadPath = path.join(UPLOAD_DIR, caseId);
    fs.mkdirSync(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

const fileFilter = (req, file, cb) => {
  if (!isSupportedFile(file)) {
    return cb(new Error('Unsupported file type. Upload DOC, DOCX, PDF, image, TXT, LOG, or CSV evidence files.'));
  }
  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: MAX_FILES_PER_UPLOAD,
  },
});

const computeSha256 = async (req, res, next) => {
  if (!req.files || req.files.length === 0) {
    return next();
  }

  try {
    const hashPromises = req.files.map((file) => {
      return new Promise((resolve, reject) => {
        const hash = crypto.createHash('sha256');
        const stream = fs.createReadStream(file.path);
        stream.on('data', (data) => hash.update(data));
        stream.on('end', () => {
          file.sha256Hash = hash.digest('hex');
          file.fileType = getFileType(file.mimetype, file.originalname);
          resolve();
        });
        stream.on('error', reject);
      });
    });

    await Promise.all(hashPromises);
    next();
  } catch (err) {
    for (const file of req.files) {
      try {
        if (file.path && fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      } catch (cleanupErr) {
        // Ignore cleanup failures; the hash error is the important response.
      }
    }
    return errorResponse(res, 'Error computing file hashes.', 500);
  }
};

const handleUploadErrors = (err, req, res, next) => {
  if (!err) {
    return next();
  }

  if (req.files?.length) {
    for (const file of req.files) {
      try {
        if (file.path && fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      } catch (cleanupErr) {
        // Ignore cleanup failures; the upload request should still fail clearly.
      }
    }
  }

  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return errorResponse(res, `File is too large. Maximum size is ${Math.round(MAX_FILE_SIZE / 1024 / 1024)} MB.`, 413);
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return errorResponse(res, `Too many files selected. Upload up to ${MAX_FILES_PER_UPLOAD} files at once.`, 413);
    }
    return errorResponse(res, err.message || 'File upload failed.', 400);
  }

  return errorResponse(res, err.message || 'File upload failed.', 400);
};

module.exports = {
  upload,
  computeSha256,
  ensureCaseUploadAccess,
  handleUploadErrors,
  getFileType,
  UPLOAD_DIR,
  MAX_FILES_PER_UPLOAD,
};
