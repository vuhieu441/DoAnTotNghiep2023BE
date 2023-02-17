const mongoose = require('mongoose');

const staffSchema = mongoose.Schema(
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
    email: {
      type: String,
    },
    avatarUrl: String,
    phoneNumber: {
      code: String,
      phone: String,
    },
    dob: {
      type: String,
    },
    gender: String,
  },
  { timestamps: true }
);

module.exports = mongoose.model('staffs', staffSchema);
