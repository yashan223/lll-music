const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure upload directories exist
const musicDir = path.join(__dirname, '../uploads/music');
const coversDir = path.join(__dirname, '../uploads/covers');
[musicDir, coversDir].forEach((dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// ─── Storage Configuration ────────────────────────────────────────────────────

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (file.fieldname === 'audio') {
      cb(null, musicDir);
    } else if (file.fieldname === 'cover') {
      cb(null, coversDir);
    } else {
      cb(new Error('Unknown file field'), null);
    }
  },
  filename: (req, file, cb) => {
    // Sanitize original name and prepend timestamp to avoid collisions
    const sanitized = file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '_');
    const unique = `${Date.now()}-${sanitized}`;
    cb(null, unique);
  },
});

// ─── File Filter ──────────────────────────────────────────────────────────────

const fileFilter = (req, file, cb) => {
  if (file.fieldname === 'audio') {
    if (file.mimetype === 'audio/mpeg' || file.originalname.toLowerCase().endsWith('.mp3')) {
      cb(null, true);
    } else {
      cb(new Error('Only MP3 audio files are allowed'), false);
    }
  } else if (file.fieldname === 'cover') {
    const allowedImageTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (allowedImageTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Cover must be a JPEG, PNG, WebP, or GIF image'), false);
    }
  } else {
    cb(new Error('Unexpected file field'), false);
  }
};

// ─── Multer Instance ──────────────────────────────────────────────────────────

const upload = multer({
  storage,
  fileFilter,
  limits: {
    // Audio: 50MB, Cover: 5MB
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 52428800,
  },
});

// ─── Upload Error Handler Middleware ──────────────────────────────────────────

const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File is too large. Maximum audio size is 50MB, cover 5MB.',
      });
    }
    return res.status(400).json({ success: false, message: err.message });
  }
  if (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
  next();
};

module.exports = { upload, handleUploadError };
