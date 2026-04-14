const express = require('express');
const {
  approveEvent,
  rejectEvent,
  getPendingEvents,
  getApprovedEvents,
  getDashboardStats,
  deactivateUser,
  reactivateUser
} = require('../controllers/adminController');
const { verifyFirebaseToken, requireRoles } = require('../middleware/authMiddleware');
const { validateObjectId } = require('../middleware/validationMiddleware');

const router = express.Router();

// All admin routes require admin role
router.use(verifyFirebaseToken, requireRoles('admin'));

// Event approval
router.put('/approve-event/:eventId', validateObjectId('eventId'), approveEvent);
router.put('/reject-event/:eventId', validateObjectId('eventId'), rejectEvent);

// Event management
router.get('/events/pending', getPendingEvents);
router.get('/events/approved', getApprovedEvents);

// Dashboard
router.get('/dashboard/stats', getDashboardStats);

// User management
router.put('/users/:userId/deactivate', validateObjectId('userId'), deactivateUser);
router.put('/users/:userId/reactivate', validateObjectId('userId'), reactivateUser);

module.exports = router;
