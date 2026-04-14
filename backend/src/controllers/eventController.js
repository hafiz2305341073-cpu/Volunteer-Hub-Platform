const Event = require('../models/Event');
const User = require('../models/User');

// MATCHING LOGIC: Calculate match score between volunteer and event
function calculateMatchScore(volunteer, event) {
  let score = 0;

  // Skill matching: +2 per matched skill
  if (event.requiredSkills && event.requiredSkills.length > 0) {
    const volunteerSkills = new Set((volunteer.skills || []).map((s) => s.toLowerCase()));
    event.requiredSkills.forEach((skill) => {
      if (volunteerSkills.has(skill.toLowerCase())) {
        score += 2;
      }
    });
  }

  // Interest matching: +1 per matched interest
  if (event.preferredInterests && event.preferredInterests.length > 0) {
    const volunteerInterests = new Set((volunteer.interests || []).map((i) => i.toLowerCase()));
    event.preferredInterests.forEach((interest) => {
      if (volunteerInterests.has(interest.toLowerCase())) {
        score += 1;
      }
    });
  }

  // Availability matching: +2 if available
  if (
    volunteer.availability &&
    volunteer.availability.weeklyHours &&
    volunteer.availability.weeklyHours > 0
  ) {
    score += 2;
  }

  return score;
}

// Create event (NGO or Admin)
async function createEvent(req, res) {
  try {
    if (!req.body.title || !req.body.description || !req.body.date) {
      return res.status(400).json({
        message: 'title, description, and date are required.'
      });
    }

    const event = await Event.create({
      title: req.body.title,
      description: req.body.description,
      location: req.body.location || {},
      date: req.body.date,
      startDate: req.body.startDate || req.body.date,
      endDate: req.body.endDate || new Date(new Date(req.body.date).getTime() + 24 * 60 * 60 * 1000),
      requiredSkills: req.body.requiredSkills || [],
      preferredInterests: req.body.preferredInterests || [],
      organization: req.user.id,
      capacity: req.body.capacity || 50,
      category: req.body.category || 'Community',
      approvalStatus: req.user.role === 'admin' ? 'approved' : 'pending',
      status: req.user.role === 'admin' ? 'published' : 'draft'
    });

    console.log('[Event Created]', {
      id: event._id,
      title: event.title,
      approvalStatus: event.approvalStatus
    });

    return res.status(201).json({
      message: 'Event created successfully.',
      event
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Failed to create event.',
      error: error.message
    });
  }
}

// Get events with filters
async function getEvents(req, res) {
  try {
    const { location, approvalStatus, category } = req.query;
    const filter = {};

    // Filter by city
    if (location) {
      filter['location.city'] = location;
    }

    // Filter by approval status
    if (approvalStatus && ['pending', 'approved', 'rejected'].includes(approvalStatus)) {
      filter.approvalStatus = approvalStatus;
    }

    // Filter by category
    if (category) {
      filter.category = category;
    }

    const events = await Event.find(filter).sort({ date: 1, createdAt: -1 });

    console.log('[Events Fetched]', {
      filter,
      count: events.length
    });

    return res.status(200).json({
      count: events.length,
      events
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Failed to fetch events.',
      error: error.message
    });
  }
}

// Get single event by ID
async function getEventById(req, res) {
  try {
    const { eventId } = req.params;
    const event = await Event.findById(eventId).populate('organization', 'fullName email');

    if (!event) {
      return res.status(404).json({ message: 'Event not found.' });
    }

    return res.status(200).json({ event });
  } catch (error) {
    return res.status(500).json({
      message: 'Failed to fetch event.',
      error: error.message
    });
  }
}

// Update event (NGO owner or Admin)
async function updateEvent(req, res) {
  try {
    const { eventId } = req.params;
    const event = await Event.findById(eventId);

    if (!event) {
      return res.status(404).json({ message: 'Event not found.' });
    }

    // Check authorization
    const isOwner = String(event.organization) === String(req.user.id);
    if (!isOwner && req.user.role !== 'admin') {
      return res.status(403).json({
        message: 'Only the event organizer or admin can update this event.'
      });
    }

    // Update allowed fields
    const allowedFields = [
      'title',
      'description',
      'location',
      'date',
      'capacity',
      'requiredSkills',
      'preferredInterests',
      'category'
    ];

    const updates = {};
    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    const updated = await Event.findByIdAndUpdate(eventId, { $set: updates }, { new: true });

    return res.status(200).json({
      message: 'Event updated successfully.',
      event: updated
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Failed to update event.',
      error: error.message
    });
  }
}

// Delete event (NGO owner or Admin)
async function deleteEvent(req, res) {
  try {
    const { eventId } = req.params;
    const event = await Event.findById(eventId);

    if (!event) {
      return res.status(404).json({ message: 'Event not found.' });
    }

    // Check authorization
    const isOwner = String(event.organization) === String(req.user.id);
    if (!isOwner && req.user.role !== 'admin') {
      return res.status(403).json({
        message: 'Only the event organizer or admin can delete this event.'
      });
    }

    await Event.findByIdAndDelete(eventId);

    return res.status(200).json({
      message: 'Event deleted successfully.'
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Failed to delete event.',
      error: error.message
    });
  }
}

// Get best matched volunteers for an event (MATCHING LOGIC)
async function getBestMatchedVolunteers(req, res) {
  try {
    const { eventId } = req.params;
    const { limit = 10 } = req.query;

    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: 'Event not found.' });
    }

    // Get all volunteers
    const volunteers = await User.find({ role: 'volunteer', isActive: true });

    // Calculate match scores
    const matched = volunteers
      .map((volunteer) => {
        const matchScore = calculateMatchScore(volunteer, event);
        return {
          volunteerId: volunteer._id,
          name: volunteer.fullName,
          email: volunteer.email,
          skills: volunteer.skills,
          interests: volunteer.interests,
          matchScore,
          badges: volunteer.badges,
          points: volunteer.points
        };
      })
      .filter((match) => match.matchScore > 0) // Only include those with matches
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, parseInt(limit));

    return res.status(200).json({
      eventId: event._id,
      eventTitle: event.title,
      matchCount: matched.length,
      matches: matched
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Failed to calculate matches.',
      error: error.message
    });
  }
}

module.exports = {
  createEvent,
  getEvents,
  getEventById,
  updateEvent,
  deleteEvent,
  getBestMatchedVolunteers
};