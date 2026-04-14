const mongoose = require('mongoose');

const applicationSchema = new mongoose.Schema(
  {
    volunteer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event',
      required: true
    },
    status: {
      type: String,
      enum: ['applied', 'shortlisted', 'approved', 'rejected', 'withdrawn', 'attended', 'missed'],
      default: 'applied'
    },
    message: {
      type: String,
      trim: true,
      default: ''
    },
    matchScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    volunteerNotes: {
      type: String,
      trim: true,
      default: ''
    },
    attendanceConfirmed: {
      type: Boolean,
      default: false
    },
    hoursContributed: {
      type: Number,
      default: 0,
      min: 0
    },
    pointsAwarded: {
      type: Number,
      default: 0,
      min: 0
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    reviewedAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

applicationSchema.index({ volunteer: 1, event: 1 }, { unique: true });
applicationSchema.index({ status: 1, matchScore: -1 });

module.exports = mongoose.model('Application', applicationSchema);