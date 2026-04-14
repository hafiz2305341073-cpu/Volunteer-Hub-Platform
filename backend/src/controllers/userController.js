const User = require('../models/User');
const Application = require('../models/Application');

// Register or update user profile via Firebase
async function registerUser(req, res) {
  try {
    const firebaseUid = req.auth.uid;
    const email = req.auth.email || req.body.email;

    if (!email) {
      return res.status(400).json({ message: 'Email is required from Firebase token or request body.' });
    }

    if (!req.body.fullName) {
      return res.status(400).json({ message: 'fullName is required.' });
    }

    const requestedRole = req.body.role || 'volunteer';
    const role = ['volunteer', 'ngo'].includes(requestedRole) ? requestedRole : 'volunteer';

    const payload = {
      firebaseUid,
      email,
      fullName: req.body.fullName,
      role,
      phone: req.body.phone || '',
      bio: req.body.bio || '',
      avatarUrl: req.body.avatarUrl || '',
      location: req.body.location || {},
      skills: req.body.skills || [],
      interests: req.body.interests || [],
      availability: req.body.availability || {},
      organizationName: req.body.organizationName || '',
      organizationType: req.body.organizationType || '',
      website: req.body.website || '',
      lastLoginAt: new Date()
    };

    const user = await User.findOneAndUpdate(
      { firebaseUid },
      { $set: payload },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    return res.status(200).json({
      message: 'User registered/updated successfully.',
      user
    });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to register user.', error: error.message });
  }
}

// Get all users (Admin only)
async function getAllUsers(req, res) {
  try {
    const { role, city } = req.query;
    const filter = {};

    if (role && ['volunteer', 'ngo', 'admin'].includes(role)) {
      filter.role = role;
    }

    if (city) {
      filter['location.city'] = city;
    }

    const users = await User.find(filter)
      .select('-firebaseUid')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      count: users.length,
      users
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Failed to fetch users.',
      error: error.message
    });
  }
}

// Get user by ID
async function getUserById(req, res) {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId).select('-firebaseUid');

    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    return res.status(200).json({ user });
  } catch (error) {
    return res.status(500).json({
      message: 'Failed to fetch user.',
      error: error.message
    });
  }
}

// Get current user profile
async function getMyProfile(req, res) {
  try {
    const user = await User.findById(req.user.id).select('-firebaseUid');

    if (!user) {
      return res.status(404).json({ message: 'Profile not found. Please complete registration first.' });
    }

    return res.status(200).json({ user });
  } catch (error) {
    return res.status(500).json({
      message: 'Failed to fetch profile.',
      error: error.message
    });
  }
}

// Update user profile (user can update own profile)
async function updateProfile(req, res) {
  try {
    const allowedFields = [
      'fullName',
      'phone',
      'bio',
      'avatarUrl',
      'location',
      'skills',
      'interests',
      'availability',
      'organizationName',
      'organizationType',
      'website'
    ];

    const updates = {};
    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    const user = await User.findByIdAndUpdate(req.user.id, { $set: updates }, { new: true }).select('-firebaseUid');

    return res.status(200).json({
      message: 'Profile updated successfully.',
      user
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Failed to update profile.',
      error: error.message
    });
  }
}

// Get user stats (points, hours, badges)
async function getUserStats(req, res) {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const applications = await Application.find({ volunteer: req.user.id });
    const eventsAttended = applications.filter((app) => app.status === 'attended').length;
    const totalPointsEarned = applications.reduce((sum, app) => sum + (app.pointsAwarded || 0), 0);

    return res.status(200).json({
      stats: {
        points: user.points,
        contributedHours: user.contributedHours,
        badges: user.badges,
        eventsAttended,
        totalPointsEarned,
        badgeCount: user.badges.length
      }
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Failed to fetch user stats.',
      error: error.message
    });
  }
}

// Award badge to user (Admin)
async function awardBadge(req, res) {
  try {
    const { userId } = req.params;
    const { badgeName, badgeDescription } = req.body;

    if (!badgeName) {
      return res.status(400).json({ message: 'Badge name is required.' });
    }

    const user = await User.findByIdAndUpdate(
      userId,
      {
        $push: {
          badges: {
            name: badgeName,
            description: badgeDescription || '',
            earnedAt: new Date()
          }
        }
      },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    return res.status(200).json({
      message: `Badge "${badgeName}" awarded to user.`,
      user
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Failed to award badge.',
      error: error.message
    });
  }
}

// Auto-assign badges based on criteria
async function checkAndAssignBadges(userId) {
  try {
    const user = await User.findById(userId);
    if (!user) return;

    const applications = await Application.find({ volunteer: userId });
    const attendedCount = applications.filter((app) => app.status === 'attended').length;

    const existingBadges = user.badges.map((b) => b.name);
    const badgesToAssign = [];

    // Beginner: First event attended
    if (attendedCount >= 1 && !existingBadges.includes('Beginner')) {
      badgesToAssign.push({
        name: 'Beginner',
        description: 'Attended your first volunteering event'
      });
    }

    // Active: 5 events attended
    if (attendedCount >= 5 && !existingBadges.includes('Active')) {
      badgesToAssign.push({
        name: 'Active',
        description: 'Attended 5 or more volunteering events'
      });
    }

    // Hero: 10 events attended
    if (attendedCount >= 10 && !existingBadges.includes('Hero')) {
      badgesToAssign.push({
        name: 'Hero',
        description: 'Attended 10 or more volunteering events'
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
    console.error('Failed to assign badges:', error);
  }
}

module.exports = {
  registerUser,
  getAllUsers,
  getUserById,
  getMyProfile,
  updateProfile,
  getUserStats,
  awardBadge,
  checkAndAssignBadges
};