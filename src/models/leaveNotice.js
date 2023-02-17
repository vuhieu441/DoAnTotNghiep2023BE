const mongoose = require('mongoose');

const leaveNoticeSchema = mongoose.Schema(
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
    },
    tutor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'tutors',
    },
    type: {
      type: String,
    },
    reason: {
      type: String,
    },
    isValid: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('leave-notices', leaveNoticeSchema);
