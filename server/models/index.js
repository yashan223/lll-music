const { Sequelize, DataTypes } = require('sequelize');
const path = require('path');

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: path.join(__dirname, '../data/database.sqlite'),
  logging: false,
});

const User = sequelize.define('User', {
  username: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: { len: [3, 30] },
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: { isEmail: true },
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  avatarUrl: {
    type: DataTypes.STRING,
  },
  isAdmin: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
});

const Song = sequelize.define('Song', {
  title: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  artist: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  album: {
    type: DataTypes.STRING,
    defaultValue: 'Unknown Album',
  },
  genre: {
    type: DataTypes.STRING,
  },
  duration: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  filePath: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  fileName: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  fileSize: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  coverPath: {
    type: DataTypes.STRING,
  },
  plays: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  isPublic: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
});

const Playlist = sequelize.define('Playlist', {
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
  },
  coverPath: {
    type: DataTypes.STRING,
  },
  isPublic: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
});

const RecentlyPlayed = sequelize.define('RecentlyPlayed', {
  playedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
});

// Associations
User.hasMany(Song, { foreignKey: 'uploaderId', as: 'uploadedSongs' });
Song.belongsTo(User, { foreignKey: 'uploaderId', as: 'uploadedBy' });

User.belongsToMany(Song, { through: 'Favorites', as: 'favorites' });
Song.belongsToMany(User, { through: 'Favorites', as: 'likes' });

User.hasMany(Playlist, { foreignKey: 'ownerId' });
Playlist.belongsTo(User, { foreignKey: 'ownerId', as: 'owner' });

Playlist.belongsToMany(Song, { through: 'PlaylistSongs' });
Song.belongsToMany(Playlist, { through: 'PlaylistSongs' });

User.hasMany(RecentlyPlayed);
RecentlyPlayed.belongsTo(User);
Song.hasMany(RecentlyPlayed);
RecentlyPlayed.belongsTo(Song);

module.exports = {
  sequelize,
  User,
  Song,
  Playlist,
  RecentlyPlayed,
};
