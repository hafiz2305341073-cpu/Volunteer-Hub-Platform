const Application = require('../models/Application');
const Event = require('../models/Event');
const User = require('../models/User');

// MATCHING LOGIC from eventController
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

// GAMIFICATION: Award points and badges
async function awardPointsAndBadges(userId, pointsEarned) {
  try {
    // Update user points
    const user = await User.findByIdAndUpdate(
      userId,
      { $inc: { points: pointsEarned } },
      { new: true }
    );

    // Check for badges
    const applications = await Application.find({ volunteer: userId });
    const attendedCount = applications.filter((app) => app.status === 'attended').length;

    const existingBadges = user.badges.map((b) => b.name);
    const badgesToAssign = [];

    if (attendedCount >= 1 && !existingBadges.includes('Beginner')) {
      badgesToAssign.push({
        name: 'Beginner',
        description: 'Attended your first event'
      });
    }

    if (attendedCount >= 5 && !existingBadges.includes('Active')) {
      badgesToAssign.push({
        name: 'Active',
        description: 'Attended 5 or more events'
      });
    }

    if (attendedCount >= 10 && !existingBadges.includes('Hero')) {
      badgesToAssign.push({
        name: 'Hero',
        description: 'Attended 10 or more events'
      });
    }

    if (badgesToAssign.length > 0) {
      await User.findByIdAndUpdate(userId, {
        $push: {
          badges: {
            $each: badgesToAssign.map((b) => ({
              ...b,
              earnedAt: new Date()
            }))
          }
        }
      });
    }

    return badgesToAssign;
  } catch (error) {
    console.error('Failed to award points/badges:', error);
  }
}

// Apply for event (Volunteer)
async function applyForEvent(req, res) {
  try {
    const { eventId } = req.params;
    const { message = '', volunteerNotes = '' } = req.body;

    // Validate event exists
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: 'Event not found.' });
    }

    // Check if event is approved
    if (event.approvalStatus !== 'approved' || !['published', 'ongoing'].includes(event.status)) {
      return res.status(400).json({
        message: 'You can only apply to approved and active events.'
      });
    }

    // Check if already applied
    const existingApplication = await Application.findOne({
      volunteer: req.user.id,
      event: eventId
    });

    if (existingApplication) {
      return res.status(409).json({
        message: 'You already applied for this event.'
      });
    }

    // Get volunteer info
    const volunteer = await User.findById(req.user.id);
    if (!volunteer) {
      return res.status(404).json({ message: 'Volunteer profile not found.' });
    }

    // Calculate match score
    const matchScore = calculateMatchScore(volunteer, event);

    // Create application
    const application = await Application.create({
      volunteer: req.user.id,
      event: eventId,
      message,
      volunteerNotes,
      matchScore,
      status: 'applied'
    });

    console.log('[Application Submitted]', {
      volunteerId: req.user.id,
      eventId,
      matchScore
    });

    return res.status(201).json({
      message: 'Application submitted successfully.',
      matchScore,
      application
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Failed to apply for event.',
      error: error.message
    });
  }
}

// Get applications for current volunteer
async function getMyApplications(req, res) {
  try {
    const applications = await Application.find({ volunteer: req.user.id })
      .populate('event', 'title date location status')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      count: applications.length,
      applications
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Failed to fetch applications.',
      error: error.message
    });
  }
}

// Get applications for an event (NGO or Admin)
async function getApplicationsByEvent(req, res) {
  try {
    const { eventId } = req.params;

    // Verify event exists and user has access
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: 'Event not found.' });
    }

    // Check authorization
    const isOrganizer = String(event.organization) === String(req.user.id);
    if (!isOrganizer && req.user.role !== 'admin') {
      return res.status(403).json({
        message: 'Only the event organizer or admin can view applications.'
      });
    }

    const applications = await Application.find({ event: eventId })
      .populate('volunteer', 'fullName email skills interests')
      .sort({ matchScore: -1, createdAt: -1 });

    return res.status(200).json({
      eventId,
      count: applications.length,
      applications
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Failed to fetch applications.',
      error: error.message
    });
  }
}

// Update application status (NGO or Admin)
async function updateApplicationStatus(req, res) {
  try {
    const { applicationId } = req.params;
    const { status } = req.body;

    if (
      ![
        'applied',
        'shortlisted',
        'approved',
        'rejected',
        'withdrawn',
        'attended',
        'missed'
      ].includes(status)
    ) {
      return res.status(400).json({
        message: 'Invalid application status.'
      });
    }

    const application = await Application.findById(applicationId);
    if (!application) {
      return res.status(404).json({ message: 'Application not found.' });
    }

    // Check authorization
    const event = await Event.findById(application.event);
    const isOrganizer = String(event.organization) === String(req.user.id);
    if (!isOrganizer && req.user.role !== 'admin') {
      return res.status(403).json({
        message: 'Only the event organizer or admin can update applications.'
      });
    }

    // If marking as attended, award points
    if (status === 'attended' && application.status !== 'attended') {
      const pointsToAward = 50;
      application.pointsAwarded = pointsToAward;
      application.hoursContributed = 2; // Default 2 hours

      // Award gamification
      await awardPointsAndBadges(application.volunteer, pointsToAward);

      // Update user contributed hours
      await User.findByIdAndUpdate(
        application.volunteer,
        { $inc: { contributedHours: 2 } }
      );
    }

    application.status = status;
    application.reviewedBy = req.user.id;
    application.reviewedAt = new Date();
    await application.save();

    console.log('[Application Updated]', {
      applicationId,
      status,
      pointsAwarded: application.pointsAwarded
    });

    return res.status(200).json({
      message: 'Application status updated successfully.',
      application
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Failed to update application status.',
      error: error.message
    });
  }
}

// Withdraw application (Volunteer)
async function withdrawApplication(req, res) {
  try {
    const { applicationId } = req.params;

    const application = await Application.findById(applicationId);
    if (!application) {
      return res.status(404).json({ message: 'Application not found.' });
    }

    // Check if user is the applicant
    if (String(application.volunteer) !== String(req.user.id)) {
      return res.status(403).json({
        message: 'You can only withdraw your own applications.'
      });
    }

    application.status = 'withdrawn';
    await application.save();

    return res.status(200).json({
      message: 'Application withdrawn successfully.',
      application
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Failed to withdraw application.',
      error: error.message
    });
  }
}

module.exports = {
  applyForEvent,
  getMyApplications,
  getApplicationsByEvent,
  updateApplicationStatus,
  withdrawApplication,
  awardPointsAndBadges
};