const mongoose = require('mongoose');

const tutorAvailableScheduleSchema = mongoose.Schema(
  {
    tutor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'tutors',
      required: true,
    },
    timeZone: String,
    startTime: Date,
    endTime: Date,
    status: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('tutor-available-schedules', tutorAvailableScheduleSchema);
