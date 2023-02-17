const mongoose = require('mongoose');

const studentCourseSchema = mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'students',
    },
    course: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'courses',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('student-courses', studentCourseSchema);
