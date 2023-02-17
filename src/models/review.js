const { Rate } = require('../constants/enum');
const mongoose = require('mongoose');

const reviewSchema = mongoose.Schema(
  {
    flexibleLesson: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'flexible-lessons',
    },
    fixedLesson: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'fixed-lessons',
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'students',
      required: true,
    },
    tutor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'tutors',
    },
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'courses',
    },
    content: {
      type: String,
      required: true,
    },
    star: {
      type: Number,
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('reviews', reviewSchema);
