const e = require('express');
const mongoose = require('mongoose');
const TutorAvailableSchedule = require('../models/tutorAvailableSchedule');
const constants = require('../constants/constants');

const createTutorAvailableSchedule = async (data) => {
  const newData = new TutorAvailableSchedule(data);
  return await newData.save();
};

const getTutorAvailableSchedules = async (filter) => {
  return await TutorAvailableSchedule.findOne(filter);
};

const getTutorAvailableSchedulesByMonth = async (filter) => {
  const { firstDay, lastDay, timeZone } = filter;
  const result = await TutorAvailableSchedule.aggregate([
    {
      $addFields: {
        startDateFormat: {
          $dateToString: {
            format: constants.DATE_FORMAT_AGGREGATE,
            date: '$startTime',
            timezone: timeZone,
          },
        },
        endDateFormat: {
          $dateToString: {
            format: constants.DATE_FORMAT_AGGREGATE,
            date: '$endTime',
            timezone: timeZone,
          },
        },
        start: '$startTime',
        end: '$endTime',
      },
    },
    {
      $match: {
        status: false,
        tutor: mongoose.Types.ObjectId(filter.tutor),
        startDateFormat: { $gte: firstDay },
        endDateFormat: { $lte: lastDay },
      },
    },
    {
      $project: {
        _id: 1,
        start: 1,
        end: 1,
        timeZone: 1,
        month: 1,
      },
    },
  ]);
  return result;
};

const createManyTutorAvailableSchedules = async (arrData) => {
  return await TutorAvailableSchedule.insertMany(arrData);
};

const deleteTutorTutorAvailableSchedule = async (filter) => {
  return await TutorAvailableSchedule.deleteOne(filter);
};

const updateTutorTutorAvailableSchedule = async (filter, newModel) => {
  return await TutorAvailableSchedule.findByIdAndUpdate(filter, newModel);
};
module.exports = {
  createTutorAvailableSchedule,
  getTutorAvailableSchedules,
  getTutorAvailableSchedulesByMonth,
  createManyTutorAvailableSchedules,
  deleteTutorTutorAvailableSchedule,
  updateTutorTutorAvailableSchedule,
};
