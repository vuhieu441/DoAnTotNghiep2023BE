const Notification = require('../models/notification');
const NotifyUser = require('../models/notifyUsers');
const utilities = require('../utils/utility');
const mongoose = require('mongoose');
const { DATE_FORMAT_AGGREGATE } = require('../constants/constants');

const createNotification = async (newModel) => {
  const newData = new Notification(newModel);
  return await newData.save();
};

const getNotification = async (filter) => {
  return await Notification.findOne(filter);
};

const getAllNotifications = async (filter) => {
  return await Notification.find(filter);
};

const getAllNotificationsByUser = async (filter, pagination) => {
  const offset = (pagination._page - 1) * pagination._limit;
  let totalDocuments = 0;
  let lastPage = 1;

  const pipeLine = [
    {
      $match: {
        user: mongoose.Types.ObjectId(filter.userId),
      },
    },
  ];

  if (filter.isSeen) {
    const isSeenFilter = filter.isSeen === 'true';
    pipeLine.push({
      $match: {
        isSeen: isSeenFilter,
      },
    });
  }

  if (filter.sortTime) {
    pipeLine.push(
      {
        $addFields: {
          createdAtFormat: {
            $dateToString: {
              format: DATE_FORMAT_AGGREGATE,
              date: '$createdAt',
            },
          },
        },
      },
      {
        $match: {
          createdAtFormat: filter.sortTime,
        },
      }
    );
  }

  totalDocuments = await NotifyUser.aggregate(pipeLine);
  lastPage = Math.floor(totalDocuments.length / pagination._limit) + 1;

  pipeLine.push(
    utilities.lookup('notifications', 'notification', '_id', 'notification'),
    utilities.unwind('$notification'),
    utilities.lookup('promotions', 'notification.titleId', '_id', 'promotion'),
    utilities.unwind('$promotion', true),
    utilities.lookup('leave-notices', 'notification.titleId', '_id', 'leaveNotice'),
    utilities.unwind('$leaveNotice', true),
    utilities.lookup('flexible-lessons', 'notification.titleId', '_id', 'flexibleLesson'),
    utilities.unwind('$flexibleLesson', true),
    utilities.lookup('fixed-lessons', 'notification.titleId', '_id', 'fixedLesson'),
    utilities.unwind('$fixedLesson', true),
    utilities.lookup('students', 'flexibleLesson.student', '_id', 'flexibleLesson.student'),
    utilities.unwind('$flexibleLesson.student', true),
    utilities.lookup('tutors', 'flexibleLesson.tutor', '_id', 'flexibleLesson.tutor'),
    utilities.unwind('$flexibleLesson.tutor', true),
    utilities.lookup('flexible-lessons', 'leaveNotice.flexibleLesson', '_id', 'leaveNotice.flexibleLesson'),
    utilities.unwind('$leaveNotice.flexibleLesson', true),
    utilities.lookup('fixed-lessons', 'leaveNotice.fixedLesson', '_id', 'leaveNotice.fixedLesson'),
    utilities.unwind('$leaveNotice.fixedLesson', true),
    utilities.lookup('courses', 'leaveNotice.fixedLesson.course', '_id', 'leaveNotice.course'),
    utilities.unwind('$leaveNotice.course', true),
    utilities.lookup('students', 'leaveNotice.student', '_id', 'leaveNotice.student'),
    utilities.unwind('$leaveNotice.student', true),
    utilities.lookup('tutors', 'leaveNotice.tutor', '_id', 'leaveNotice.tutor'),
    utilities.unwind('$leaveNotice.tutor', true),
    { $sort: { createdAt: -1 } },
    { $skip: offset },
    { $limit: pagination._limit },
    {
      $project: {
        _id: 1,
        isSeen: 1,
        isActive: 1,
        notification: {
          _id: 1,
          title: 1,
          createdAt: 1,
        },
        flexibleLesson: {
          _id: 1,
          tutor: 1,
          information: 1,
          price: 1,
          status: 1,
          student: 1,
          startTime: 1,
          endTime: 1,
        },
        leaveNotice: {
          _id: 1,
          flexibleLesson: 1,
          fixedLesson: 1,
          course: 1,
          student: 1,
          tutor: 1,
          type: 1,
        },
        promotion: 1,
      },
    }
  );

  const notifications = await NotifyUser.aggregate(pipeLine);

  return { notifications, lastPage };
};

const countNotificationsNotSeen = async (idUser) => {
  const pipeline = [
    {
      $match: {
        user: mongoose.Types.ObjectId(idUser),
        isSeen: false,
      },
    },
  ];
  const result = await NotifyUser.aggregate(pipeline);

  return result.length;
};

const getNotificationById = async (idNotification, idUser) => {
  const pipeLine = [
    {
      $match: {
        notification: mongoose.Types.ObjectId(idNotification),
        user: mongoose.Types.ObjectId(idUser),
      },
    },
    utilities.lookup('notifications', 'notification', '_id', 'notification'),
    utilities.unwind('$notification'),
    utilities.lookup('promotions', 'notification.titleId', '_id', 'promotion'),
    utilities.unwind('$promotion', true),
    utilities.lookup('leave-notices', 'notification.titleId', '_id', 'leaveNotice'),
    utilities.unwind('$leaveNotice', true),
    utilities.lookup('flexible-lessons', 'notification.titleId', '_id', 'flexibleLesson'),
    utilities.unwind('$flexibleLesson', true),
    utilities.lookup('fixed-lessons', 'notification.titleId', '_id', 'fixedLesson'),
    utilities.unwind('$fixedLesson', true),
    utilities.lookup('students', 'flexibleLesson.student', '_id', 'flexibleLesson.student'),
    utilities.unwind('$flexibleLesson.student', true),
    utilities.lookup('tutors', 'flexibleLesson.tutor', '_id', 'flexibleLesson.tutor'),
    utilities.unwind('$flexibleLesson.tutor', true),
    utilities.lookup('flexible-lessons', 'leaveNotice.flexibleLesson', '_id', 'leaveNotice.flexibleLesson'),
    utilities.unwind('$leaveNotice.flexibleLesson', true),
    utilities.lookup('fixed-lessons', 'leaveNotice.fixedLesson', '_id', 'leaveNotice.fixedLesson'),
    utilities.unwind('$leaveNotice.fixedLesson', true),
    utilities.lookup('courses', 'leaveNotice.fixedLesson.course', '_id', 'leaveNotice.course'),
    utilities.unwind('$leaveNotice.course', true),
    utilities.lookup('students', 'leaveNotice.student', '_id', 'leaveNotice.student'),
    utilities.unwind('$leaveNotice.student', true),
    utilities.lookup('tutors', 'leaveNotice.tutor', '_id', 'leaveNotice.tutor'),
    utilities.unwind('$leaveNotice.tutor', true),
    {
      $project: {
        _id: 1,
        isSeen: 1,
        isActive: 1,
        notification: {
          _id: 1,
          title: 1,
          createdAt: 1,
        },
        flexibleLesson: {
          _id: 1,
          tutor: 1,
          information: 1,
          price: 1,
          status: 1,
          student: 1,
          startTime: 1,
          endTime: 1,
        },
        leaveNotice: {
          _id: 1,
          flexibleLesson: 1,
          fixedLesson: 1,
          course: 1,
          student: 1,
          tutor: 1,
          type: 1,
        },
        promotion: 1,
      },
    },
  ];

  const notifications = await NotifyUser.aggregate(pipeLine);

  return { notification: notifications[0] };
};

module.exports = {
  createNotification,
  getNotification,
  getAllNotifications,
  countNotificationsNotSeen,
  getAllNotificationsByUser,
  getNotificationById,
};
