const mongoose = require('mongoose');

// Validate required fields
function validateRequired(requiredFields) {
  return (req, res, next) => {
    const missing = [];
    requiredFields.forEach((field) => {
      if (req.body[field] === undefined || req.body[field] === null || req.body[field] === '') {
        missing.push(field);
      }
    });

    if (missing.length > 0) {
      return res.status(400).json({
        message: `Missing required fields: ${missing.join(', ')}`
      });
    }

    next();
  };
}

// Validate MongoDB ObjectId format
function validateObjectId(paramName) {
  return (req, res, next) => {
    const id = req.params[paramName];

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        message: `Invalid ${paramName} format. Must be valid MongoDB ObjectId.`
      });
    }

    next();
  };
}

// Validate email format
function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Validate phone number format (basic)
function validatePhone(phone) {
  const phoneRegex = /^[\d\s\-\+\(\)]+$/;
  return phoneRegex.test(phone) && phone.replace(/\D/g, '').length >= 10;
}

// Validate role
function validateRole(role) {
  return ['volunteer', 'ngo', 'admin'].includes(role);
}

// Validate event status
function validateEventStatus(status) {
  return ['pending', 'approved', 'rejected'].includes(status);
}

// Validate application status
function validateApplicationStatus(status) {
  return ['applied', 'shortlisted', 'approved', 'rejected', 'withdrawn', 'attended', 'missed'].includes(status);
}

module.exports = {
  validateRequired,
  validateObjectId,
  validateEmail,
  validatePhone,
  validateRole,
  validateEventStatus,
  validateApplicationStatus
};
