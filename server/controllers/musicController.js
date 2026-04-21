const fs = require('fs');
const path = require('path');
const { Op } = require('sequelize');
const { sequelize, Song, User, RecentlyPlayed } = require('../models');

exports.uploadSong = async (req, res) => {
  try {
    if (!req.files || !req.files.audio) {
      return res.status(400).json({ success: false, message: 'MP3 audio file is required.' });
    }

    // Explicitly enforce that only admins can upload music
    if (!req.user || !req.user.isAdmin) {
      return res.status(403).json({ success: false, message: 'Forbidden. Only admins can upload music.' });
    }

    let title = req.body.title || '';
    let artist = req.body.artist || '';
    let album = req.body.album || '';
    let genre = req.body.genre || '';

    const audioFile = req.files.audio[0];
    const coverFile = req.files.cover ? req.files.cover[0] : null;

    let duration = 0;
    try {
      const { parseFile } = await import('music-metadata');
      const metadata = await parseFile(audioFile.path);
      duration = Math.floor(metadata.format.duration || 0);
      
      if (!title && metadata.common.title) title = metadata.common.title;
      if (!artist && (metadata.common.artist || metadata.common.albumartist)) artist = metadata.common.artist || metadata.common.albumartist;
      if (!album && metadata.common.album) album = metadata.common.album;
      if (!genre && metadata.common.genre && metadata.common.genre.length > 0) genre = metadata.common.genre[0];
      
      // If no cover was uploaded but the MP3 has embedded cover art, we can extract it
      // However, we'll keep it simple for now and rely on manual cover uploads
    } catch {
      // Non-fatal
    }

    // Ultimate fallbacks
    if (!title) title = audioFile.originalname.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
    if (!artist) artist = 'Unknown Artist';

    const song = await Song.create({
      title: title.trim(),
      artist: artist.trim(),
      album: album ? album.trim() : 'Unknown Album',
      genre: genre ? genre.trim() : null,
      duration,
      filePath: `music/${audioFile.filename}`,
      fileName: audioFile.originalname,
      fileSize: audioFile.size,
      coverPath: coverFile ? `covers/${coverFile.filename}` : null,
      uploaderId: req.user.id,
    });

    const songWithUploader = await Song.findByPk(song.id, {
      include: [{ model: User, as: 'uploadedBy', attributes: ['id', 'username'] }]
    });

    res.status(201).json({
      success: true,
      message: 'Song uploaded successfully.',
      song: formatSong(songWithUploader.toJSON(), req),
    });
  } catch (err) {
    console.error('Upload error:', err);
    if (req.files?.audio?.[0]) cleanupFile(req.files.audio[0].path);
    if (req.files?.cover?.[0]) cleanupFile(req.files.cover[0].path);
    res.status(500).json({ success: false, message: 'Upload failed. Please try again.' });
  }
};

exports.getSongs = async (req, res) => {
  try {
    const { search = '', page = 1, limit = 20, sort = 'newest' } = req.query;

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit)));
    const offset = (pageNum - 1) * limitNum;

    let whereClause = { isPublic: true };
    if (search.trim()) {
      whereClause = {
        isPublic: true,
        [Op.or]: [
          { title: { [Op.like]: `%${search.trim()}%` } },
          { artist: { [Op.like]: `%${search.trim()}%` } },
          { album: { [Op.like]: `%${search.trim()}%` } },
        ]
      };
    }

    let orderClause = [['createdAt', 'DESC']];
    if (sort === 'oldest') orderClause = [['createdAt', 'ASC']];
    if (sort === 'popular') orderClause = [['plays', 'DESC']];
    if (sort === 'title') orderClause = [['title', 'ASC']];

    const { count, rows } = await Song.findAndCountAll({
      where: whereClause,
      order: orderClause,
      offset,
      limit: limitNum,
      include: [
        { model: User, as: 'uploadedBy', attributes: ['id', 'username'] },
        { model: User, as: 'likes', attributes: ['id'] }
      ],
      distinct: true
    });

    res.json({
      success: true,
      songs: rows.map(s => formatSong(s.toJSON(), req)),
      pagination: {
        total: count,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(count / limitNum),
        hasNextPage: pageNum < Math.ceil(count / limitNum),
        hasPrevPage: pageNum > 1,
      },
    });
  } catch (err) {
    console.error('GetSongs error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch songs.' });
  }
};

exports.getSongById = async (req, res) => {
  try {
    const song = await Song.findByPk(req.params.id, {
      include: [
        { model: User, as: 'uploadedBy', attributes: ['id', 'username'] },
        { model: User, as: 'likes', attributes: ['id'] }
      ]
    });
    if (!song) return res.status(404).json({ success: false, message: 'Song not found.' });
    res.json({ success: true, song: formatSong(song.toJSON(), req) });
  } catch (err) {
    console.error('GetSongById error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch song.' });
  }
};

exports.streamSong = async (req, res) => {
  try {
    const song = await Song.findByPk(req.params.id);
    if (!song) return res.status(404).json({ success: false, message: 'Song not found.' });

    const filePath = path.join(__dirname, '../uploads', song.filePath);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, message: 'Audio file not found on server.' });
    }

    const stat = fs.statSync(filePath);
    const fileSize = stat.size;
    const rangeHeader = req.headers.range;

    // Increment play count efficiently without triggering model hooks
    await Song.increment('plays', { by: 1, where: { id: req.params.id } });

    // Track recently played if authenticated
    if (req.user) {
      // Find history to cap at 50, but for now just insert new record simply
      await RecentlyPlayed.create({ UserId: req.user.id, SongId: song.id });
    }

    if (rangeHeader) {
      const parts = rangeHeader.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunkSize = end - start + 1;

      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunkSize,
        'Content-Type': 'audio/mpeg',
      });
      fs.createReadStream(filePath, { start, end }).pipe(res);
    } else {
      res.writeHead(200, {
        'Content-Length': fileSize,
        'Content-Type': 'audio/mpeg',
        'Accept-Ranges': 'bytes',
      });
      fs.createReadStream(filePath).pipe(res);
    }
  } catch (err) {
    console.error('Stream error:', err);
    res.status(500).json({ success: false, message: 'Streaming failed.' });
  }
};

exports.toggleLike = async (req, res) => {
  try {
    const song = await Song.findByPk(req.params.id, {
      include: [{ model: User, as: 'likes', attributes: ['id'] }]
    });
    if (!song) return res.status(404).json({ success: false, message: 'Song not found.' });

    const userId = req.user.id;
    const isLiked = song.likes.some(user => user.id === userId);

    if (isLiked) {
      await song.removeLike(userId);
    } else {
      await song.addLike(userId);
    }

    // Refresh song for new like count
    const updated = await Song.findByPk(req.params.id, {
      include: [{ model: User, as: 'likes', attributes: ['id'] }]
    });

    res.json({
      success: true,
      liked: !isLiked,
      likeCount: updated.likes.length,
    });
  } catch (err) {
    console.error('ToggleLike error:', err);
    res.status(500).json({ success: false, message: 'Failed to update like status.' });
  }
};

exports.deleteSong = async (req, res) => {
  try {
    const song = await Song.findByPk(req.params.id);
    if (!song) return res.status(404).json({ success: false, message: 'Song not found.' });

    const canDelete = req.user.isAdmin || song.uploaderId === req.user.id;
    if (!canDelete) {
      return res.status(403).json({ success: false, message: 'You do not have permission to delete this song.' });
    }

    const Favorites = sequelize.models.Favorites;
    const PlaylistSongs = sequelize.models.PlaylistSongs;

    await sequelize.transaction(async (transaction) => {
      // Remove dependent rows first to satisfy SQLite FK constraints.
      await RecentlyPlayed.destroy({ where: { SongId: song.id }, transaction });
      if (Favorites) {
        await Favorites.destroy({ where: { SongId: song.id }, transaction });
      }
      if (PlaylistSongs) {
        await PlaylistSongs.destroy({ where: { SongId: song.id }, transaction });
      }

      await song.destroy({ transaction });
    });

    cleanupFile(path.join(__dirname, '../uploads', song.filePath));
    if (song.coverPath) cleanupFile(path.join(__dirname, '../uploads', song.coverPath));

    res.json({ success: true, message: 'Song deleted successfully.' });
  } catch (err) {
    console.error('DeleteSong error:', err);
    res.status(500).json({ success: false, message: 'Failed to delete song.' });
  }
};

exports.getRecentlyPlayed = async (req, res) => {
  try {
    const recent = await RecentlyPlayed.findAll({
      where: { UserId: req.user.id },
      order: [['playedAt', 'DESC']],
      limit: 20,
      include: [{
        model: Song,
        include: [{ model: User, as: 'likes', attributes: ['id'] }]
      }]
    });

    // Remove duplicates based on song, keeping only the most recent
    const seenMap = new Map();
    recent.forEach((r) => {
      if (r.Song && !seenMap.has(r.SongId)) {
        seenMap.set(r.SongId, {
          ...formatSong(r.Song.toJSON(), req),
          playedAt: r.playedAt
        });
      }
    });

    res.json({ success: true, songs: Array.from(seenMap.values()) });
  } catch (err) {
    console.error('RecentlyPlayed error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch recently played.' });
  }
};

const formatSong = (song, req) => {
  const mins = Math.floor(song.duration / 60);
  const secs = Math.floor(song.duration % 60).toString().padStart(2, '0');
  const durationFormatted = `${mins}:${secs}`;
  const likesArr = song.likes ? song.likes.map(u => u.id) : [];
  const viewerCanDelete = !!(req?.user && (req.user.isAdmin || req.user.id === song.uploaderId));

  return {
    id: song.id,
    title: song.title,
    artist: song.artist,
    album: song.album,
    genre: song.genre,
    duration: song.duration,
    durationFormatted,
    coverUrl: song.coverPath ? `/uploads/${song.coverPath}` : null,
    streamUrl: `/api/music/${song.id}/stream`,
    uploaderId: song.uploaderId,
    uploadedBy: song.uploadedBy,
    canDelete: viewerCanDelete,
    likes: likesArr,
    likeCount: likesArr.length,
    plays: song.plays,
    fileSize: song.fileSize,
    createdAt: song.createdAt,
  };
};

const cleanupFile = (filePath) => {
  try {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  } catch {} // non-fatal
};
