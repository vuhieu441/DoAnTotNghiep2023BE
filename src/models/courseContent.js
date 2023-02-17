const mongoose = require('mongoose');

const courseContentSchema = mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    course: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'courses',
    },
    child: [{
      name: String,
      numberLesson: Number
    }]
  },
  { timestamps: true }
);

module.exports = mongoose.model('course-contents', courseContentSchema);
