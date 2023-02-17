const mongoose = require('mongoose');
const enums = require('../constants/enum');

const paymentSchema = mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'students',
    },
    promotion: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'promotions',
    },
    amount: {
      type: Number,
      required: true,
    },
    point: {
      type: Number,
      required: true,
    },
    transactionId: {
      type: String,
    },
    method: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: enums.StatusPayment,
      default: enums.StatusPayment.REQUEST
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('payments', paymentSchema);
