const FlexibleLesson = require('../models/flexibleLesson');
const mongoose = require('mongoose');
const enums = require('../constants/enum');
const utilities = require('../utils/utility');
const ObjectId = mongoose.Types.ObjectId;
const logger = require('../utils/logger');
// Constants
const { LessonType } = require('../constants/enum');
const helper = require('../helper/helperFunction');
const constants = require('../constants/constants');
const moment = require('moment');

const createFlexibleLessons = async (lessons) => {
  return await FlexibleLesson.insertMany(lessons);
};

const createFlexibleLesson = async (lesson) => {
  const newLesson = new FlexibleLesson(lesson);
  return await newLesson.save();
};

const getFlexibleLessons = async (filter) => {
  return await FlexibleLesson.find(filter, 'name imgUrl').exec();
};

const getAllFlexibleLessons = async (filter) => {
  return await FlexibleLesson.find(filter);
};

const getFlexibleLesson = async (filter) => {
  return await FlexibleLesson.findOne(filter).exec();
};

//#region getAllFlexibleLessonsForAdmin
const getAllFlexibleLessonsForAdmin = async (query, option) => {
  const { _textSearch, _filter, pagination } = option || {};

  const pipeline = [
    {
      $match: {
        ...query,
      },
    },
    {
      $lookup: {
        from: 'tutors',
        localField: 'tutor',
        foreignField: '_id',
        as: 'tutors',
      },
    },
    {
      $unwind: {
        path: '$tutors',
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $addFields: {
        nameSearch: { $concat: ['$tutors.lastName', ' ', '$tutors.firstName'] },
      },
    },
    {
      $addFields: {
        finish: {
          $switch: {
            branches: [
              {
                case: {
                  $and: [
                    {
                      $lt: [{ $subtract: ['$endTime', '$$NOW'] }, 0],
                    },
                    {
                      $ne: ['$status', enums.StatusFlexibleLesson.CANCEL],
                    },
                  ],
                },
                then: enums.StatusFlexibleLesson.FINISH,
              },
            ],
            default: enums.StatusFlexibleLesson.REGISTERED,
          },
        },
      },
    },
    {
      $lookup: {
        from: 'students',
        localField: 'student',
        foreignField: '_id',
        as: 'students',
      },
    },
    {
      $unwind: {
        path: '$students',
        preserveNullAndEmptyArrays: true,
      },
    },
    utilities.lookup('notifications', '_id', 'titleId', 'notification'),
    utilities.unwind('$notification', true),
    utilities.lookup('notify-users', 'notification._id', 'notification', 'notifyUser'),
    utilities.unwind('$notifyUser', true),
    utilities.lookup('leave-notices', '_id', 'flexibleLesson', 'leaveNotices'),
    utilities.unwind('$leaveNotices', true),
    utilities.lookup('reviews', '_id', 'flexibleLesson', 'reviews'),
    utilities.unwind('$reviews', true),
    {
      $group: {
        _id: '$_id',
        price: { $first: '$price' },
        information: { $first: '$information' },
        startTime: { $first: '$startTime' },
        endTime: { $first: '$endTime' },
        name: { $first: '$name' },
        imgUrl: { $first: '$imgUrl' },
        skill: { $first: '$skill' },
        description: { $first: '$description' },
        nameSearch: { $first: '$nameSearch' },
        status: { $first: '$status' },
        category: { $first: '$category' },
        finish: { $first: '$finish' },
        tutors: { $first: '$tutors' },
        students: { $first: '$students' },
        reviews: { $first: '$reviews' },
        notifyUser: { $first: '$notifyUser' },
        leaveNotices: { $first: '$leaveNotices' },
        createdAt: { $first: '$createdAt' },
      },
    },
    {
      $project: {
        _id: 1,
        tutor: {
          lastName: '$tutors.lastName',
          firstName: '$tutors.firstName',
          _id: '$tutors._id',
          avatarUrl: '$tutors.avatarUrl',
        },
        students: {
          lastName: '$students.lastName',
          firstName: '$students.firstName',
          _id: '$students._id',
          avatarUrl: '$students.avatarUrl',
        },
        reviews: 1,
        price: 1,
        startTime: 1,
        endTime: 1,
        name: 1,
        imgUrl: 1,
        information: 1,
        nameSearch: 1,
        status: 1,
        finish: 1,
        createdAt: 1,
        notifyUser: { _id: '$notifyUser._id', isActive: '$notifyUser.isActive' },
        leaveNotices: { _id: '$leaveNotices._id', type: '$leaveNotices.type' },
      },
    },
    {
      $sort: { createdAt: -1 },
    },
  ];

  if (_textSearch) {
    pipeline.push({ $match: { nameSearch: { $regex: _textSearch, $options: 'i' } } });
  }
  if (_filter.status) {
    pipeline.push({ $match: { status: _filter.status } });
  }

  if (_filter.finish) {
    pipeline.push({
      $match: {
        $expr: {
          $and: [
            {
              $ne: ['$status', enums.StatusFlexibleLesson.CANCEL],
            },
            {
              $eq: ['$finish', _filter.finish],
            },
          ],
        },
      },
    });
  }
  if (_filter.isActive) {
    pipeline.push({
      $match: {
        $expr: {
          $and: [{ $eq: ['$notifyUser.isActive', helper.strToBool(_filter.isActive)] }],
        },
      },
    });
  }

  if (_filter.type) {
    pipeline.push({
      $match: {
        $expr: {
          $and: [{ $eq: ['$leaveNotices.type', _filter.type] }],
        },
      },
    });
  }
  const data = await FlexibleLesson.aggregate(pipeline);
  const total = data.length;

  if (pagination) {
    pipeline.push(
      {
        $skip: pagination._page * pagination._limit - pagination._limit,
      },
      {
        $limit: pagination._limit,
      }
    );
  }

  const lessons = await FlexibleLesson.aggregate(pipeline);

  return { lessons, total };
};
//#endregion getAllFlexibleLessonsForAdmin

//#region getAllFlexibleLessonsForStudent
const getAllFlexibleLessonsForStudent = async (
  { _textSearch, _language, _price, _time, _dow, _timezone },
  { _page, _limit }
) => {
  const now = helper.dateToStringUTC(new Date(), constants.DATE_TIME_FORMAT);
  const skip = _limit * (_page - 1);

  const pipeline = [
    {
      $addFields: {
        _startTime: {
          $dateToString: { format: constants.DATE_TIME_FORMAT_AGGREGATE, date: '$startTime' },
        },
      },
    },
    {
      $match: {
        _startTime: { $gte: now },
        student: { $exists: false },
        $or: [{ status: enums.StatusFlexibleLesson.CANCEL }, { status: enums.StatusFlexibleLesson.OPEN }],
      },
    },
  ];

  if (_textSearch) {
    pipeline.push({
      $match: {
        name: { $regex: _textSearch, $options: 'i' },
      },
    });
  }
  if (_language) {
    pipeline.push({
      $match: {
        language: _language,
      },
    });
  }
  if (_price) {
    switch (_price) {
      case enums.FilterPrice.LT10:
        pipeline.push({
          $match: {
            price: { $lt: 10 },
          },
        });
        break;
      case enums.FilterPrice.GTE10_LTE25:
        pipeline.push({
          $match: {
            $and: [{ price: { $gte: 10 } }, { price: { $lte: 25 } }],
          },
        });
        break;
      case enums.FilterPrice.GT25:
        pipeline.push({
          $match: {
            price: { $gt: 25 },
          },
        });
        break;
    }
  }
  if (_dow) {
    pipeline.push(
      {
        $addFields: {
          dayOfWeek: { $dayOfWeek: '$startTime' },
        },
      },
      {
        $match: {
          dayOfWeek: { $in: _dow },
        },
      }
    );
  }
  if (_time && _time.length > 0) {
    pipeline.push({
      $addFields: {
        startHour: { $hour: { date: '$startTime', timezone: _timezone } },
        endHour: { $hour: { date: '$endTime', timezone: _timezone } },
      },
    });

    const filter = [];
    _time.forEach((element, index) => {
      const beforeElement = _time[index - 1];

      if (element && element - beforeElement === 1) {
        filter[filter.length - 1].endHour = constants.TIME_FILTER[element].endHour;
      } else {
        filter.push(constants.TIME_FILTER[element]);
      }
    });

    pipeline.push({
      $match: {
        $or: filter,
      },
    });
  }

  const documents = await FlexibleLesson.aggregate(pipeline);

  pipeline.push(
    {
      $skip: skip,
    },
    {
      $limit: _limit,
    },
    {
      $lookup: {
        from: 'tutors',
        localField: 'tutor',
        foreignField: '_id',
        as: 'tutors',
      },
    },
    {
      $unwind: {
        path: '$tutors',
        preserveNullAndEmptyArrays: true,
      },
    },
    utilities.lookup('reviews', 'tutors._id', 'tutor', 'reviews'),
    {
      $project: {
        imgUrl: 1,
        name: 1,
        price: 1,
        startTime: 1,
        endTime: 1,
        skill: 1,
        language: 1,
        description: 1,
        tutors: {
          _id: 1,
          avatarUrl: 1,
          firstName: 1,
          lastName: 1,
          nationality: 1,
          avgStar: { $avg: '$reviews.star' },
        },
        status: 1,
        linkMeet: 1,
      },
    }
  );

  const lessons = await FlexibleLesson.aggregate(pipeline);
  return { lessons, _total: documents.length };
};
//#endregion getAllFlexibleLessonsForAdmin

const countFlexibleLessons = async () => {
  const flexibleLessons = await FlexibleLesson.aggregate([
    {
      $match: {
        endTime: { $lt: new Date(moment().utc()) },
        status: { $ne: enums.StatusFlexibleLesson.CANCEL },
      },
    },
  ]);

  return flexibleLessons.length;
};

//#region updateFlexibleLesson
const updateFlexibleLesson = async (lessonId, newModel) => {
  return await FlexibleLesson.findByIdAndUpdate(lessonId, newModel).exec();
};
//#endregion updateFlexibleLesson

const getAllFilter = async (filter) => {
  return await FlexibleLesson.find(filter);
};

//#region getScheduleFlexibleLessonStudent
const getScheduleFlexibleLessonStudent = async (idStudent, filter) => {
  const { startDateLimit, endDateLimit } = filter;
  const pipeLine = [
    {
      $match: {
        student: mongoose.Types.ObjectId(idStudent),
        status: enums.StatusFlexibleLesson.REGISTERED,
      },
    },
  ];

  if (startDateLimit && endDateLimit) {
    pipeLine.push(
      {
        $addFields: {
          startDate: {
            $dateToString: { format: constants.DATE_FORMAT_AGGREGATE, date: '$startTime' },
          },
        },
      },
      {
        $addFields: {
          endDate: {
            $dateToString: { format: constants.DATE_FORMAT_AGGREGATE, date: '$endTime' },
          },
        },
      },
      {
        $match: {
          startDate: { $gte: startDateLimit },
          endDate: { $lte: endDateLimit },
        },
      }
    );
  }

  pipeLine.push(
    {
      $addFields: {
        totalTime: {
          $divide: [{ $subtract: ['$endTime', '$startTime'] }, 60 * 1000 * 60],
        },
      },
    },
    utilities.lookup('tutors', 'tutor', '_id', 'tutor'),
    utilities.unwind('$tutor', true),
    {
      $project: {
        title: '$name',
        start: '$startTime',
        end: '$endTime',
        status: 1,
        tutor: { firstName: 1, _id: 1, lastName: 1, avatarUrl: 1 },
        totalTime: 1,
        type: LessonType.FLEXIBLE,
      },
    }
  );

  const result = await FlexibleLesson.aggregate(pipeLine);

  return result;
};
//#endregion getScheduleFlexibleLessonStudent

//#region getFlexibleLessonById
const getFlexibleLessonById = async (flexibleLessonId) => {
  return await FlexibleLesson.findById(flexibleLessonId);
};
//#endregion getFlexibleLessonById

//#region getDetailFlexibleLessonForStudent
const getDetailFlexibleLessonForStudent = async (flexibleLessonId) => {
  const pipeline = [
    {
      $match: {
        _id: ObjectId(flexibleLessonId),
      },
    },
    utilities.lookup('tutors', 'tutor', '_id', 'tutors'),
    utilities.unwind('$tutors', true),
    utilities.lookup('reviews', 'tutors._id', 'tutor', 'reviews'),
    {
      $project: {
        name: 1,
        imgUrl: 1,
        description: 1,
        language: 1,
        category: 1,
        startTime: 1,
        endTime: 1,
        price: 1,
        skill: 1,
        tutors: {
          _id: 1,
          firstName: 1,
          lastName: 1,
          avatarUrl: 1,
          avgStar: { $avg: '$reviews.star' },
        },
      },
    },
  ];

  return await FlexibleLesson.aggregate(pipeline);
};
//#endregion getDetailFlexibleLessonForStudent

const getAllFlexibleLessonsByTutorId = async (tutorId) => {
  return await FlexibleLesson.find({ tutor: tutorId });
};

const getDetailFlexibleLessons = async (lessonId) => {
  // return await FlexibleLesson.findOne(
  //   { _id: ObjectId(lessonId) },
  //   'imgUrl name description startTime endTime status price linkMeet skill information'
  // )
  //   .populate('category', 'name')
  //   .populate('student', '_id lastName firstName avatarUrl')
  //   .populate('tutor', '_id lastName firstName avatarUrl')
  //   .populate('review', '_id star content');

  const flexibleLesson = await FlexibleLesson.aggregate([
    { $match: { _id: mongoose.Types.ObjectId(lessonId) } },
    {
      $lookup: {
        from: 'tutors',
        localField: 'tutor',
        foreignField: '_id',
        as: 'tutor',
        pipeline: [{ $project: { firstName: 1, lastName: 1, _id: 1, avatarUrl: 1, user: 1 } }],
      },
    },
    utilities.unwind('$tutor', true),
    {
      $lookup: {
        from: 'students',
        localField: 'student',
        foreignField: '_id',
        as: 'student',
        pipeline: [{ $project: { firstName: 1, lastName: 1, _id: 1, avatarUrl: 1, user: 1 } }],
      },
    },
    utilities.unwind('$student', true),
    {
      $lookup: {
        from: 'reviews',
        localField: '_id',
        foreignField: 'flexibleLesson',
        as: 'review',
        pipeline: [{ $project: { _id: 1, star: 1, content: 1 } }],
      },
    },
    utilities.unwind('$review', true),
    {
      $project: {
        imgUrl: 1,
        name: 1,
        description: 1,
        startTime: 1,
        endTime: 1,
        status: 1,
        price: 1,
        linkMeet: 1,
        skill: 1,
        information: 1,
        tutor: 1,
        student: 1,
        review: 1,
      },
    },
  ]);

  return flexibleLesson[0];
};

const getAllFlexibleLessonsForRole = async (filter) => {
  const pipeline = [{ $match: {} }];
  if (filter.studentId) {
    pipeline.push({ $match: { student: mongoose.Types.ObjectId(filter.studentId) } });
  }
  if (filter.tutorId) {
    pipeline.push({ $match: { tutor: mongoose.Types.ObjectId(filter.tutorId) } });
  }
  const documents = await FlexibleLesson.aggregate(pipeline);

  if (filter._textSearch) {
    pipeline.push({
      $match: {
        name: { $regex: filter._textSearch, $options: 'i' },
      },
    });
  }
  const document = await FlexibleLesson.aggregate(pipeline);

  const { _page, _limit } = filter.pagination;

  pipeline.push({ $skip: (_page - 1) * _limit });
  pipeline.push({ $limit: _limit });
  const flexibles = await FlexibleLesson.aggregate(pipeline);

  return { flexibles, count: document.length, total: documents.length };
};
module.exports = {
  createFlexibleLessons,
  createFlexibleLesson,
  getFlexibleLessons,
  getFlexibleLesson,
  getAllFlexibleLessonsForAdmin,
  countFlexibleLessons,
  updateFlexibleLesson,
  getAllFilter,
  getScheduleFlexibleLessonStudent,
  getAllFlexibleLessonsForStudent,
  getFlexibleLessonById,
  getDetailFlexibleLessonForStudent,
  getAllFlexibleLessonsByTutorId,
  getDetailFlexibleLessons,
  getAllFlexibleLessonsForRole,
  getAllFlexibleLessons,
};
