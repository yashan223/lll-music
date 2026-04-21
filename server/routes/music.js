const express = require('express');
const router = express.Router();
const { protect, optionalAuth } = require('../middleware/auth');
const { upload, handleUploadError } = require('../middleware/upload');
const {
  uploadSong,
  getSongs,
  getSongById,
  streamSong,
  toggleLike,
  deleteSong,
  getRecentlyPlayed,
} = require('../controllers/musicController');

// POST /api/music/upload — upload MP3 + cover (protected)
router.post(
  '/upload',
  protect,
  upload.fields([
    { name: 'audio', maxCount: 1 },
    { name: 'cover', maxCount: 1 },
  ]),
  handleUploadError,
  uploadSong
);

// GET /api/music — list/search songs
router.get('/', optionalAuth, getSongs);

// GET /api/music/recent — recently played (protected)
router.get('/recent', protect, getRecentlyPlayed);

// GET /api/music/:id — single song
router.get('/:id', optionalAuth, getSongById);

// GET /api/music/:id/stream — stream audio file
router.get('/:id/stream', optionalAuth, streamSong);

// POST /api/music/:id/like — toggle like
router.post('/:id/like', protect, toggleLike);

// DELETE /api/music/:id — delete song (uploader only)
router.delete('/:id', protect, deleteSong);

module.exports = router;
