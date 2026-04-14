const express = require('express');
const {
  createEvent,
  getEvents,
  getEventById,
  updateEvent,
  deleteEvent,
  getBestMatchedVolunteers
} = require('../controllers/eventController');
const { verifyFirebaseToken, requireRoles } = require('../middleware/authMiddleware');
const { validateRequired, validateObjectId } = require('../middleware/validationMiddleware');

const router = express.Router();

// Public routes - anyone can view approved events
router.get('/', getEvents);
router.get('/:eventId', validateObjectId('eventId'), getEventById);

// Protected routes (NGO or Admin can create)
router.post(
  '/',
  verifyFirebaseToken,
  requireRoles('ngo', 'admin'),
  validateRequired(['title', 'description', 'date']),
  createEvent
);

// Update and delete (NGO owner or Admin)
router.put('/:eventId', verifyFirebaseToken, requireRoles('ngo', 'admin'), validateObjectId('eventId'), updateEvent);
router.delete(
  '/:eventId',
  verifyFirebaseToken,
  requireRoles('ngo', 'admin'),
  validateObjectId('eventId'),
  deleteEvent
);

// Get best matched volunteers (NGO or Admin)
router.get(
  '/:eventId/matches',
  verifyFirebaseToken,
  requireRoles('ngo', 'admin'),
  validateObjectId('eventId'),
  getBestMatchedVolunteers
);

// NGO-specific: Get events created by this NGO
router.get(
  '/ngo/my-events',
  verifyFirebaseToken,
  requireRoles('ngo'),
  async (req, res) => {
    try {
      const Event = require('../models/Event');
      const events = await Event.find({ createdBy: req.user.id }).sort({ createdAt: -1 });
      return res.status(200).json({
        count: events.length,
        events
      });
    } catch (error) {
      return res.status(500).json({
        message: 'Failed to fetch your events.',
        error: error.message
      });
    }
  }
);

module.exports = router;