const { Playlist, Song, User } = require('../models');

exports.createPlaylist = async (req, res) => {
  try {
    const { name, description, isPublic } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Playlist name is required.' });

    const playlist = await Playlist.create({
      name: name.trim(),
      description: description ? description.trim() : '',
      ownerId: req.user.id,
      isPublic: isPublic === true || isPublic === 'true',
    });

    res.status(201).json({ success: true, playlist });
  } catch (err) {
    console.error('CreatePlaylist error:', err);
    res.status(500).json({ success: false, message: 'Failed to create playlist.' });
  }
};

exports.getMyPlaylists = async (req, res) => {
  try {
    const playlists = await Playlist.findAll({
      where: { ownerId: req.user.id },
      order: [['updatedAt', 'DESC']],
      include: [{ model: Song, attributes: ['id', 'title', 'artist', 'coverPath', 'duration'] }]
    });
    
    // Format response to maintain backwards compatibility
    const formatted = playlists.map(pl => {
      const p = pl.toJSON();
      p._id = p.id;
      p.songCount = p.Songs ? p.Songs.length : 0;
      return p;
    });

    res.json({ success: true, playlists: formatted });
  } catch (err) {
    console.error('GetPlaylists error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch playlists.' });
  }
};

exports.getPlaylist = async (req, res) => {
  try {
    const playlist = await Playlist.findByPk(req.params.id, {
      include: [{
        model: Song,
        include: [
          { model: User, as: 'uploadedBy', attributes: ['username'] },
          { model: User, as: 'likes', attributes: ['id'] }
        ]
      }]
    });

    if (!playlist) return res.status(404).json({ success: false, message: 'Playlist not found.' });

    const isOwner = playlist.ownerId === req.user.id;
    if (!playlist.isPublic && !isOwner) {
      return res.status(403).json({ success: false, message: 'This playlist is private.' });
    }

    const p = playlist.toJSON();
    p._id = p.id;
    p.songs = (p.Songs || []).map(song => {
      song._id = song.id;
      return { song }; // wrap in { song: ... } for frontend compatibility
    });
    
    res.json({ success: true, playlist: p });
  } catch (err) {
    console.error('GetPlaylist error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch playlist.' });
  }
};

exports.addSong = async (req, res) => {
  try {
    const { songId } = req.body;
    if (!songId) return res.status(400).json({ success: false, message: 'songId is required.' });

    const playlist = await Playlist.findByPk(req.params.id);
    const song = await Song.findByPk(songId);

    if (!playlist) return res.status(404).json({ success: false, message: 'Playlist not found.' });
    if (!song) return res.status(404).json({ success: false, message: 'Song not found.' });

    if (playlist.ownerId !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not your playlist.' });
    }

    const hasSong = await playlist.hasSong(songId);
    if (hasSong) return res.status(409).json({ success: false, message: 'Song is already in this playlist.' });

    await playlist.addSong(songId);
    res.json({ success: true, message: 'Song added to playlist.' });
  } catch (err) {
    console.error('AddSong error:', err);
    res.status(500).json({ success: false, message: 'Failed to add song.' });
  }
};

exports.removeSong = async (req, res) => {
  try {
    const playlist = await Playlist.findByPk(req.params.id);
    if (!playlist) return res.status(404).json({ success: false, message: 'Playlist not found.' });

    if (playlist.ownerId !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not your playlist.' });
    }

    await playlist.removeSong(req.params.songId);
    res.json({ success: true, message: 'Song removed from playlist.' });
  } catch (err) {
    console.error('RemoveSong error:', err);
    res.status(500).json({ success: false, message: 'Failed to remove song.' });
  }
};

exports.deletePlaylist = async (req, res) => {
  try {
    const playlist = await Playlist.findByPk(req.params.id);
    if (!playlist) return res.status(404).json({ success: false, message: 'Playlist not found.' });

    if (playlist.ownerId !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not your playlist.' });
    }

    await playlist.destroy();
    res.json({ success: true, message: 'Playlist deleted.' });
  } catch (err) {
    console.error('DeletePlaylist error:', err);
    res.status(500).json({ success: false, message: 'Failed to delete playlist.' });
  }
};
