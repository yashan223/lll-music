const { User, Song, Playlist } = require('../models');

exports.getAllUsers = async (req, res) => {
  try {
    // Only admins can see the full user list
    if (!req.user.isAdmin) {
      return res.status(403).json({ success: false, message: 'Forbidden. Admin access required.' });
    }

    const users = await User.findAll({
      attributes: ['id', 'username', 'email', 'isAdmin', 'createdAt'],
      include: [
        { model: Song, as: 'uploadedSongs', attributes: ['id'] },
        { model: Playlist, attributes: ['id'] }
      ]
    });

    const formattedUsers = users.map(user => {
      const u = user.toJSON();
      return {
        id: u.id,
        username: u.username,
        email: u.email,
        isAdmin: u.isAdmin,
        createdAt: u.createdAt,
        songCount: u.uploadedSongs ? u.uploadedSongs.length : 0,
        playlistCount: u.Playlists ? u.Playlists.length : 0
      };
    });

    res.json({ success: true, users: formattedUsers });
  } catch (err) {
    console.error('GetAllUsers error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch users.' });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ success: false, message: 'Forbidden. Admin access required.' });
    }

    const userToDelete = await User.findByPk(req.params.id);
    if (!userToDelete) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    if (userToDelete.isAdmin && userToDelete.email === 'yashan2003@test.com') {
      return res.status(403).json({ success: false, message: 'Cannot delete the primary admin account.' });
    }

    await userToDelete.destroy();
    res.json({ success: true, message: 'User deleted successfully.' });
  } catch (err) {
    console.error('DeleteUser error:', err);
    res.status(500).json({ success: false, message: 'Failed to delete user.' });
  }
};
