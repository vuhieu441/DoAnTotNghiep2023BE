const enums = require('../constants/enum');
const mongoose = require('mongoose');

const tutorRegisterSchema = mongoose.Schema(
  {
    firstName: {
      type: String,
      required: true,
    },
    lastName: {
      type: String,
      required: true,
    },
    dob: {
      type: String,
      required: true,
    },
    gender: {
      type: String,
      enum: enums.Gender,
      required: true,
    },
    email: {
      type: String,
      required: true,
    },
    phoneNumber: {
      code: String,
      phone: String,
    },
    languages: [
      {
        type: String,
        enum: enums.Language,
      },
    ],
    description: {
      yourSelf: String,
      experience: String,
    },
    status: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('tutor-registers', tutorRegisterSchema);
