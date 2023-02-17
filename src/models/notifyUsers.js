const enums = require('../constants/enum');
const mongoose = require('mongoose');

const notifyUsersSchema = mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'users',
      required: true,
    },
    notification: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'notifications',
      required: true,
    },
    isSeen: { type: Boolean, default: false },
    isActive: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model('notify-users', notifyUsersSchema);
