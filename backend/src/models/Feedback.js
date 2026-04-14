const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema(
  {
    givenBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    givenTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event',
      required: true
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5
    },
    comment: {
      type: String,
      trim: true,
      default: ''
    },
    categories: {
      professionalism: {
        type: Number,
        min: 1,
        max: 5,
        default: 3
      },
      reliability: {
        type: Number,
        min: 1,
        max: 5,
        default: 3
      },
      teamwork: {
        type: Number,
        min: 1,
        max: 5,
        default: 3
      },
      skillLevel: {
        type: Number,
        min: 1,
        max: 5,
        default: 3
      }
    },
    isAnonymous: {
      type: Boolean,
      default: false
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending'
    }
  },
  {
    timestamps: true
  }
);

feedbackSchema.index({ givenBy: 1, event: 1 }, { unique: true });
feedbackSchema.index({ givenTo: 1, event: 1 });
feedbackSchema.index({ status: 1, rating: -1 });

module.exports = mongoose.model('Feedback', feedbackSchema);
