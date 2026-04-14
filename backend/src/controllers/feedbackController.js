const Feedback = require('../models/Feedback');
const User = require('../models/User');

// Submit feedback for a user after event
async function submitFeedback(req, res) {
  try {
    const { givenToId, eventId, rating, comment, categories, isAnonymous } = req.body;

    if (!givenToId || !eventId || !rating) {
      return res.status(400).json({
        message: 'givenToId, eventId, and rating are required.'
      });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({
        message: 'Rating must be between 1 and 5.'
      });
    }

    // Check if already gave feedback to this user for this event
    const existing = await Feedback.findOne({
      givenBy: req.user.id,
      givenTo: givenToId,
      event: eventId
    });

    if (existing) {
      return res.status(409).json({
        message: 'You already submitted feedback for this user on this event.'
      });
    }

    const feedback = await Feedback.create({
      givenBy: req.user.id,
      givenTo: givenToId,
      event: eventId,
      rating,
      comment,
      categories: categories || {},
      isAnonymous: isAnonymous || false,
      status: 'pending'
    });

    return res.status(201).json({
      message: 'Feedback submitted successfully.',
      feedback
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Failed to submit feedback.',
      error: error.message
    });
  }
}

// Get feedback received by current user
async function getMyFeedback(req, res) {
  try {
    const feedback = await Feedback.find({ givenTo: req.user.id })
      .populate('givenBy', 'fullName avatarUrl')
      .populate('event', 'title date')
      .sort({ createdAt: -1 });

    const averageRating = feedback.length > 0 
      ? (feedback.reduce((sum, f) => sum + f.rating, 0) / feedback.length).toFixed(2)
      : 0;

    return res.status(200).json({
      count: feedback.length,
      averageRating,
      feedback
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Failed to fetch feedback.',
      error: error.message
    });
  }
}

// Get all feedback (for admin review)
async function getAllFeedback(req, res) {
  try {
    const { status } = req.query;
    const filter = {};

    if (status && ['pending', 'approved', 'rejected'].includes(status)) {
      filter.status = status;
    }

    const feedback = await Feedback.find(filter)
      .populate('givenBy', 'fullName email')
      .populate('givenTo', 'fullName email')
      .populate('event', 'title')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      count: feedback.length,
      feedback
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Failed to fetch feedback.',
      error: error.message
    });
  }
}

// Approve or reject feedback (Admin)
async function reviewFeedback(req, res) {
  try {
    const { feedbackId } = req.params;
    const { status } = req.body;

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({
        message: 'Status must be either "approved" or "rejected".'
      });
    }

    const feedback = await Feedback.findByIdAndUpdate(
      feedbackId,
      {
        $set: {
          status,
          reviewedBy: req.user.id,
          reviewedAt: new Date()
        }
      },
      { new: true }
    );

    if (!feedback) {
      return res.status(404).json({ message: 'Feedback not found.' });
    }

    return res.status(200).json({
      message: `Feedback ${status} successfully.`,
      feedback
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Failed to review feedback.',
      error: error.message
    });
  }
}

// Delete feedback (Admin or user who gave it)
async function deleteFeedback(req, res) {
  try {
    const { feedbackId } = req.params;
    const feedback = await Feedback.findById(feedbackId);

    if (!feedback) {
      return res.status(404).json({ message: 'Feedback not found.' });
    }

    // Only the user who gave feedback or admin can delete
    if (String(feedback.givenBy) !== String(req.user.id) && req.user.role !== 'admin') {
      return res.status(403).json({
        message: 'Only the feedback author or admin can delete feedback.'
      });
    }

    await Feedback.findByIdAndDelete(feedbackId);

    return res.status(200).json({
      message: 'Feedback deleted successfully.'
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Failed to delete feedback.',
      error: error.message
    });
  }
}

module.exports = {
  submitFeedback,
  getMyFeedback,
  getAllFeedback,
  reviewFeedback,
  deleteFeedback
};
