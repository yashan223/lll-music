const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { validationResult } = require('express-validator');
const { User, Song } = require('../models');

const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET || 'your_super_secret_jwt_key_change_in_production', {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
};

exports.seedAdmin = async () => {
  try {
    const existing = await User.findOne({ where: { email: 'yashan2003@test.com' } });
    if (!existing) {
      const salt = await bcrypt.genSalt(12);
      const hashedPassword = await bcrypt.hash('Yashan2003', salt);
      await User.create({
        username: 'Admin',
        email: 'yashan2003@test.com',
        password: hashedPassword,
        isAdmin: true,
      });
      console.log('✅ Admin user created (yashan2003@test.com / Yashan2003)');
    }
  } catch (err) {
    console.error('Seed error:', err);
  }
};

// Registration is disabled to maintain Admin-only mode, but we keep the handler just in case the route is hit
exports.register = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { username, email, password } = req.body;

    const userExists = await User.findOne({ where: { email: email.toLowerCase() } });
    if (userExists) {
      return res.status(400).json({ success: false, message: 'Email already registered.' });
    }

    const usernameExists = await User.findOne({ where: { username } });
    if (usernameExists) {
      return res.status(400).json({ success: false, message: 'Username already taken.' });
    }

    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await User.create({
      username,
      email: email.toLowerCase(),
      password: hashedPassword,
      isAdmin: false, // Force standard user status for public registration
    });

    const token = generateToken(user.id);

    res.status(201).json({
      success: true,
      message: 'Registration successful.',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        isAdmin: user.isAdmin,
        avatarUrl: user.avatarUrl,
        favorites: [],
      },
    });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ success: false, message: 'Server error during registration.' });
  }
};

exports.login = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { email, password } = req.body;
    const user = await User.findOne({ where: { email: email.toLowerCase() } });
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const token = generateToken(user.id);
    const favorites = await user.getFavorites({ attributes: ['id'] });

    res.json({
      success: true,
      message: 'Login successful.',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        isAdmin: user.isAdmin,
        avatarUrl: user.avatarUrl,
        favorites: favorites.map(f => f.id),
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ success: false, message: 'Server error during login.' });
  }
};

exports.getMe = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      include: [
        { model: Song, as: 'favorites', attributes: ['id', 'title', 'artist', 'album', 'coverPath', 'duration'] }
      ]
    });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    
    // We filter out password manually because Sequelize doesn't have a simple select: false
    const userData = user.toJSON();
    delete userData.password;
    
    // Map favorites to IDs for easier frontend integration
    userData.favorites = userData.favorites.map(f => f.id);

    res.json({ success: true, user: userData });
  } catch (err) {
    console.error('GetMe error:', err);
    res.status(500).json({ success: false, message: 'Server error fetching profile.' });
  }
};
