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

// Create uploads directory
const uploadDir = process.env.UPLOAD_DIR || './uploads';
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
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', require('./src/routes/auth.routes'));
app.use('/api/cases', require('./src/routes/case.routes'));
app.use('/api/files', require('./src/routes/file.routes'));
app.use('/api/extraction', require('./src/routes/extraction.routes'));
app.use('/api/timeline', require('./src/routes/timeline.routes'));
app.use('/api/export', require('./src/routes/export.routes'));
app.use('/api/dashboard', require('./src/routes/dashboard.routes'));

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

// MongoDB connection and server start
const startServer = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
    });
    logger.info('Connected to MongoDB', { uri: process.env.MONGODB_URI.replace(/\/\/.*@/, '//<credentials>@') });

    app.listen(PORT, '0.0.0.0', () => {
      logger.info(`Server running on port ${PORT}`, { env: process.env.NODE_ENV || 'development' });
      console.log(`\n  Forensic Timeline Reconstructor API`);
      console.log(`  ====================================`);
      console.log(`  Local:    http://localhost:${PORT}`);
      console.log(`  Health:   http://localhost:${PORT}/api/health\n`);
    });
  } catch (err) {
    logger.error('Failed to start server', { error: err.message });
    console.error('FATAL: Could not connect to MongoDB. Is it running?');
    console.error(err.message);
    process.exit(1);
  }
};

startServer();

module.exports = app;
