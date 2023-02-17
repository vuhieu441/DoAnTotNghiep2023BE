const { Gender, Nationality } = require('../constants/enum');
const mongoose = require('mongoose');

const studentSchema = mongoose.Schema(
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
    gender: {
      type: String,
      enum: Gender,
      required: true,
    },
    avatarUrl: String,
    nationality: {
      type: String,
      enum: Nationality,
      required: true,
    },
    email: String,
    phoneNumber: {
      code: String,
      phone: String,
    },
    isBlock: {
      type: Boolean,
      default: false,
    },
    notification: {
      push: {
        type: Boolean,
        default: false,
      },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('students', studentSchema);
