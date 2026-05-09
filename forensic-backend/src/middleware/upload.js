const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const { errorResponse } = require('../utils/response');

const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';
const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE) || 52428800; // 50MB

const ALLOWED_MIMES = [
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
  if (ext === '.docx' || mimetype.includes('wordprocessingml')) return 'docx';
  if (ext === '.pdf' || mimetype === 'application/pdf') return 'pdf';
  if (mimetype.startsWith('image/')) return 'image';
  if (ext === '.log' || ext === '.txt' || mimetype.startsWith('text/')) return 'log';
  return 'unknown';
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
  // Allow most file types for forensic analysis
  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE },
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
    return errorResponse(res, 'Error computing file hashes.', 500);
  }
};

module.exports = { upload, computeSha256, getFileType, UPLOAD_DIR };
