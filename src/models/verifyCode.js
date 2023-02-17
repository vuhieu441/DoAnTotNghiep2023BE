const mongoose = require('mongoose');
const constants = require('../constants/constants');
const verifyCodeSchema = mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
    },
    code: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('verify-codes', verifyCodeSchema);
