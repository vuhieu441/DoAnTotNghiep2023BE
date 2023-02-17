const mongoose = require('mongoose');

const promotionSchema = mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    price: {
      type: Number,
      required: true,
    },
    point: {
      type: Number,
      required: true,
    },
    code: {
      type: String,
      required: true,
    },
    isPublic: {
      type: Boolean,
      default: false,
    },
    promo: {
      type: Number,
      required: true,
    },
    expirationDate: Date,
  },
  { timestamps: true }
);

module.exports = mongoose.model('promotions', promotionSchema);
