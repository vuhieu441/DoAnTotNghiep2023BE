const mongoose = require('mongoose');

const tutorCourseSchema = mongoose.Schema(
  {
    tutor: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'tutors',
    },
    course: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'courses',
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('tutor-courses', tutorCourseSchema);
