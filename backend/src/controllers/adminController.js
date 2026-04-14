const Event = require('../models/Event');
const User = require('../models/User');
const Application = require('../models/Application');

// Approve event
async function approveEvent(req, res) {
  try {
    const { eventId } = req.params;

    const event = await Event.findByIdAndUpdate(
      eventId,
      {
        $set: {
          approvalStatus: 'approved',
          status: 'published',
          approvedAt: new Date(),
          approvedBy: req.user.id
        }
      },
      { new: true }
    );

    if (!event) {
      return res.status(404).json({ message: 'Event not found.' });
    }

    return res.status(200).json({
      message: 'Event approved successfully.',
      event
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Failed to approve event.',
      error: error.message
    });
  }
}

// Reject event
async function rejectEvent(req, res) {
  try {
    const { eventId } = req.params;
    const { reason } = req.body;

    const event = await Event.findByIdAndUpdate(
      eventId,
      {
        $set: {
          approvalStatus: 'rejected',
          status: 'cancelled',
          rejectionReason: reason || '',
          rejectedAt: new Date(),
          rejectedBy: req.user.id
        }
      },
      { new: true }
    );

    if (!event) {
      return res.status(404).json({ message: 'Event not found.' });
    }

    return res.status(200).json({
      message: 'Event rejected successfully.',
      event
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Failed to reject event.',
      error: error.message
    });
  }
}

// Get all pending events (Admin dashboard)
async function getPendingEvents(req, res) {
  try {
    const events = await Event.find({ approvalStatus: 'pending' }).sort({ createdAt: -1 });

    return res.status(200).json({
      count: events.length,
      events
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Failed to fetch pending events.',
      error: error.message
    });
  }
}

// Get all approved events
async function getApprovedEvents(req, res) {
  try {
    const events = await Event.find({ approvalStatus: 'approved' }).sort({ createdAt: -1 });

    return res.status(200).json({
      count: events.length,
      events
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Failed to fetch approved events.',
      error: error.message
    });
  }
}

// Get statistics dashboard
async function getDashboardStats(req, res) {
  try {
    const totalUsers = await User.countDocuments();
    const totalVolunteers = await User.countDocuments({ role: 'volunteer' });
    const totalNGOs = await User.countDocuments({ role: 'ngo' });
    const activeUsers = await User.countDocuments({ isActive: true });

    const totalEvents = await Event.countDocuments();
    const approvedEvents = await Event.countDocuments({ approvalStatus: 'approved' });
    const pendingEvents = await Event.countDocuments({ approvalStatus: 'pending' });
    const rejectedEvents = await Event.countDocuments({ approvalStatus: 'rejected' });

    const totalApplications = await Application.countDocuments();
    const approvedApplications = await Application.countDocuments({ status: 'approved' });
    const attendedApplications = await Application.countDocuments({ status: 'attended' });

    const totalHoursContributed = await User.aggregate([
      { $group: { _id: null, total: { $sum: '$contributedHours' } } }
    ]);

    return res.status(200).json({
      users: {
        total: totalUsers,
        volunteers: totalVolunteers,
        ngos: totalNGOs,
        active: activeUsers
      },
      events: {
        total: totalEvents,
        approved: approvedEvents,
        pending: pendingEvents,
        rejected: rejectedEvents
      },
      applications: {
        total: totalApplications,
        approved: approvedApplications,
        attended: attendedApplications
      },
      totalHoursContributed: totalHoursContributed[0]?.total || 0
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Failed to fetch dashboard stats.',
      error: error.message
    });
  }
}

// Deactivate user (Admin)
async function deactivateUser(req, res) {
  try {
    const { userId } = req.params;

    const user = await User.findByIdAndUpdate(
      userId,
      { $set: { isActive: false } },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    return res.status(200).json({
      message: 'User deactivated successfully.',
      user
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Failed to deactivate user.',
      error: error.message
    });
  }
}

// Reactivate user (Admin)
async function reactivateUser(req, res) {
  try {
    const { userId } = req.params;

    const user = await User.findByIdAndUpdate(
      userId,
      { $set: { isActive: true } },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    return res.status(200).json({
      message: 'User reactivated successfully.',
      user
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Failed to reactivate user.',
      error: error.message
    });
  }
}

module.exports = {
  approveEvent,
  rejectEvent,
  getPendingEvents,
  getApprovedEvents,
  getDashboardStats,
  deactivateUser,
  reactivateUser
};
