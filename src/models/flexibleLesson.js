const enums = require('../constants/enum');
const mongoose = require('mongoose');

const flexibleLessonSchema = mongoose.Schema(
  {
    tutor: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'tutors',
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'students',
      required: true,
    },
    available: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'tutor-available-schedules',
        required: true,
      },
    ],

    status: {
      type: String,
      enum: enums.StatusFlexibleLesson,
    },

    linkMeet: {
      type: String,
    },
    price: {
      type: Number,
    },
    information: {
      description: { type: String },
    },
    startTime: {
      type: Date,
      required: true,
    },
    endTime: {
      type: Date,
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('flexible-lessons', flexibleLessonSchema);
