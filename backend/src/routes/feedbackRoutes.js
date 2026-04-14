const express = require('express');
const {
  submitFeedback,
  getMyFeedback,
  getAllFeedback,
  reviewFeedback,
  deleteFeedback
} = require('../controllers/feedbackController');
const { verifyFirebaseToken, requireRoles } = require('../middleware/authMiddleware');
const { validateObjectId } = require('../middleware/validationMiddleware');

const router = express.Router();

// Protected routes (requires authentication)
router.post('/', verifyFirebaseToken, submitFeedback);
router.get('/my-feedback', verifyFirebaseToken, getMyFeedback);
router.delete('/:feedbackId', verifyFirebaseToken, validateObjectId('feedbackId'), deleteFeedback);

// Admin routes
router.get('/', verifyFirebaseToken, requireRoles('admin'), getAllFeedback);
router.put(
  '/:feedbackId/review',
  verifyFirebaseToken,
  requireRoles('admin'),
  validateObjectId('feedbackId'),
  reviewFeedback
);

module.exports = router;
