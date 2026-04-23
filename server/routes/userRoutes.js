const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { getAllUsers, deleteUser } = require('../controllers/userController');

// All user management routes require authentication and admin status is checked in the controller
router.get('/', protect, getAllUsers);
router.delete('/:id', protect, deleteUser);

module.exports = router;
