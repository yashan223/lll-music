require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const { sequelize } = require('./models');
const authRoutes = require('./routes/auth');
const musicRoutes = require('./routes/music');
const playlistRoutes = require('./routes/playlist');
const { seedAdmin } = require('./controllers/authController');

const app = express();

// Ensure data folder exists
const dataPath = path.join(__dirname, 'data');
if (!fs.existsSync(dataPath)) fs.mkdirSync(dataPath);

// ─── CORS ────────────────────────────────────────────────────────────────────
const extraOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean);

const allowedOrigins = [
  process.env.CLIENT_URL,
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'https://xoxod33p.me',
  'http://xoxod33p.me',
  'https://www.xoxod33p.me',
  'http://www.xoxod33p.me',
  ...extraOrigins,
].filter(Boolean);

const domainPattern = /^https?:\/\/(?:[a-z0-9-]+\.)*xoxod33p\.me(?::\d+)?$/i;

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin) || domainPattern.test(origin)) {
      return callback(null, true);
    }
    return callback(new Error(`CORS blocked for origin: ${origin}`));
  },
  credentials: true,
}));

// ─── Body Parsing ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ─── Static File Serving (cover images) ──────────────────────────────────────
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/music', musicRoutes);
app.use('/api/playlists', playlistRoutes);

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── Global Error Handler ─────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  const status = err.status || err.statusCode || 500;
  res.status(status).json({
    success: false,
    message: err.message || 'Internal server error',
  });
});

// ─── Database + Server Start ──────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
const shouldAlterSchema = String(process.env.DB_SYNC_ALTER || 'false').toLowerCase() === 'true';
const syncOptions = shouldAlterSchema ? { alter: true } : {};

sequelize.sync(syncOptions).then(async () => {
  console.log('✅ Connected to SQLite database');
  if (shouldAlterSchema) {
    console.log('ℹ️  Database sync ran with alter mode enabled');
  }
  
  // Create admin user on boot
  await seedAdmin();

  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
  });
}).catch(err => {
  console.error('❌ SQLite connection error:', err.message);
  process.exit(1);
});
