const mongoose = require('mongoose');

const walletSchema = mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'students',
    },
    point: {
      type: Number,
      default: 0
    },
    expirationDate: {
      type: String,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('wallets', walletSchema);
