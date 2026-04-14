const express = require('express');
const {
  applyForEvent,
  getMyApplications,
  getApplicationsByEvent,
  updateApplicationStatus,
  withdrawApplication
} = require('../controllers/applicationController');
const { verifyFirebaseToken, requireRoles } = require('../middleware/authMiddleware');
const { validateObjectId } = require('../middleware/validationMiddleware');

const router = express.Router();

// Volunteer routes
router.post('/apply/:eventId', verifyFirebaseToken, requireRoles('volunteer'), validateObjectId('eventId'), applyForEvent);
router.get('/my-applications', verifyFirebaseToken, requireRoles('volunteer'), getMyApplications);
router.put(
  '/:applicationId/withdraw',
  verifyFirebaseToken,
  requireRoles('volunteer'),
  validateObjectId('applicationId'),
  withdrawApplication
);

// NGO/Admin routes
router.get('/event/:eventId', verifyFirebaseToken, requireRoles('ngo', 'admin'), validateObjectId('eventId'), getApplicationsByEvent);
router.put(
  '/:applicationId/status',
  verifyFirebaseToken,
  requireRoles('ngo', 'admin'),
  validateObjectId('applicationId'),
  updateApplicationStatus
);

module.exports = router;
