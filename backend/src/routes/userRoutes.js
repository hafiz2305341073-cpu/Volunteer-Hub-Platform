const express = require('express');
const {
  registerUser,
  getAllUsers,
  getUserById,
  getMyProfile,
  updateProfile,
  getUserStats,
  awardBadge
} = require('../controllers/userController');
const { verifyFirebaseToken, requireRoles } = require('../middleware/authMiddleware');
const { validateObjectId } = require('../middleware/validationMiddleware');

const router = express.Router();

// Public registration
router.post('/register', verifyFirebaseToken, registerUser);

// Protected routes (requires authentication)
router.get('/profile', verifyFirebaseToken, getMyProfile);
router.put('/profile', verifyFirebaseToken, updateProfile);
router.get('/stats', verifyFirebaseToken, getUserStats);

// Admin routes
router.get('/', verifyFirebaseToken, requireRoles('admin'), getAllUsers);
router.get('/:userId', verifyFirebaseToken, validateObjectId('userId'), getUserById);
router.post('/:userId/badge', verifyFirebaseToken, requireRoles('admin'), validateObjectId('userId'), awardBadge);

module.exports = router;
