const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      required: true,
      trim: true
    },
    location: {
      type: String,
      required: true,
      trim: true
    },
    date: {
      type: Date,
      required: true
    },
    createdBy: {
      type: String,
      default: 'ngo-demo'
    },
    status: {
      type: String,
      enum: ['approved', 'pending', 'rejected'],
      default: 'approved'
    },
    type: {
      type: String,
      trim: true,
      default: 'Community'
    },
    requiredSkills: [
      {
        type: String,
        trim: true
      }
    ],
    preferredInterests: [
      {
        type: String,
        trim: true
      }
    ]
  },
  {
    timestamps: true
  }
);

eventSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('Event', eventSchema);