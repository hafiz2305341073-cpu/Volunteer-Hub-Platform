const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    firebaseUid: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    fullName: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },
    role: {
      type: String,
      enum: ['volunteer', 'ngo', 'admin'],
      required: true,
      default: 'volunteer'
    },
    phone: {
      type: String,
      trim: true,
      default: ''
    },
    avatarUrl: {
      type: String,
      default: ''
    },
    bio: {
      type: String,
      trim: true,
      default: ''
    },
    location: {
      city: {
        type: String,
        trim: true,
        default: ''
      },
      state: {
        type: String,
        trim: true,
        default: ''
      },
      country: {
        type: String,
        trim: true,
        default: ''
      },
      coordinates: {
        latitude: {
          type: Number,
          default: null
        },
        longitude: {
          type: Number,
          default: null
        }
      }
    },
    skills: [
      {
        type: String,
        trim: true
      }
    ],
    interests: [
      {
        type: String,
        trim: true
      }
    ],
    availability: {
      daysPerWeek: {
        type: Number,
        min: 0,
        default: 0
      },
      preferredTimeSlots: [
        {
          type: String,
          trim: true
        }
      ],
      weeklyHours: {
        type: Number,
        min: 0,
        default: 0
      }
    },
    organizationName: {
      type: String,
      trim: true,
      default: ''
    },
    organizationType: {
      type: String,
      trim: true,
      default: ''
    },
    website: {
      type: String,
      trim: true,
      default: ''
    },
    badges: [
      {
        name: {
          type: String,
          trim: true
        },
        description: {
          type: String,
          trim: true,
          default: ''
        },
        earnedAt: {
          type: Date,
          default: Date.now
        }
      }
    ],
    points: {
      type: Number,
      default: 0,
      min: 0
    },
    contributedHours: {
      type: Number,
      default: 0,
      min: 0
    },
    isActive: {
      type: Boolean,
      default: true
    },
    lastLoginAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

userSchema.index({ role: 1, 'location.city': 1 });

module.exports = mongoose.model('User', userSchema);