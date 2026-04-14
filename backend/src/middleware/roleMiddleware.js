/**
 * Role-Based Access Control Middleware
 * Checks user role and allows/denies access to protected routes
 */

const User = require('../models/User');

/**
 * Middleware to check if user has specific role
 * @param {string[]} allowedRoles - Array of allowed roles
 * @returns {Function} Express middleware
 */
const checkRole = (allowedRoles) => {
  return async (req, res, next) => {
    try {
      // Get user from token/session
      if (!req.user || !req.user.id) {
        return res.status(401).json({ message: 'Unauthorized: No user found in request.' });
      }

      // Fetch user from database to get current role
      const user = await User.findById(req.user.id);
      if (!user) {
        return res.status(404).json({ message: 'User not found.' });
      }

      // Check if user role is in allowed roles
      if (!allowedRoles.includes(user.role)) {
        return res.status(403).json({
          message: `Access denied. This action requires one of these roles: ${allowedRoles.join(', ')}. Your role: ${user.role}`
        });
      }

      // Attach user to request for next middleware
      req.user.role = user.role;
      next();
    } catch (error) {
      console.error('Role check error:', error);
      return res.status(500).json({ message: 'Error checking user role.', error: error.message });
    }
  };
};

/**
 * Volunteer-only middleware
 */
const isVolunteer = checkRole(['volunteer']);

/**
 * NGO-only middleware
 */
const isNGO = checkRole(['ngo']);

/**
 * Admin-only middleware
 */
const isAdmin = checkRole(['admin']);

/**
 * Volunteer or NGO middleware
 */
const isVolunteerOrNGO = checkRole(['volunteer', 'ngo']);

/**
 * Any authenticated user
 */
const isAuthenticated = (req, res, next) => {
  if (!req.user || !req.user.id) {
    return res.status(401).json({ message: 'Unauthorized: Please log in.' });
  }
  next();
};

module.exports = {
  checkRole,
  isVolunteer,
  isNGO,
  isAdmin,
  isVolunteerOrNGO,
  isAuthenticated
};
