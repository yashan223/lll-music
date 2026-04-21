const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  createPlaylist,
  getMyPlaylists,
  getPlaylist,
  addSong,
  removeSong,
  deletePlaylist,
} = require('../controllers/playlistController');

// All playlist routes require authentication
router.use(protect);

router.post('/', createPlaylist);
router.get('/', getMyPlaylists);
router.get('/:id', getPlaylist);
router.post('/:id/songs', addSong);
router.delete('/:id/songs/:songId', removeSong);
router.delete('/:id', deletePlaylist);

module.exports = router;
