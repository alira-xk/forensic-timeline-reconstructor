require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');
const logger = require('./src/utils/logger');
const errorHandler = require('./src/middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 5000;
const BASE_DIR = path.resolve(__dirname);

// Create uploads directory (always relative to backend root unless absolute path is provided)
const uploadDir = path.resolve(BASE_DIR, process.env.UPLOAD_DIR || 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Security middleware
app.use(helmet());
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  message: { success: false, message: 'Too many requests. Please try again later.', timestamp: new Date().toISOString() },
});
app.use('/api/', limiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// HTTP request logging
app.use(morgan('combined', {
  stream: { write: (message) => logger.info(message.trim()) },
}));

// Static files for uploads
app.use('/uploads', express.static(uploadDir));

// Routes
app.use('/api/auth', require('./src/routes/auth.routes'));
app.use('/api/cases', require('./src/routes/case.routes'));
app.use('/api/files', require('./src/routes/file.routes'));
app.use('/api/extraction', require('./src/routes/extraction.routes'));
app.use('/api/timeline', require('./src/routes/timeline.routes'));
app.use('/api/export', require('./src/routes/export.routes'));
app.use('/api/dashboard', require('./src/routes/dashboard.routes'));
app.use('/api/notes', require('./src/routes/note.routes'));
app.use('/api/ai', require('./src/routes/ai.routes'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Forensic Timeline Reconstructor API is running.',
    data: {
      version: '1.0.0',
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
    },
    timestamp: new Date().toISOString(),
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.path} not found.`,
    timestamp: new Date().toISOString(),
  });
});

// Global error handler
app.use(errorHandler);

const redactMongoUri = (uri = '') => uri.replace(/\/\/.*@/, '//<credentials>@');

const isLocalMongoUri = (uri = '') => (
  uri.includes('localhost') ||
  uri.includes('127.0.0.1') ||
  uri.includes('::1')
);

const removeLegacyAuditTtlIndex = async () => {
  try {
    const collection = mongoose.connection.collection('auditlogs');
    const indexes = await collection.indexes();
    const legacyTtlIndex = indexes.find(
      (index) => index.key?.createdAt === 1 && index.expireAfterSeconds
    );

    if (legacyTtlIndex) {
      await collection.dropIndex(legacyTtlIndex.name);
      logger.info('Removed legacy audit log TTL index', { index: legacyTtlIndex.name });
    }
  } catch (err) {
    if (err.codeName !== 'NamespaceNotFound') {
      logger.warn('Could not remove legacy audit log TTL index', { error: err.message });
    }
  }
};

// MongoDB connection and server start
const startServer = async () => {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI is required. Set it to your MongoDB connection string.');
    }

    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
    });
    logger.info('Connected to MongoDB', { uri: redactMongoUri(process.env.MONGODB_URI) });
    await removeLegacyAuditTtlIndex();

    app.listen(PORT, '0.0.0.0', () => {
      logger.info(`Server running on port ${PORT}`, { env: process.env.NODE_ENV || 'development' });
      console.log(`\n  Forensic Timeline Reconstructor API`);
      console.log(`  ====================================`);
      console.log(`  Local:    http://localhost:${PORT}`);
      console.log(`  Health:   http://localhost:${PORT}/api/health\n`);
    });
  } catch (err) {
    logger.error('Failed to connect to MongoDB', { error: err.message });
    console.error('FATAL: Could not connect to MongoDB.');
    console.error('Check MONGODB_URI in forensic-backend/.env and make sure MongoDB is running.');
    if (isLocalMongoUri(process.env.MONGODB_URI)) {
      console.error('Your MONGODB_URI points to a local MongoDB instance. Other laptops cannot use your laptop database when your laptop is off.');
      console.error('For shared use, create a MongoDB Atlas database and set MONGODB_URI to the mongodb+srv:// connection string on every developer machine.');
    }
    console.error(err.message);
    process.exit(1);
  }
};

if (require.main === module) {
  startServer();
}

module.exports = { app, startServer };
