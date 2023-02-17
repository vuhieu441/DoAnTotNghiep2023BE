const { Nationality, Language, Gender } = require('../constants/enum');
const mongoose = require('mongoose');

const tutorSchema = mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'users',
      required: true,
    },
    firstName: {
      type: String,
    },
    lastName: {
      type: String,
    },
    dob: {
      type: String,
    },
    email: {
      type: String,
    },
    phoneNumber: {
      code: String,
      phone: String,
    },
    description: {
      type: String,
    },
    certificates: [
      {
        name: String,
        description: String,
        start: String,
        end: String,
        cerUrl: String,
      },
    ],
    avatarUrl: String,
    nationality: {
      type: String,
      enum: Nationality,
      required: true,
    },
    languages: [
      {
        type: String,
        enum: Language,
      },
    ],
    isBlock: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: false,
    },
    gender: {
      type: String,
      enum: Gender,
      required: true,
    },
    salaryPerHour: Number,
    startDate: String,
    googleCalendarTokens: {
      accessToken: String,
      refreshToken: String,
    },
    isOAuthGoogle: {
      type: Boolean,
      default: false,
    },
    notification: {
      type: Boolean,
      default: false,
    },
    videoUrl: {
      type: String,
      default: false,
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('tutors', tutorSchema);
