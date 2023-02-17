const enums = require('../constants/enum');
const mongoose = require('mongoose');

const courseSchema = mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    code: {
      type: String,
      required: true,
    },
    language: {
      type: String,
      required: true,
      enum: enums.Language
    },
    description: {
      short: String,
      detail: String,
    },
    price: {
      type: Number,
      required: true,
    },
    maxStudents: {
      type: Number,
      default: 10,
    },
    numberLessons: {
      type: Number,
      required: true,
    },
    documents: [
      {
        name: String,
        createdAt: String,
        size: Number,
        url: String,
      },
    ],
    isActive: {
      type: Boolean,
      default: false,
    },
    openDay: {
      type: String,
      required: true,
    },
    endDay: {
      type: String,
    },
    avatarUrl: {
      type: String,
      required: true,
    },
    timetable: [
      {
        dayOfWeek: Number,
        timeZone: String,
        timeZoneNumber: Number,
        start: {
          hour: Number,
          minute: Number,
        },
        end: {
          hour: Number,
          minute: Number
        }
      },
    ],
    linkMeet: {
      type: String,
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('courses', courseSchema);
