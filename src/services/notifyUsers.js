const NotifyUser = require('../models/notifyUsers');
const mongoose = require('mongoose');
const utilities = require('../utils/utility');
const enums = require('../constants/enum');
const { strToBool } = require('../helper/helperFunction');

const createNotifyUser = async (newModel) => {
  const newData = new NotifyUser(newModel);
  return await newData.save();
};

const getNotifyUser = async (filter) => {
  return await NotifyUser.findOne(filter);
};

const getAllNotifyUsers = async (filter) => {
  return await NotifyUser.find(filter);
};

const createManyNotifyUsers = async (arrayNewModel) => {
  return await NotifyUser.insertMany(arrayNewModel);
};

const updateNotifyUser = async (filter, newModel) => {
  return await NotifyUser.updateOne(filter, newModel);
};

const updateManyNotifyUser = async (filter, newModel) => {
  return await NotifyUser.updateMany(filter, newModel);
};

const getAllNoticationByAdmin = async (filter, pagination) => {
  const _offset = (pagination._page - 1) * pagination._limit;
  const pipeline = [
    {
      $match: {
        $expr: {
          $and: [{ $eq: ['$user', mongoose.Types.ObjectId(filter.userId)] }],
        },
      },
    },
    utilities.lookup('notifications', 'notification', '_id', 'notification'),
    utilities.unwind('$notification'),
    utilities.lookup('leave-notices', 'notification.titleId', '_id', 'leaveNotion'),
    utilities.unwind('$leaveNotion', true),
    utilities.lookup('students', 'leaveNotion.student', '_id', 'student'),
    utilities.unwind('$student'),
    utilities.lookup('tutors', 'leaveNotion.tutor', '_id', 'tutor'),
    utilities.unwind('$tutor'),
    utilities.lookup('fixed-lessons', 'leaveNotion.fixedLesson', '_id', 'fixedLesson'),
    utilities.unwind('$fixedLesson'),
    utilities.lookup('courses', 'fixedLesson.course', '_id', 'course'),
    utilities.unwind('$course'),
    {
      $addFields: {
        owner: {
          $cond: [{ $eq: ['$student.user', '$notification.owner'] }, enums.UserRole.STUDENT, enums.UserRole.TUTOR],
        },
      },
    },
    { $sort: { createdAt: -1 } },
  ];
  const documents = await NotifyUser.aggregate(pipeline);

  if (filter.sortTime) {
    pipeline.push({
      $match: {
        $expr: {
          $and: [
            { $eq: [{ $year: '$notification.createdAt' }, { $year: { $toDate: filter.sortTime } }] },
            { $eq: [{ $month: '$notification.createdAt' }, { $month: { $toDate: filter.sortTime } }] },
            { $eq: [{ $dayOfYear: '$notification.createdAt' }, { $dayOfYear: { $toDate: filter.sortTime } }] },
          ],
        },
      },
    });
  }

  if (filter.isSeen) {
    pipeline.push({ $match: { isSeen: strToBool(filter.isSeen) } });
  }

  const documentsIsSort = await NotifyUser.aggregate(pipeline);

  pipeline.push(
    { $skip: _offset },
    { $limit: pagination._limit },
    {
      $project: {
        _id: 1,
        isSeen: 1,
        notification: { createdAt: 1, title: 1, content: 1, _id: 1 },
        owner: 1,
        student: { _id: 1, lastName: 1, firstName: 1, avatarUrl: 1 },
        tutor: { _id: 1, lastName: 1, firstName: 1, avatarUrl: 1 },
        course: { _id: 1, name: 1, openDay: 1, endDay: 1, description: 1 },
        fixedLesson: { _id: 1, startTime: 1, endTime: 1 },
        createdAt: 1,
      },
    }
  );
  const notifications = await NotifyUser.aggregate(pipeline);

  return { notifications, count: documentsIsSort.length, total: documents.length };
};

const getAllNoticationByStudent = async (filter, pagination) => {
  const _offset = (pagination._page - 1) * pagination._limit;
  const pipeline = [
    {
      $match: {
        $expr: {
          $and: [{ $eq: ['$user', mongoose.Types.ObjectId(filter.userId)] }],
        },
      },
    },
    utilities.lookup('notifications', 'notification', '_id', 'notification'),
    utilities.unwind('$notification'),
    utilities.lookup('leave-notices', 'notification.titleId', '_id', 'leaveNotion'),
    utilities.unwind('$leaveNotion', true),
    utilities.lookup('students', 'leaveNotion.student', '_id', 'student'),
    utilities.unwind('$student'),
    utilities.lookup('tutors', 'leaveNotion.tutor', '_id', 'tutor'),
    utilities.unwind('$tutor'),
    utilities.lookup('flexible-lessons', 'leaveNotion.flexibleLesson', '_id', 'flexibleLesson'),
    utilities.unwind('$flexibleLesson'),
    {
      $addFields: {
        owner: {
          $cond: [{ $eq: ['$student.user', '$notification.owner'] }, enums.UserRole.STUDENT, enums.UserRole.TUTOR],
        },
      },
    },
    { $sort: { createdAt: -1 } },
  ];
  const documents = await NotifyUser.aggregate(pipeline);

  if (filter.sortTime) {
    pipeline.push({
      $match: {
        $expr: {
          $and: [
            { $eq: [{ $year: '$notification.createdAt' }, { $year: { $toDate: filter.sortTime } }] },
            { $eq: [{ $month: '$notification.createdAt' }, { $month: { $toDate: filter.sortTime } }] },
            { $eq: [{ $dayOfYear: '$notification.createdAt' }, { $dayOfYear: { $toDate: filter.sortTime } }] },
          ],
        },
      },
    });
  }

  if (filter.isSeen) {
    pipeline.push({ $match: { isSeen: strToBool(filter.isSeen) } });
  }
  const documentsIsSort = await NotifyUser.aggregate(pipeline);

  pipeline.push(
    { $skip: _offset },
    { $limit: pagination._limit },
    {
      $project: {
        _id: 1,
        isSeen: 1,
        notification: { createdAt: 1, title: 1, content: 1, _id: 1 },
        owner: 1,
        student: { _id: 1, lastName: 1, firstName: 1, avatarUrl: 1 },
        tutor: { _id: 1, lastName: 1, firstName: 1, avatarUrl: 1 },
        flexibleLesson: {
          _id: 1,
          name: 1,
          startTime: 1,
          endTime: 1,
          description: '$flexibleLesson.information.description',
        },
        createdAt: 1,
      },
    }
  );
  const notifications = await NotifyUser.aggregate(pipeline);

  return { notifications, count: documentsIsSort.length, total: documents.length };
};

const getAllNoticationByTutor = async (filter, pagination) => {
  const _offset = (pagination._page - 1) * pagination._limit;
  const pipeline = [
    {
      $match: {
        $expr: {
          $and: [{ $eq: ['$user', mongoose.Types.ObjectId(filter.userId)] }],
        },
      },
    },
    { $sort: { createdAt: -1 } },
    utilities.lookup('notifications', 'notification', '_id', 'notification'),
    utilities.unwind('$notification'),
    utilities.lookup('flexible-lessons', 'notification.titleId', '_id', 'flexibleLesson'),
    utilities.unwind('$flexibleLesson'),
    utilities.lookup('tutors', 'flexibleLesson.tutor', '_id', 'tutor'),
    utilities.unwind('$tutor'),
    utilities.lookup('students', 'flexibleLesson.student', '_id', 'student'),
    utilities.unwind('$student'),
    {
      $addFields: {
        owner: enums.UserRole.STUDENT,
      },
    },
    { $sort: { createdAt: -1 } },
  ];
  const documents = await NotifyUser.aggregate(pipeline);

  if (filter.sortTime) {
    pipeline.push({
      $match: {
        $expr: {
          $and: [
            { $eq: [{ $year: '$notification.createdAt' }, { $year: { $toDate: filter.sortTime } }] },
            { $eq: [{ $month: '$notification.createdAt' }, { $month: { $toDate: filter.sortTime } }] },
            { $eq: [{ $dayOfYear: '$notification.createdAt' }, { $dayOfYear: { $toDate: filter.sortTime } }] },
          ],
        },
      },
    });
  }

  if (filter.isSeen) {
    pipeline.push({ $match: { isSeen: strToBool(filter.isSeen) } });
  }
  const documentsIsSort = await NotifyUser.aggregate(pipeline);

  pipeline.push(
    { $skip: _offset },
    { $limit: pagination._limit },
    {
      $project: {
        _id: 1,
        isSeen: 1,
        isActive: 1,
        notification: { createdAt: 1, title: 1, content: 1, _id: 1 },
        owner: 1,
        student: { _id: 1, lastName: 1, firstName: 1, avatarUrl: 1 },
        tutor: { _id: 1, lastName: 1, firstName: 1, avatarUrl: 1 },
        flexibleLesson: {
          _id: 1,
          name: 1,
          startTime: 1,
          endTime: 1,
          description: '$flexibleLesson.information.description',
        },
        createdAt: 1,
      },
    }
  );
  const notifications = await NotifyUser.aggregate(pipeline);

  return { notifications, count: documentsIsSort.length, total: documents.length };
};

const getAllNoticationPromotion = async (filter, pagination) => {
  const _offset = (pagination._page - 1) * pagination._limit;
  const pipeline = [
    {
      $match: {
        $expr: {
          $and: [{ $eq: ['$user', mongoose.Types.ObjectId(filter.userId)] }],
        },
      },
    },
    utilities.lookup('notifications', 'notification', '_id', 'notification'),
    utilities.unwind('$notification'),
    utilities.lookup('promotions', 'notification.titleId', '_id', 'promotions'),
    utilities.unwind('$promotions'),
    {
      $addFields: {
        owner: enums.UserRole.ADMIN,
      },
    },
    { $sort: { createdAt: -1 } },
  ];
  const documents = await NotifyUser.aggregate(pipeline);

  if (filter.sortTime) {
    pipeline.push({
      $match: {
        $expr: {
          $and: [
            { $eq: [{ $year: '$notification.createdAt' }, { $year: { $toDate: filter.sortTime } }] },
            { $eq: [{ $month: '$notification.createdAt' }, { $month: { $toDate: filter.sortTime } }] },
            { $eq: [{ $dayOfYear: '$notification.createdAt' }, { $dayOfYear: { $toDate: filter.sortTime } }] },
          ],
        },
      },
    });
  }

  if (filter.isSeen) {
    pipeline.push({ $match: { isSeen: strToBool(filter.isSeen) } });
  }
  const documentsIsSort = await NotifyUser.aggregate(pipeline);

  pipeline.push(
    { $skip: _offset },
    { $limit: pagination._limit },
    {
      $project: {
        _id: 1,
        isSeen: 1,
        notification: { createdAt: 1, title: 1, content: 1, _id: 1 },
        owner: 1,
        promotions: {
          _id: 1,
          name: 1,
          price: 1,
          promo: 1,
          expirationDate: 1,
          point: 1,
          createdAt: 1,
          isPublic: 1,
        },
        createdAt: 1,
      },
    }
  );
  const notifications = await NotifyUser.aggregate(pipeline);

  return { notifications, count: documentsIsSort.length, total: documents.length };
};

const countAllIsSeen = async (filter) => {
  const pipeline = [
    {
      $match: {
        $expr: {
          $and: [{ $eq: ['$user', mongoose.Types.ObjectId(filter.userId)] }, { $eq: ['$isSeen', false] }],
        },
      },
    },
  ];
  const documentsIsSeen = await NotifyUser.aggregate(pipeline);

  return { isSeen: documentsIsSeen.length };
};

module.exports = {
  createNotifyUser,
  getNotifyUser,
  getAllNotifyUsers,
  createManyNotifyUsers,
  getAllNoticationByAdmin,
  updateNotifyUser,
  getAllNoticationByStudent,
  getAllNoticationByTutor,
  updateManyNotifyUser,
  getAllNoticationPromotion,
  countAllIsSeen,
};
