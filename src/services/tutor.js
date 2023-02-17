const Tutor = require('../models/tutor');
const FlexibleLesson = require('../models/flexibleLesson');

// Logger
const logger = require('../utils/logger');

const helper = require('../helper/helperFunction');
const constants = require('../constants/constants');
const utilities = require('../utils/utility');
const enums = require('../constants/enum');
const { ObjectId } = require('mongodb');
const mongoose = require('mongoose');
const tutor = require('../models/tutor');
const helperFunction = require('../helper/helperFunction');

const createTutor = async (tutor) => {
  const newTutor = new Tutor(tutor);
  return await newTutor.save();
};

const getTutor = async (filter) => {
  return await Tutor.findOne(filter).exec();
};

const getDetailTutor = async (_id) => {
  return await Tutor.findById(_id).populate('user', 'email').exec();
};
const getAllTutorByFilter = async (filter) => {
  return await Tutor.find(filter);
};
//#region getTutorById
const getTutorById = async (_id) => {
  return await Tutor.findById(
    _id,
    '_id user firstName lastName email gender languages dob nationality description salaryPerHour certificates isActive isBlock avatarUrl videoUrl phoneNumber startDate'
  );
};
//#endregion getTutorById

const updateTutor = async (_id, update) => {
  return await Tutor.findByIdAndUpdate(_id, update).exec();
};

const updateTutorByUserId = async (_id, update) => {
  return await Tutor.findOneAndUpdate({ user: _id }, update).exec();
};

const deleteTutor = async (_id) => {
  return await Tutor.findByIdAndDelete(_id).exec();
};

const blockTutor = async (_id) => {
  return await Tutor.findByIdAndUpdate(_id, { isBlock: true }).exec();
};

//#region getAllTutors
const getAllTutors = async (textSearch, status, { _page, _limit }) => {
  const skip = _limit * (_page - 1);
  const pipeline = [
    {
      $addFields: {
        name: { $concat: ['$lastName', ' ', '$firstName'] },
      },
    },
  ];
  if (textSearch) {
    pipeline.push({
      $match: {
        name: {
          $regex: textSearch,
          $options: 'i',
        },
      },
    });
  }
  if (status) {
    switch (status) {
      case enums.StatusFilterTutor.ACTIVE:
        pipeline.push({
          $match: {
            isActive: true,
            isBlock: false,
          },
        });
        break;
      case enums.StatusFilterTutor.NOT_ACTIVE:
        pipeline.push({
          $match: {
            isActive: false,
          },
        });
        break;
      case enums.StatusFilterTutor.BLOCK:
        pipeline.push({
          $match: {
            isBlock: true,
          },
        });
        break;
    }
  }

  const documents = await Tutor.aggregate(pipeline);

  pipeline.push(
    {
      $skip: skip,
    },
    {
      $limit: _limit,
    },
    {
      $lookup: {
        from: 'tutor-courses',
        localField: '_id',
        foreignField: 'tutor',
        as: 'tutorCourses',
      },
    },
    {
      $lookup: {
        from: 'courses',
        let: { courseIds: '$tutorCourses.course' },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $in: ['$_id', '$$courseIds'] },
                  {
                    $lte: [{ $subtract: [{ $toDate: '$openDay' }, '$$NOW'] }, 0],
                  },
                ],
              },
            },
          },
        ],
        as: 'courses',
      },
    },
    utilities.unwind('$courses', true),
    {
      $lookup: {
        from: 'student-courses',
        localField: 'courses._id',
        foreignField: 'course',
        as: 'studentCourses',
      },
    },

    {
      $lookup: {
        from: 'fixed-lessons',
        let: { courseId: '$courses._id' },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [{ $eq: ['$course', '$$courseId'] }, { $lte: [{ $subtract: ['$endTime', '$$NOW'] }, 0] }],
              },
            },
          },
          {
            $addFields: {
              totalTime: {
                $divide: [{ $subtract: ['$endTime', '$startTime'] }, 60 * 1000 * 60],
              },
            },
          },
        ],
        as: 'fixedLessons',
      },
    },
    {
      $addFields: {
        totalTimeCourses: {
          $cond: [{ $gt: [{ $size: '$studentCourses' }, 0] }, { $sum: '$fixedLessons.totalTime' }, 0],
        },
      },
    },
    {
      $addFields: {
        totalFixedCourses: {
          $cond: [{ $gt: [{ $size: '$studentCourses' }, 0] }, { $size: '$fixedLessons' }, 0],
        },
      },
    },
    {
      $addFields: {
        studentCourses: {
          $cond: [{ $gt: [{ $size: '$fixedLessons' }, 0] }, '$studentCourses._id', []],
        },
      },
    },
    {
      $group: {
        _id: '$_id',
        lastName: { $first: '$lastName' },
        firstName: { $first: '$firstName' },
        salaryPerHour: { $first: '$salaryPerHour' },
        startDate: { $first: '$startDate' },
        languages: { $first: '$languages' },
        avatarUrl: { $first: '$avatarUrl' },
        isActive: { $first: '$isActive' },
        isBlock: { $first: '$isBlock' },
        totalStudentsCourse: {
          $addToSet: '$studentCourses',
        },
        totalTimeCourses: { $sum: '$totalTimeCourses' },
        totalFixedCourses: { $sum: '$totalFixedCourses' },
        createdAt: { $first: '$createdAt' },
      },
    },
    {
      $lookup: {
        from: 'flexible-lessons',
        let: { tutorId: '$_id' },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ['$tutor', '$$tutorId'] },
                  { $lte: [{ $subtract: ['$endTime', '$$NOW'] }, 0] },
                  { $ne: [{ $type: '$student' }, 'missing'] },
                  {
                    $ne: ['$status', enums.StatusFlexibleLesson.CANCEL],
                  },
                ],
              },
            },
          },
          {
            $addFields: {
              totalTime: {
                $divide: [{ $subtract: ['$endTime', '$startTime'] }, 60 * 1000 * 60],
              },
            },
          },
        ],
        as: 'flexibleLessons',
      },
    },
    { $addFields: { studentFlex: '$flexibleLessons.student' } },
    utilities.lookup('reviews', '_id', 'tutor', 'reviews'),
    {
      $addFields: {
        reviews: { $size: '$reviews' },
      },
    },

    {
      $project: {
        firstName: 1,
        lastName: 1,
        salaryPerHour: 1,
        startDate: 1,
        totalStudents: 1,
        avatarUrl: 1,
        languages: 1,
        isActive: 1,
        isBlock: 1,
        reviews: 1,
        // studentsTaught: { $concatArrays: ['$studentFlexibles', '$studentCourses'] },
        studentCourse: {
          $concatArrays: [
            {
              $reduce: {
                input: '$totalStudentsCourse',
                initialValue: [],
                in: { $concatArrays: ['$$value', '$$this'] },
              },
            },
            '$studentFlex',
          ],
        },
        totalTimes: {
          $sum: [{ $sum: '$flexibleLessons.totalTime' }, '$totalTimeCourses'],
        },
        totalLessons: {
          $sum: [{ $size: '$flexibleLessons' }, '$totalFixedCourses'],
        },
        createdAt: 1,
        name: 1,
      },
    },
    utilities.unwind('$studentCourse', true),
    {
      $group: {
        _id: '$_id',
        firstName: { $first: '$firstName' },
        lastName: { $first: '$lastName' },
        salaryPerHour: { $first: '$salaryPerHour' },
        startDate: { $first: '$startDate' },
        avatarUrl: { $first: '$avatarUrl' },
        languages: { $first: '$languages' },
        isActive: { $first: '$isActive' },
        isBlock: { $first: '$isBlock' },
        reviews: { $first: '$reviews' },
        totalLessons: { $first: '$totalLessons' },
        totalTimes: { $first: '$totalTimes' },
        studentsTaught: { $addToSet: '$studentCourse' },
        createdAt: { $first: '$createdAt' },
      },
    },
    { $addFields: { studentsTaught: { $size: '$studentsTaught' } } },
    { $sort: { createdAt: 1 } }
  );

  const tutors = await Tutor.aggregate(pipeline);
  // tutors.forEach((t) => {
  //   t.totalStudents = [...new Set(t.studentsTaught.map((s) => s.toString()))].length;
  //   delete t.studentsTaught;
  // });
  return { tutors, count: documents.length };
};
//#endregion getAllTutors

//#region getAllTutorsNoPagination
const getAllTutorsNoPagination = async () => {
  return await Tutor.aggregate([
    {
      $match: {
        isActive: true,
        isBlock: false,
        isOAuthGoogle: true,
      },
    },
    {
      $project: {
        name: { $concat: ['$lastName', ' ', '$firstName'] },
        languages: 1,
        avatarUrl: 1,
      },
    },
  ]);
};
//#endregion getAllTutorsNoPagination

const countTutors = async (filter) => {
  return await Tutor.countDocuments(filter);
};

//#region getDetailTutorWithFlexibleLesson
const getDetailTutorWithFlexibleLesson = async (_id) => {
  const nowDate = helper.dateToStringLocal(new Date(), constants.DATE_FORMAT);
  const nowDateTime = helper.dateToStringLocal(new Date(), constants.DATE_TIME_FORMAT);
  return await Tutor.aggregate([
    { $match: { _id: ObjectId(_id) } },
    {
      $lookup: {
        from: 'flexible-lessons',
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ['$tutor', ObjectId(_id)] },
                  {
                    $lte: [{ $subtract: ['$startTime', new Date('1970-01-01')] }, Date.now()],
                  },
                ],
              },
            },
          },
          {
            $project: { student: 1, startTime: 1, endTime: 1 },
          },
        ],
        as: 'flexibleLessons',
      },
    },
    {
      $lookup: {
        from: 'tutor-courses',
        pipeline: [
          {
            $match: {
              $expr: {
                $eq: ['$tutor', ObjectId(_id)],
              },
            },
          },
          {
            $project: { course: 1 },
          },
        ],
        as: 'tutorCourses',
      },
    },
    {
      $lookup: {
        from: 'courses',
        let: { courseIds: '$tutorCourses.course' },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $in: ['$_id', '$$courseIds'] },
                  {
                    $lte: [Date.now().toString(), helper.dateToStringLocal('$openDay').toString()],
                  },
                ],
              },
            },
          },
          {
            $project: {
              openDay: 1,
            },
          },
        ],
        as: 'courses',
      },
    },
    {
      $lookup: {
        from: 'fixed-lessons',
        let: {
          courseId: '$courses._id',
        },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $in: ['$course', '$$courseId'] },
                  {
                    $lte: [{ $subtract: ['$startTime', new Date('1970-01-01')] }, Date.now()],
                  },
                ],
              },
            },
          },
          {
            $project: {
              startTime: 1,
            },
          },
        ],
        as: 'fixedLessons',
      },
    },
    {
      $lookup: {
        from: 'student-courses',
        let: { courseId: '$courses._id' },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [{ $in: ['$course', '$$courseId'] }],
              },
            },
          },
          {
            $project: {
              student: 1,
            },
          },
        ],
        as: 'studentCourses',
      },
    },
    {
      $lookup: {
        from: 'reviews',
        let: { flexibleLessonsId: '$flexibleLessons._id' },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [{ $eq: ['$tutor', ObjectId(_id)] }, { $in: ['$flexibleLesson', '$$flexibleLessonsId'] }],
              },
            },
          },
          {
            $project: {
              student: 1,
              star: 1,
              content: 1,
            },
          },
        ],
        as: 'reviewByFlexible',
      },
    },
    {
      $lookup: {
        from: 'reviews',
        let: { fixedlessonsId: '$fixedLessons._id' },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [{ $eq: ['$tutor', ObjectId(_id)] }, { $in: ['$fixedLesson', '$$fixedlessonsId'] }],
              },
            },
          },
          {
            $project: {
              student: 1,
              star: 1,
              content: 1,
            },
          },
        ],
        as: 'reviewByFixed',
      },
    },
    {
      $lookup: {
        from: 'student-courses',
        let: { coursesId: '$courses._id' },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [{ $in: ['$course', '$$coursesId'] }],
              },
            },
          },
          {
            $project: {
              student: 1,
              course: 1,
            },
          },
        ],
        as: 'courseStudent',
      },
    },
  ]);
};
//#endregion getDetailTutorWithFlexibleLesson

//#region getAvgRateTutorById
const getAvgRateTutorById = async (tutorId) => {
  const pipeline = [
    {
      $match: {
        _id: mongoose.Types.ObjectId(tutorId),
      },
    },
    utilities.lookup('reviews', '_id', 'tutor', 'reviews'),
    {
      $project: {
        avgStar: { $avg: '$reviews.star' },
      },
    },
  ];

  return await Tutor.aggregate(pipeline);
};
//#endregion getAvgRateTutorById

//#region getScheduleByTutor
const getScheduleByTutor = async (tutorId, startTime, endTime) => {
  let filterFlexibleLesson = {};
  let filterFixedLesson = {};
  if (startTime && endTime) {
    filterFlexibleLesson = {
      $and: [
        {
          'flexibleLessons._startTime': { $gte: startTime },
        },
        {
          'flexibleLessons._endTime': {
            $lte: endTime,
          },
        },
      ],
    };

    filterFixedLesson = {
      $and: [
        {
          'fixedLessons._startTime': { $gte: startTime },
        },
        {
          'fixedLessons._endTime': {
            $lte: endTime,
          },
        },
      ],
    };
  }

  if (startTime && !endTime) {
    filterFlexibleLesson = {
      'flexibleLessons._startTime': { $gte: startTime },
    };
    filterFixedLesson = {
      'fixedLessons._startTime': { $gte: startTime },
    };
  }

  const flexibleLessons = await Tutor.aggregate([
    {
      $match: {
        _id: ObjectId(tutorId),
      },
    },
    {
      $lookup: {
        from: 'flexible-lessons',
        let: { tutorId: '$_id' },
        pipeline: [
          {
            $addFields: {
              _startTime: {
                $dateToString: {
                  date: '$startTime',
                  format: constants.DATE_FORMAT_AGGREGATE,
                },
              },
            },
          },
          {
            $addFields: {
              _endTime: {
                $dateToString: {
                  date: '$endTime',
                  format: constants.DATE_FORMAT_AGGREGATE,
                },
              },
            },
          },
          {
            $match: {
              $expr: {
                $and: [{ $eq: ['$tutor', '$$tutorId'] }, { $ne: ['$status', enums.StatusFlexibleLesson.CANCEL] }],
              },
            },
          },
        ],
        as: 'flexibleLessons',
      },
    },
    utilities.unwind('$flexibleLessons', true),
    { $match: filterFlexibleLesson },
    {
      $project: {
        _id: '$flexibleLessons._id',
        title: '$flexibleLessons.name',
        information: '$flexibleLessons.information',
        start: '$flexibleLessons.startTime',
        end: '$flexibleLessons.endTime',
        type: {
          $cond: [{ $ne: [{ $type: '$flexibleLessons._id' }, 'missing'] }, enums.LessonType.FLEXIBLE, '$$REMOVE'],
        },
        linkMeet: '$flexibleLessons.linkMeet',
      },
    },
  ]);

  const fixedLessons = await Tutor.aggregate([
    {
      $match: {
        _id: mongoose.Types.ObjectId(tutorId),
      },
    },
    utilities.lookup('tutor-courses', '_id', 'tutor', 'tutorCourses'),
    utilities.lookup('courses', 'tutorCourses.course', '_id', 'courses'),
    utilities.unwind('$courses', true),
    {
      $lookup: {
        from: 'fixed-lessons',
        let: { courseId: '$courses._id' },
        pipeline: [
          {
            $addFields: {
              _startTime: {
                $dateToString: {
                  date: '$startTime',
                  format: constants.DATE_FORMAT_AGGREGATE,
                },
              },
            },
          },
          {
            $addFields: {
              _endTime: {
                $dateToString: {
                  date: '$endTime',
                  format: constants.DATE_FORMAT_AGGREGATE,
                },
              },
            },
          },
          {
            $match: {
              $expr: {
                $and: [{ $eq: ['$course', '$$courseId'] }],
              },
            },
          },
        ],
        as: 'fixedLessons',
      },
    },
    utilities.unwind('$fixedLessons', true),
    { $match: filterFixedLesson },
    {
      $project: {
        _id: '$fixedLessons._id',
        courseId: '$courses._id',
        title: '$courses.name',
        start: '$fixedLessons.startTime',
        end: '$fixedLessons.endTime',
        type: {
          $cond: [{ $ne: [{ $type: '$fixedLessons._id' }, 'missing'] }, enums.LessonType.FIXED, '$$REMOVE'],
        },
        linkMeet: '$courses.linkMeet',
      },
    },
  ]);

  const result = flexibleLessons.concat(fixedLessons).filter((ele) => !helperFunction.isObjectEmpty(ele));

  return result;
};

//#endregion getScheduleByTutor

const getFixedLessonByTutorId = async (tutorId) => {
  return await Tutor.aggregate([
    {
      $match: {
        _id: ObjectId(tutorId),
      },
    },
    {
      $lookup: {
        from: 'tutor-courses',
        localField: '_id',
        foreignField: 'tutor',
        as: 'tutorCourses',
      },
    },
    {
      $lookup: {
        from: 'courses',
        localField: 'tutorCourses.course',
        foreignField: '_id',
        as: 'course',
      },
    },

    {
      $project: {
        course: {
          name: 1,
          _id: 1,
        },
      },
    },
    {
      $lookup: {
        from: 'fixed-lessons',
        let: { courseId: '$course._id' },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  {
                    $eq: ['$course', '$$courseId'],
                  },
                ],
              },
            },
          },
        ],
        as: 'fixedLessons',
      },
    },
  ]);
};

//#region getScheduleAvailableTutorById
const getScheduleAvailableByTutor = async (tutorId) => {
  const schedule = await Tutor.aggregate([
    {
      $match: {
        _id: mongoose.Types.ObjectId(tutorId.toString()),
        isActive: true,
      },
    },
    {
      $lookup: {
        from: 'tutor-courses',
        localField: '_id',
        foreignField: 'tutor',
        as: 'tutorCourses',
      },
    },
    utilities.unwind('$tutorCourses', true),
    {
      $lookup: {
        from: 'courses',
        let: { courseId: '$tutorCourses.course' },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  {
                    $eq: ['$_id', '$$courseId'],
                  },
                  {
                    $or: [{ $eq: ['$isBlock', false] }, { $eq: [{ $type: '$isBlock' }, 'missing'] }],
                  },
                  {
                    $eq: ['$isActive', true],
                  },
                  {
                    $gte: [{ $subtract: [{ $toDate: '$openDay' }, '$$NOW'] }, 0],
                  },
                ],
              },
            },
          },
        ],
        as: 'course',
      },
    },
    {
      $unwind: {
        path: '$course',
        preserveNullAndEmptyArrays: true,
      },
    },

    {
      $lookup: {
        from: 'fixed-lessons',
        let: { courseId: '$course._id' },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  {
                    $eq: ['$course', '$$courseId'],
                  },
                ],
              },
            },
          },
        ],
        as: 'fixedLessons',
      },
    },
    {
      $unwind: {
        path: '$fixedLessons',
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $lookup: {
        from: 'student-courses',
        localField: 'course._id',
        foreignField: '_id',
        as: 'studentCourses',
      },
    },
    {
      $addFields: {
        'course.registerStudent': {
          $size: '$studentCourses',
        },
      },
    },
    {
      $group: {
        _id: '$_id',
        scheduleFixedCourses: {
          $push: {
            $cond: [
              {
                $and: [
                  { $lt: ['$course.registerStudent', 'course.maxStudents'] },
                  { $ne: [{ $type: '$course._id' }, 'missing'] },
                ],
              },
              {
                courseId: '$course._id',
                _id: '$fixedLessons._id',
                name: '$course.name',
                title: '$course.name',
                start: '$fixedLessons.startTime',
                end: '$fixedLessons.endTime',
                color: 'blue',
                type: enums.LessonType.FIXED,
              },
              '$$REMOVE',
            ],
          },
        },
      },
    },
    {
      $lookup: {
        from: 'flexible-lessons',
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ['$tutor', mongoose.Types.ObjectId(tutorId)] },
                  { $eq: [{ $type: '$student' }, 'missing'] },
                  { $gt: [{ $subtract: ['$startTime', '$$NOW'] }, 0] },
                  {
                    $eq: ['$status', enums.StatusFlexibleLesson.OPEN],
                  },
                ],
              },
            },
          },
          {
            $project: {
              _id: '$_id',
              title: '$name',
              name: '$name',
              start: '$startTime',
              end: '$endTime',
              color: 'green',
              type: enums.LessonType.FLEXIBLE,
            },
          },
        ],
        as: 'flexibleLessons',
      },
    },
  ]);

  const scheduleData = schedule[0] ? [...schedule[0].scheduleFixedCourses, ...schedule[0].flexibleLessons] : [];
  return scheduleData;
};
//#endregion getTutorById

//#region getStudentTaught
const getStudentTaught = async (tutorId, _textSearch, pagination) => {
  const { _limit, _page } = pagination;
  const skip = _limit * (_page - 1);
  const nowFormatDate = helper.dateToStringUTC(new Date(), constants.DATE_FORMAT);
  const nowFormatDateTime = helper.dateToStringUTC(new Date(), constants.DATE_TIME_FORMAT);
  const pipeLine = [
    {
      $match: {
        _id: mongoose.Types.ObjectId(tutorId),
      },
    },
    utilities.lookup('tutor-courses', '_id', 'tutor', 'tutorCourses'),
    {
      $lookup: {
        from: 'courses',
        let: { courseId: '$tutorCourses.course' },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  {
                    $in: ['$_id', '$$courseId'],
                  },
                  {
                    $lt: ['$openDay', nowFormatDate], // openDay < nowFormatDate}
                  },
                ],
              },
            },
          },
        ],
        as: 'courses',
      },
    },
    utilities.lookup('student-courses', 'courses._id', 'course', 'studentCourses'),
    {
      $addFields: {
        studentIdFixeds: '$studentCourses.student',
      },
    },
    {
      $lookup: {
        from: 'flexible-lessons',
        let: { tutorId: '$_id' },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  {
                    $eq: ['$tutor', '$$tutorId'],
                  },
                  {
                    $lt: ['$startTime', '$$NOW'], // startTime < nowFormatDateTime
                  },
                ],
              },
            },
          },
        ],
        as: 'flexibleLessons',
      },
    },
    {
      $addFields: {
        studentIdFlexibles: '$flexibleLessons.student',
      },
    },
    {
      $project: {
        _id: 0,
        studentIdTaught: {
          $concatArrays: ['$studentIdFixeds', '$studentIdFlexibles'],
        },
      },
    },
    // utilities.lookup('students', 'studentIdTaught', '_id', 'students'),
    {
      $lookup: {
        from: 'students',
        let: { studentId: '$studentIdTaught' },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  {
                    $in: ['$_id', '$$studentId'],
                  },
                ],
              },
            },
          },
        ],
        as: 'students',
      },
    },

    {
      $project: {
        students: {
          _id: 1,
          avatarUrl: 1,
          dob: 1,
          firstName: 1,
          lastName: 1,
          gender: 1,
          nationality: 1,
          createdAt: 1,
        },
      },
    },
    utilities.unwind('$students'),
    {
      $group: {
        _id: '$students._id',
        avatarUrl: { $first: '$students.avatarUrl' },
        dob: { $first: '$students.dob' },
        firstName: { $first: '$students.firstName' },
        lastName: { $first: '$students.lastName' },
        gender: { $first: '$students.gender' },
        nationality: { $first: '$students.nationality' },
        createdAt: { $first: '$students.createdAt' },
      },
    },
  ];

  const documents = await Tutor.aggregate(pipeLine);

  if (_textSearch) {
    pipeLine.push(
      {
        $addFields: {
          name: { $concat: ['$lastName', ' ', '$firstName'] },
        },
      },
      {
        $match: {
          name: {
            $regex: _textSearch,
            $options: 'i',
          },
        },
      }
    );
  }

  const documentsSearch = await Tutor.aggregate(pipeLine);

  if (documents.length === 0) {
    return { dataQuerys: [], total: 0, _total: 0 };
  }

  pipeLine.push(
    { $sort: { createdAt: 1 } },
    {
      $skip: skip,
    },
    {
      $limit: _limit,
    }
  );

  const result = await Tutor.aggregate(pipeLine);

  return {
    dataQuerys: result,
    total: documents.length,
    _total: documentsSearch.length,
  };
};
//#endregion getStudentTaught

//#region getFixedTaughtByTutor
const getFixedTaughtByTutor = async (tutorId, _textSearch, pagination) => {
  const skip = pagination._limit * (pagination._page - 1);

  const pipeLine = [
    {
      $match: {
        _id: ObjectId(tutorId),
      },
    },

    {
      $lookup: {
        from: 'tutor-courses',
        localField: '_id',
        foreignField: 'tutor',
        as: 'tutorCourses',
      },
    },
    {
      $unwind: {
        path: '$tutorCourses',
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $lookup: {
        from: 'courses',
        let: { courseId: '$tutorCourses.course' },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  {
                    $eq: ['$_id', '$$courseId'],
                  },
                  {
                    $lte: [{ $subtract: [{ $toDate: '$endDay' }, '$$NOW'] }, 0],
                  },
                ],
              },
            },
          },
        ],
        as: 'course',
      },
    },
    {
      $unwind: {
        path: '$course',
      },
    },
    {
      $lookup: {
        from: 'student-courses',
        let: { courseId: '$course._id' },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  {
                    $eq: ['$course', '$$courseId'],
                  },
                ],
              },
            },
          },
        ],
        as: 'studentCourses',
      },
    },
    { $addFields: { sizeStudent: { $size: '$studentCourses' } } },
    {
      $group: {
        _id: '$course._id',
        name: { $first: '$course.name' },
        avatarUrl: { $first: '$course.avatarUrl' },
        maxStudents: { $first: '$course.maxStudents' },
        openDay: { $first: '$course.openDay' },
        endDay: { $first: '$course.endDay' },
        numberLessons: { $first: '$course.numberLessons' },
        price: { $first: '$course.price' },
        totalStudents: { $sum: '$sizeStudent' },
      },
    },
    { $match: { $expr: { $gt: ['$totalStudents', 0] } } },
    {
      $project: {
        name: 1,
        avatarUrl: 1,
        price: 1,
        totalTime: 1,
        totalStudents: 1,
        openDay: 1,
        numberLessons: 1,
        maxStudents: 1,
        endDay: 1,
      },
    },
    {
      $lookup: {
        from: 'fixed-lessons',
        let: { courseId: '$_id' },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  {
                    $eq: ['$course', '$$courseId'],
                  },
                ],
              },
            },
          },
        ],
        as: 'fixedLessonsTotal',
      },
    },
    { $addFields: { totalTime: { $sum: '$fixedLessons.totalTime' } } },
    {
      $project: {
        name: 1,
        avatarUrl: 1,
        price: 1,
        totalTime: 1,
        totalLessons: 1,
        numberLessons: 1,
        avatarUrl: 1,
        totalStudents: 1,
        openDay: 1,
        endDay: 1,
      },
    },
  ];
  const documentsNotSearch = await Tutor.aggregate(pipeLine);

  if (_textSearch) {
    pipeLine.push({
      $match: {
        name: {
          $regex: _textSearch,
          $options: 'i',
        },
      },
    });
  }
  const documents = await Tutor.aggregate(pipeLine);

  pipeLine.push(
    { $sort: { openDay: 1 } },
    {
      $skip: skip,
    },
    {
      $limit: pagination._limit,
    }
  );
  const scheduleFixed = await Tutor.aggregate(pipeLine);

  return {
    scheduleFixed,
    count: documents.length,
    total: documentsNotSearch.length,
  };
};
//#endregion getScheduleFixedAvailableTutorById

//#region getScheduleFlexAvailableTutorById
const getFlexTaughtByTutor = async (tutorId, pagination, _textSearch) => {
  const { _page, _limit } = pagination;
  const skip = _limit * (_page - 1);

  const now = helper.dateToStringLocal(new Date(), constants.DATE_TIME_FORMAT);

  const pipeLine = [
    {
      $addFields: {
        endTimeFormat: {
          $dateToString: {
            format: constants.DATE_TIME_FORMAT_AGGREGATE,
            date: '$endTime',
          },
        },
      },
    },
    {
      $match: {
        tutor: ObjectId(tutorId),
        student: { $exists: true },
        status: enums.StatusFlexibleLesson.REGISTERED,
        endTimeFormat: { $lt: now },
      },
    },
  ];

  const totalDocuments = await FlexibleLesson.aggregate(pipeLine);
  if (totalDocuments.length === 0) {
    return { flexTaughts: [], count: 0, total: 0 };
  }
  const total = totalDocuments.length;

  pipeLine.push(
    utilities.lookup('tutors', 'tutor', '_id', 'tutor'),
    utilities.unwind('$tutor', true),
    utilities.lookup('reviews', '_id', 'flexibleLesson', 'reviews'),
    utilities.unwind('$reviews', true),
    utilities.lookup('students', 'student', '_id', 'student'),
    utilities.unwind('$student', true),
    {
      $addFields: {
        nameSearch: {
          $concat: ['$student.lastName', ' ', '$student.firstName'],
        },
      },
    }
  );

  if (_textSearch) {
    pipeLine.push({
      $match: {
        nameSearch: {
          $regex: _textSearch,
          $options: 'i',
        },
      },
    });
  }

  const documentsAfterSearch = await FlexibleLesson.aggregate(pipeLine);
  const totalAfterSearch = documentsAfterSearch.length;

  pipeLine.push(
    {
      $skip: skip,
    },
    {
      $limit: _limit,
    },
    {
      $project: {
        _id: 1,
        startTime: 1,
        endTime: 1,
        price: 1,
        status: 1,
        information: 1,
        tutor: {
          _id: 1,
          firstName: 1,
          lastName: 1,
          salaryPerHour: 1,
          avatarUrl: 1,
        },
        student: {
          _id: 1,
          firstName: 1,
          lastName: 1,
          avatarUrl: 1,
        },
        reviews: {
          _id: 1,
          content: 1,
          star: 1,
        },
        nameSearch: 1,
      },
    }
  );

  const flexibleLessonsTaught = await FlexibleLesson.aggregate(pipeLine);

  return { flexTaughts: flexibleLessonsTaught, count: totalAfterSearch, total };
};
//#endregion getFlexTaughtByTutor

//#region getAllTutorsByStudent
const getAllTutorsByStudent = async (
  _textSearch,
  { _limit, _page },
  { _languageArray, _price, _dayArray, _timeArray, _timezone, firstDay, lastDay }
) => {
  const timezone = helper.convertTimezone(_timezone);
  let filterByTime;

  const skip = _limit * (_page - 1);
  const pipeLineBase = [
    {
      $match: {
        isActive: true,
        isBlock: false,
      },
    },
  ];

  if (_textSearch) {
    pipeLineBase.push(
      {
        $addFields: {
          name: { $concat: ['$lastName', ' ', '$firstName'] },
        },
      },
      {
        $match: {
          name: {
            $regex: _textSearch,
            $options: 'i',
          },
        },
      }
    );
  }

  if (_languageArray) {
    pipeLineBase.push({
      $match: {
        languages: {
          $elemMatch: { $in: _languageArray },
        },
      },
    });
  }

  if (_price) {
    pipeLineBase.push({
      $match: constants.PRICE_FILTER[_price],
    });
  }

  if (_timeArray) {
    filterByTime = _timeArray.map((elem) => constants.TIME_FILTER_EXPR[elem]);
  }

  const pipeLineGetAvailableSchedules = [
    ...pipeLineBase,
    {
      $lookup: {
        from: 'tutor-available-schedules',
        let: { idTutor: '$_id' },
        pipeline: [
          {
            $addFields: {
              startDateFormat: {
                $dateToString: {
                  format: constants.DATE_FORMAT_AGGREGATE,
                  date: '$startTime',
                  timezone: timezone,
                },
              },
              endDateFormat: {
                $dateToString: {
                  format: constants.DATE_FORMAT_AGGREGATE,
                  date: '$endTime',
                  timezone: timezone,
                },
              },
            },
          },
          {
            $match: {
              $expr: {
                $and: [
                  {
                    $eq: ['$tutor', '$$idTutor'], //join table tutor with table flexible lesson
                  },
                  {
                    $and: [
                      {
                        $gte: ['$startDateFormat', firstDay],
                      },
                      {
                        $lte: ['$endDateFormat', lastDay],
                      },
                    ],
                  },
                  { $eq: ['$status', false] },
                ],
              },
            },
          },
        ],
        as: 'tutorAvailableSchedules',
      },
    },
    {
      $project: {
        _id: 1,
        tutorAvailableSchedules: {
          _id: 1,
          startTime: 1,
          endTime: 1,
          timeZone: 1,
        },
      },
    },
  ];

  const availalbeSchedules = await Tutor.aggregate(pipeLineGetAvailableSchedules);

  if (_dayArray || _timeArray) {
    pipeLineBase.push(
      {
        $lookup: {
          from: 'tutor-available-schedules',
          let: { idTutor: '$_id' },
          pipeline: [
            {
              $addFields: {
                dow: {
                  $dayOfWeek: {
                    date: '$startTime',
                    timezone: timezone,
                  },
                },
                startHour: {
                  $hour: {
                    date: '$startTime',
                    timezone: timezone,
                  },
                },
                endHour: {
                  $hour: {
                    date: '$endTime',
                    timezone: timezone,
                  },
                },
              },
            },
            {
              $match: {
                $expr: {
                  $and: [
                    {
                      $eq: ['$tutor', '$$idTutor'], //join table tutor with table flexible lesson
                    },
                    {
                      $gte: ['$startTime', new Date()],
                    },
                    _dayArray
                      ? {
                          $in: ['$dow', _dayArray],
                        }
                      : {},
                    _timeArray
                      ? {
                          $or: filterByTime,
                        }
                      : {},
                  ],
                },
              },
            },
          ],
          as: 'tutorAvailableSchedules',
        },
      },
      {
        $match: {
          // available schudule is not empty
          tutorAvailableSchedules: {
            $exists: true,
            $ne: [],
          },
        },
      },
      utilities.lookup('reviews', '_id', 'tutor', 'reviews'),
      {
        $sort: {
          name: 1,
        },
      }
    );
  }

  pipeLineBase.push(
    {
      $skip: skip,
    },
    {
      $limit: _limit,
    },
    {
      $project: {
        firstName: 1,
        lastName: 1,
        gender: 1,
        salaryPerHour: 1,
        avatarUrl: 1,
        languages: 1,
        videoUrl: 1,
        description: 1,
        avgStar: { $avg: '$reviews.star' },
        nationality: 1,
        createdAt: 1,
      },
    }
  );

  const tutors = await Tutor.aggregate(pipeLineBase);
  tutors.forEach((item) => {
    const schedule = availalbeSchedules.find((x) => x._id.toString() === item._id.toString());
    if (schedule) {
      item.tutorAvailableSchedules = schedule.tutorAvailableSchedules;
    }
  });
  return { tutors, count: tutors.length };
};
//#endregion getAllTutorsByStudent

const dashboardTutorTotalFlexByTime = async (tutorId, startDate, endDate) => {
  let pipeline = [];

  if (tutorId) {
    pipeline.push({
      $match: {
        _id: mongoose.Types.ObjectId(tutorId),
      },
    });
  }

  pipeline.push(
    {
      $lookup: {
        from: 'flexible-lessons',
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  {
                    $ne: ['$status', enums.StatusFlexibleLesson.CANCEL],
                  },
                  {
                    $ne: [{ $type: '$student' }, 'missing'],
                  },
                  { $eq: ['$tutor', tutorId] },
                  endDate
                    ? {
                        $lte: [{ $subtract: ['$endTime', { $toDate: endDate }] }, 0],
                      }
                    : { $lte: [{ $subtract: ['$endTime', '$$NOW'] }, 0] },
                  startDate
                    ? {
                        $gte: [{ $subtract: ['$startTime', { $toDate: startDate }] }, 0],
                      }
                    : { $eq: [true, true] },
                ],
              },
            },
          },
          {
            $addFields: {
              totalTime: {
                $divide: [{ $subtract: ['$endTime', '$startTime'] }, 60 * 1000 * 60],
              },
            },
          },
        ],
        as: 'flexLessons',
      },
    },

    { $addFields: { sizeFlex: { $size: '$flexLessons' } } },
    { $addFields: { totalTime: { $sum: '$flexLessons.totalTime' } } },
    { $addFields: { totalPrice: { $sum: '$flexLessons.price' } } },

    { $project: { sizeFlex: 1, totalTime: 1, totalPrice: 1 } }
  );

  const dashboardTutor = await Tutor.aggregate(pipeline);
  return dashboardTutor[0];
};

const dashboardTutorTotalFixedByTime = async (tutorId, startDate, endDate) => {
  const pipeline = [
    {
      $match: {
        _id: mongoose.Types.ObjectId(tutorId),
      },
    },
    utilities.lookup('tutor-courses', '_id', 'tutor', 'tutorCourses'),
    { $unwind: '$tutorCourses' },
    {
      $lookup: {
        from: 'courses',
        let: { tutorCourses: '$tutorCourses.course' },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ['$_id', '$$tutorCourses'] },
                  endDate
                    ? {
                        $lte: [
                          {
                            $subtract: [{ $toDate: '$openDay' }, { $toDate: endDate }],
                          },
                          0,
                        ],
                      }
                    : {
                        $lte: [{ $subtract: [{ $toDate: '$openDay' }, '$$NOW'] }, 0],
                      },

                  startDate
                    ? {
                        $gte: [
                          {
                            $subtract: [{ $toDate: '$openDay' }, { $toDate: startDate }],
                          },
                          0,
                        ],
                      }
                    : { $eq: ['$_id', '$$tutorCourses'] },
                ],
              },
            },
          },
        ],
        as: 'courses',
      },
    },
    { $unwind: '$courses' },
    {
      $lookup: {
        from: 'student-courses',
        let: { tutorCourses: '$tutorCourses.course' },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [{ $eq: ['$course', '$$tutorCourses'] }],
              },
            },
          },
        ],
        as: 'studentCourses',
      },
    },
    {
      $addFields: { 'courses.studentsRegister': { $size: '$studentCourses' } },
    },

    { $unwind: '$studentCourses' },
    { $group: { _id: '$_id', course: { $addToSet: '$courses' } } },
    { $unwind: '$course' },
    {
      $lookup: {
        from: 'fixed-lessons',
        let: { courseId: '$course._id' },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ['$course', '$$courseId'] },
                  startDate
                    ? {
                        $gte: [{ $subtract: ['$startTime', { $toDate: startDate }] }, 0],
                      }
                    : { $eq: ['$course', '$$courseId'] },
                  endDate
                    ? {
                        $lte: [{ $subtract: ['$endTime', { $toDate: endDate }] }, 0],
                      }
                    : { $lte: [{ $subtract: ['$endTime', '$$NOW'] }, 0] },
                ],
              },
            },
          },
          {
            $addFields: {
              totalTime: {
                $divide: [{ $subtract: ['$endTime', '$startTime'] }, 60 * 1000 * 60],
              },
            },
          },
        ],
        as: 'fixedLesson',
      },
    },
    {
      $addFields: {
        totalPrice: {
          $sum: { $multiply: ['$course.price', '$course.studentsRegister'] },
        },
      },
    },
    { $addFields: { totalTime: { $sum: '$fixedLesson.totalTime' } } },
    { $addFields: { sizeFixed: { $size: '$fixedLesson' } } },

    {
      $group: {
        _id: '$_id',
        totalPrice: { $sum: '$totalPrice' },
        totalTime: { $sum: '$totalTime' },
        totalFixed: { $sum: '$sizeFixed' },
        course: { $push: '$course' },
      },
    },
    {
      $addFields: { sizeCourse: { $size: '$course' } },
    },
    { $project: { sizeCourse: 1, totalTime: 1, totalPrice: 1, totalFixed: 1 } },
  ];

  const dashboardTutor = await Tutor.aggregate(pipeline);

  const result = dashboardTutor.length > 0 ? dashboardTutor[0] : [];
  return result;
};

const dashboardTutorTotalFlexByYear = async (tutorId, year) => {
  const startDate = `${year}-01-01 00:00:00`;
  const endDate = `${year}-12-31 23:59:59`;

  const pipeline = [
    {
      $match: {
        _id: mongoose.Types.ObjectId(tutorId),
      },
    },
    {
      $lookup: {
        from: 'flexible-lessons',
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  {
                    $eq: [
                      {
                        $in: ['$status', [enums.StatusFlexibleLesson.CANCEL, enums.StatusFlexibleLesson.OPEN]],
                      },
                      false,
                    ],
                  },
                  {
                    $ne: [{ $type: '$student' }, 'missing'],
                  },
                  { $eq: ['$tutor', tutorId] },
                  {
                    $lte: [{ $subtract: ['$endTime', { $toDate: endDate }] }, 0],
                  },
                  {
                    $gte: [{ $subtract: ['$startTime', { $toDate: startDate }] }, 0],
                  },
                ],
              },
            },
          },
          {
            $addFields: {
              totalTime: {
                $divide: [{ $subtract: ['$endTime', '$startTime'] }, 60 * 1000 * 60],
              },
            },
          },
          {
            $addFields: {
              date: { $dateToString: { format: '%Y-%m', date: '$endTime' } },
            },
          },
        ],
        as: 'flexLessons',
      },
    },
    { $unwind: '$flexLessons' },
    { $addFields: { totalTime: { $sum: '$flexLessons.totalTime' } } },
    { $addFields: { totalPrice: { $sum: '$flexLessons.price' } } },
    { $addFields: { date: '$flexLessons.date' } },
    { $project: { sizeFlex: 1, totalTime: 1, totalPrice: 1, date: 1 } },
  ];

  const dashboardTutor = await Tutor.aggregate(pipeline);

  let result = [];
  const month = [01, 02, 03, 04, 05, 06, 07, 08, 09, 10, 11, 12];
  month.forEach((m) => {
    result[+m - 1] = {
      totalTime: 0,
      totalPrice: 0,
      month: 0,
      sizeFlex: 0,
    };
    dashboardTutor.forEach((dashboard) => {
      if (m < 10) {
        if (dashboard.date == `${year}-0${m}`) {
          result[+m - 1].totalTime += dashboard.totalTime;
          result[+m - 1].totalPrice += dashboard.totalPrice;
          result[+m - 1].month = `${m}`;
          result[+m - 1].sizeFlex++;
        }
      } else {
        if (dashboard.date == `${year}-${m}`) {
          result[+m - 1].totalTime += dashboard.totalTime;
          result[+m - 1].totalPrice += dashboard.totalPrice;
          result[+m - 1].month = `${m}`;
          result[+m - 1].sizeFlex++;
        }
      }
    });
  });

  return result;
};

const dashboardTutorTotalFixedByYear = async (tutorId, year) => {
  const startDate = `${year}-01-01 00:00:00`;
  const endDate = `${year}-12-31 23:59:59`;

  const pipeline = [
    {
      $match: {
        _id: mongoose.Types.ObjectId(tutorId),
      },
    },
    utilities.lookup('tutor-courses', '_id', 'tutor', 'tutorCourses'),
    { $unwind: '$tutorCourses' },
    {
      $lookup: {
        from: 'courses',
        let: { tutorCourses: '$tutorCourses.course' },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ['$_id', '$$tutorCourses'] },
                  {
                    $lte: [
                      {
                        $subtract: [{ $toDate: '$openDay' }, { $toDate: endDate }],
                      },
                      0,
                    ],
                  },
                  {
                    $gte: [
                      {
                        $subtract: [{ $toDate: '$openDay' }, { $toDate: startDate }],
                      },
                      0,
                    ],
                  },
                ],
              },
            },
          },
        ],
        as: 'courses',
      },
    },
    { $unwind: '$courses' },
    {
      $lookup: {
        from: 'student-courses',
        let: { tutorCourses: '$tutorCourses.course' },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [{ $eq: ['$course', '$$tutorCourses'] }],
              },
            },
          },
        ],
        as: 'studentCourses',
      },
    },
    {
      $addFields: { 'courses.studentsRegisted': { $size: '$studentCourses' } },
    },
    { $unwind: '$studentCourses' },
    { $group: { _id: '$_id', course: { $addToSet: '$courses' } } },
    { $unwind: '$course' },
    {
      $lookup: {
        from: 'fixed-lessons',
        let: { courseId: '$course._id' },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ['$course', '$$courseId'] },
                  {
                    $gte: [{ $subtract: ['$startTime', { $toDate: startDate }] }, 0],
                  },
                  {
                    $lte: [{ $subtract: ['$endTime', { $toDate: endDate }] }, 0],
                  },
                ],
              },
            },
          },
          {
            $addFields: {
              totalTime: {
                $divide: [{ $subtract: ['$endTime', '$startTime'] }, 60 * 1000 * 60],
              },
            },
          },
        ],
        as: 'fixedLesson',
      },
    },
    {
      $addFields: {
        totalPrice: {
          $sum: [{ $multiply: ['$course.price', '$course.studentsRegisted'] }],
        },
      },
    },
    { $addFields: { totalTime: { $sum: '$fixedLesson.totalTime' } } },
    {
      $addFields: {
        date: {
          $dateToString: {
            format: '%Y-%m',
            date: { $toDate: '$course.openDay' },
          },
        },
      },
    },
  ];

  const dashboardTutor = await Tutor.aggregate(pipeline);
  const month = [01, 02, 03, 04, 05, 06, 07, 08, 09, 10, 11, 12];
  let result = [];
  month.forEach((m) => {
    let count = 0;
    result[+m - 1] = {
      totalTime: 0,
      totalPrice: 0,
      month: 0,
      sizeCourse: 0,
    };
    dashboardTutor.forEach((dashboard) => {
      if (m < 10) {
        if (dashboard.date == `${year}-0${m}`) {
          result[+m - 1].totalTime += dashboard.totalTime;
          result[+m - 1].totalPrice += dashboard.totalPrice;
          result[+m - 1].month = `${m}`;
          result[+m - 1].sizeCourse++;
        }
      } else {
        if (dashboard.date == `${year}-${m}`) {
          result[+m - 1].totalTime += dashboard.totalTime;
          result[+m - 1].totalPrice += dashboard.totalPrice;
          result[+m - 1].month = `${m}`;
          result[+m - 1].sizeCourse++;
        }
      }
    });
  });
  return result;
};

const getAnalyticFlexibleLessonByAdmin = async (startDate, endDate) => {
  let pipeline = [];
  let year;
  if (startDate) {
    year = startDate.split('-')[0];
  }

  pipeline.push({ $match: {} });

  const totalTutor = await Tutor.aggregate(pipeline);

  pipeline.push(
    { $match: {} },
    {
      $lookup: {
        from: 'flexible-lessons',
        let: { tutorId: '$_id' },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ['$tutor', '$$tutorId'] },
                  {
                    $ne: [{ $type: '$student' }, 'missing'],
                  },
                  { $ne: ['$status', enums.StatusFlexibleLesson.CANCEL] },
                  endDate
                    ? {
                        $lte: [{ $subtract: ['$endTime', { $toDate: endDate }] }, 0],
                      }
                    : { $lte: [{ $subtract: ['$endTime', '$$NOW'] }, 0] },
                  startDate
                    ? {
                        $gte: [{ $subtract: ['$startTime', { $toDate: startDate }] }, 0],
                      }
                    : { $eq: [true, true] },
                ],
              },
            },
          },
          {
            $addFields: {
              totalTime: {
                $divide: [{ $subtract: ['$endTime', '$startTime'] }, 60 * 1000 * 60],
              },
            },
          },
          {
            $addFields: {
              date: { $dateToString: { format: '%Y-%m', date: '$endTime' } },
            },
          },
        ],
        as: 'flexLessons',
      },
    },
    { $unwind: '$flexLessons' }
  );

  const totalFlex = await Tutor.aggregate(pipeline);
  let result;
  if (!startDate && !endDate) {
    result = { totalTime: 0, totalPrice: 0 };
    totalFlex.forEach((flex) => {
      result.totalTime = result.totalPrice + flex.flexLessons.totalTime;
      result.totalPrice = result.totalPrice + flex.flexLessons.price;
    });
  } else {
    result = [];
    const month = [01, 02, 03, 04, 05, 06, 07, 08, 09, 10, 11, 12];
    month.forEach((m) => {
      let count = 0;
      result[+m - 1] = {
        totalPrice: 0,
        month: 0,
      };
      totalFlex.forEach((flex) => {
        if (m < 10) {
          if (flex.flexLessons.date == `${year}-0${m}`) {
            result[+m - 1].totalPrice += flex.flexLessons.price;
            result[+m - 1].month = `${m}`;
          }
        } else {
          if (flex.flexLessons.date == `${year}-${m}`) {
            result[+m - 1].totalPrice += flex.flexLessons.price;
            result[+m - 1].month = `${m}`;
          }
        }
      });
    });
  }

  return result;
};

const getAnalyticFixedLessonByAdmin = async (startDate, endDate) => {
  let year;
  if (startDate) {
    year = startDate.split('-')[0];
  }

  const pipeline = [
    {
      $match: {},
    },
    utilities.lookup('tutor-courses', '_id', 'tutor', 'tutorCourses'),
    { $unwind: '$tutorCourses' },
    {
      $lookup: {
        from: 'courses',
        let: { courseId: '$tutorCourses.course' },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ['$_id', '$$courseId'] },
                  endDate
                    ? {
                        $lte: [
                          {
                            $subtract: [{ $toDate: '$openDay' }, { $toDate: endDate }],
                          },
                          0,
                        ],
                      }
                    : {
                        $lte: [{ $subtract: [{ $toDate: '$openDay' }, '$$NOW'] }, 0],
                      },

                  startDate
                    ? {
                        $gte: [
                          {
                            $subtract: [{ $toDate: '$openDay' }, { $toDate: startDate }],
                          },
                          0,
                        ],
                      }
                    : { $eq: ['$_id', '$$courseId'] },
                ],
              },
            },
          },
        ],
        as: 'courses',
      },
    },
    { $unwind: '$courses' },
  ];

  pipeline.push(
    {
      $lookup: {
        from: 'student-courses',
        let: { tutorCourses: '$tutorCourses.course' },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [{ $eq: ['$course', '$$tutorCourses'] }],
              },
            },
          },
        ],
        as: 'studentCourses',
      },
    },
    {
      $addFields: { 'courses.studentsRegister': { $size: '$studentCourses' } },
    },
    { $unwind: '$studentCourses' },
    { $group: { _id: '$_id', course: { $addToSet: '$courses' } } },
    { $unwind: '$course' },
    {
      $lookup: {
        from: 'fixed-lessons',
        let: { courseId: '$course._id' },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ['$course', '$$courseId'] },
                  startDate
                    ? {
                        $gte: [{ $subtract: ['$startTime', { $toDate: startDate }] }, 0],
                      }
                    : { $eq: ['$course', '$$courseId'] },
                  endDate
                    ? {
                        $lte: [{ $subtract: ['$endTime', { $toDate: endDate }] }, 0],
                      }
                    : { $lte: [{ $subtract: ['$endTime', '$$NOW'] }, 0] },
                ],
              },
            },
          },
          {
            $addFields: {
              totalTime: {
                $divide: [{ $subtract: ['$endTime', '$startTime'] }, 60 * 1000 * 60],
              },
            },
          },
          {
            $addFields: {
              date: {
                $dateToString: {
                  format: '%Y-%m',
                  date: { $toDate: '$openDay' },
                },
              },
            },
          },
        ],
        as: 'fixedLesson',
      },
    },
    {
      $addFields: {
        'course.price': {
          $multiply: ['$course.price', '$course.studentsRegister'],
        },
      },
    },
    {
      $addFields: {
        date: {
          $dateToString: {
            format: '%Y-%m',
            date: { $toDate: '$course.openDay' },
          },
        },
      },
    },
    { $addFields: { totalPrice: { $sum: '$course.price' } } },
    { $addFields: { totalTime: { $sum: '$fixedLesson.totalTime' } } }
  );

  const dashboardCourse = await Tutor.aggregate(pipeline);

  let result;
  if (!startDate && !endDate) {
    result = { totalTime: 0, totalPrice: 0 };
    dashboardCourse.forEach((course) => {
      (result.totalTime += course.totalTime), (result.totalPrice += course.totalPrice);
    });
  } else {
    const month = [01, 02, 03, 04, 05, 06, 07, 08, 09, 10, 11, 12];
    result = [];
    month.forEach((m) => {
      result[+m - 1] = {
        // totalTime: 0,
        totalPrice: 0,
        month: 0,
      };
      dashboardCourse.forEach((dashboard) => {
        if (m < 10) {
          if (dashboard.date == `${year}-0${m}`) {
            // result[+m - 1].totalTime += dashboard.totalTime;
            result[+m - 1].totalPrice += dashboard.totalPrice;
            result[+m - 1].month = `${m}`;
          }
        } else {
          if (dashboard.date == `${year}-${m}`) {
            // result[+m - 1].totalTime += dashboard.totalTime;
            result[+m - 1].totalPrice += dashboard.totalPrice;
            result[+m - 1].month = `${m}`;
          }
        }
      });
    });
  }

  return result;
};

//#region getProfileByUserId
const getProfileByUserId = async (userId) => {
  return await Tutor.aggregate([
    { $match: { user: mongoose.Types.ObjectId(userId) } },
    utilities.lookup('users', 'user', '_id', 'users'),
    utilities.unwind('$users', true),
    {
      $project: {
        firstName: 1,
        lastName: 1,
        dob: 1,
        phoneNumber: 1,
        salaryPerHour: 1,
        email: 1,
        languages: 1,
        gender: 1,
        description: 1,
        certificates: 1,
        avatarUrl: 1,
        notification: 1,
        nationality: 1,
        role: '$users.role',
      },
    },
  ]);
};
//#endregion getProfileByUserId

//#region getFlexibleByTutorId
const getFlexibleByTutorId = async (tutorId, startTime, endTime) => {
  const dataSchedule = await Tutor.aggregate([
    {
      $match: {
        _id: ObjectId(tutorId),
      },
    },
    {
      $lookup: {
        from: 'flexible-lessons',
        let: { tutorId: '$_id' },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  {
                    $ne: [{ $type: '$student' }, 'missing'],
                  },
                  startTime
                    ? {
                        $gte: [
                          {
                            $dateToString: {
                              format: constants.DATE_FORMAT_AGGREGATE,
                              date: '$startTime',
                            },
                          },
                          startTime,
                        ],
                      }
                    : { $eq: [true, true] },
                  endTime
                    ? {
                        $lte: [
                          {
                            $dateToString: {
                              format: constants.DATE_FORMAT_AGGREGATE,
                              date: '$endTime',
                            },
                          },
                          endTime,
                        ],
                      }
                    : { $eq: [true, true] },
                ],
              },
            },
          },
        ],
        as: 'flexibleLessons',
      },
    },
    { $unwind: '$flexibleLessons' },
    utilities.lookup('categories', '_id', 'flexibleLessons.category', 'flexibleLessons.category'),
    utilities.unwind('$flexibleLessons.category', true),
    { $addFields: { _id: '$flexibleLessons._id' } },
    { $addFields: { title: '$flexibleLessons.name' } },
    { $addFields: { end: '$flexibleLessons.endTime' } },
    { $addFields: { start: '$flexibleLessons.startTime' } },

    { $addFields: { type: enums.LessonType.FLEXIBLE } },

    { $project: { title: 1, end: 1, start: 1, type: 1 } },
  ]);
  const result = dataSchedule.length > 0 ? dataSchedule.filter((v) => !!v.title) : [];

  return result;
};
//#endregion getFlexibleByTutorId

const getStudentTaughtAndTotalTimeByTutorId = async (tutorId) => {
  let pipeline = [];
  pipeline.push(
    { $match: { _id: mongoose.Types.ObjectId(tutorId.toString()) } },
    {
      $lookup: {
        from: 'tutor-courses',
        localField: '_id',
        foreignField: 'tutor',
        as: 'tutorCourses',
      },
    },
    {
      $lookup: {
        from: 'courses',
        let: { courseIds: '$tutorCourses.course' },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $in: ['$_id', '$$courseIds'] },
                  {
                    $lte: [{ $subtract: [{ $toDate: '$openDay' }, '$$NOW'] }, 0],
                  },
                ],
              },
            },
          },
        ],
        as: 'courses',
      },
    },
    utilities.unwind('$courses', true),
    {
      $lookup: {
        from: 'student-courses',
        localField: 'courses._id',
        foreignField: 'course',
        as: 'studentCourses',
      },
    },

    {
      $lookup: {
        from: 'fixed-lessons',
        let: { courseId: '$courses._id' },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [{ $eq: ['$course', '$$courseId'] }, { $lte: [{ $subtract: ['$endTime', '$$NOW'] }, 0] }],
              },
            },
          },
          {
            $addFields: {
              totalTime: {
                $divide: [{ $subtract: ['$endTime', '$startTime'] }, 60 * 1000 * 60],
              },
            },
          },
        ],
        as: 'fixedLessons',
      },
    },
    {
      $addFields: {
        totalTimeCourses: {
          $cond: [{ $gt: [{ $size: '$studentCourses' }, 0] }, { $sum: '$fixedLessons.totalTime' }, 0],
        },
      },
    },
    {
      $addFields: {
        totalFixedCourses: {
          $cond: [{ $gt: [{ $size: '$studentCourses' }, 0] }, { $size: '$fixedLessons' }, 0],
        },
      },
    },
    {
      $addFields: {
        studentCourses: {
          $cond: [{ $gt: [{ $size: '$fixedLessons' }, 0] }, '$studentCourses._id', []],
        },
      },
    },
    {
      $group: {
        _id: '$_id',

        totalStudentsCourse: {
          $addToSet: '$studentCourses',
        },
        totalTimeCourses1: { $push: '$totalTimeCourses' },
        totalTimeCourses: { $sum: '$totalTimeCourses' },
        totalFixedCourses: { $sum: '$totalFixedCourses' },
      },
    },
    {
      $lookup: {
        from: 'flexible-lessons',
        let: { tutorId: '$_id' },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ['$tutor', '$$tutorId'] },
                  { $lte: [{ $subtract: ['$endTime', '$$NOW'] }, 0] },
                  { $ne: [{ $type: '$student' }, 'missing'] },
                  { $ne: ['$status', enums.StatusFlexibleLesson.CANCEL] },
                ],
              },
            },
          },
          {
            $addFields: {
              totalTime: {
                $divide: [{ $subtract: ['$endTime', '$startTime'] }, 60 * 1000 * 60],
              },
            },
          },
        ],
        as: 'flexibleLessons',
      },
    },
    { $addFields: { studentFlex: '$flexibleLessons.student' } },
    {
      $project: {
        studentCourse: {
          $concatArrays: [
            {
              $reduce: {
                input: '$totalStudentsCourse',
                initialValue: [],
                in: { $concatArrays: ['$$value', '$$this'] },
              },
            },
            '$studentFlex',
          ],
        },
        totalTimes: {
          $sum: [{ $sum: '$flexibleLessons.totalTime' }, '$totalTimeCourses'],
        },
        totalLessons: {
          $sum: [{ $size: '$flexibleLessons' }, '$totalFixedCourses'],
        },
      },
    },
    utilities.unwind('$studentCourse', true),
    {
      $group: {
        _id: '$_id',

        totalLessons: { $first: '$totalLessons' },
        totalTimes: { $first: '$totalTimes' },
        studentsTaught: { $addToSet: '$studentCourse' },
      },
    },
    { $addFields: { studentsTaught: { $size: '$studentsTaught' } } }
  );

  const tutors = await Tutor.aggregate(pipeline);

  const result = tutors.length > 0 ? tutors[0] : {};
  return result;
};

const checkTutorAvailbleFixed = async ({ tutor, startTime, endTime }) => {
  const response = await Tutor.aggregate([
    { $match: { _id: mongoose.Types.ObjectId(tutor) } },
    utilities.lookup('tutor-courses', '_id', 'tutor', 'tutorCourses'),
    utilities.unwind('$tutorCourses'),
    utilities.lookup('fixed-lessons', 'tutorCourses.course', 'course', 'fixedLessons'),
    utilities.unwind('$fixedLessons'),
    {
      $match: {
        $expr: {
          $or: [
            {
              $and: [
                { $gt: [{ $subtract: ['$fixedLessons.endTime', endTime] }, 0] },
                {
                  $lt: [{ $subtract: ['$fixedLessons.startTime', startTime] }, 0],
                },
              ],
            },
            {
              $and: [
                {
                  $lt: [{ $subtract: ['$fixedLessons.startTime', endTime] }, 0],
                },
                {
                  $gt: [{ $subtract: ['$fixedLessons.startTime', startTime] }, 0],
                },
              ],
            },
            {
              $and: [
                {
                  $lt: [{ $subtract: ['$fixedLessons.endTime ', endTime] }, 0],
                },
                {
                  $gt: [{ $subtract: ['$fixedLessons.endTime ', startTime] }, 0],
                },
              ],
            },
          ],
        },
      },
    },
  ]);

  return response.length > 0;
};

const checkTutorAvailbleFlex = async ({ tutor, startTime, endTime }) => {
  const response = await Tutor.aggregate([
    { $match: { _id: mongoose.Types.ObjectId(tutor) } },
    utilities.lookup('flexible-lessons', '_id', 'tutor', 'flexibleLessons'),
    utilities.unwind('$flexibleLessons'),
    {
      $match: {
        $expr: {
          $or: [
            {
              $and: [
                {
                  $gt: [{ $subtract: ['$flexibleLessons.endTime', endTime] }, 0],
                },
                {
                  $lt: [{ $subtract: ['$flexibleLessons.startTime', startTime] }, 0],
                },
              ],
            },
            {
              $and: [
                {
                  $lt: [{ $subtract: ['$flexibleLessons.startTime', endTime] }, 0],
                },
                {
                  $gt: [{ $subtract: ['$flexibleLessons.startTime', startTime] }, 0],
                },
              ],
            },
            {
              $and: [
                {
                  $lt: [{ $subtract: ['$flexibleLessons.endTime ', endTime] }, 0],
                },
                {
                  $gt: [{ $subtract: ['$flexibleLessons.endTime ', startTime] }, 0],
                },
              ],
            },
          ],
        },
      },
    },
  ]);

  return response.length > 0;
};

const createCertificateByTutorId = async (tutorId, newCertificate) => {
  return await Tutor.updateOne(
    {
      _id: tutorId,
    },
    {
      $push: { certificates: newCertificate },
    }
  );
};

const updateCertificate = async (idCertificate, newModel) => {
  return await Tutor.updateOne(
    { 'certificates._id': idCertificate },
    {
      $set: { 'certificates.$': newModel },
    }
  );
};

//#region deleteCertificate
const deleteCertificate = async (idTutor, idCertificate) => {
  return await Tutor.updateOne(
    { _id: idTutor },
    {
      $pull: {
        certificates: { _id: idCertificate },
      },
    }
  );
};
//#endregion deleteCertificate

//#region getCertificateOfTutor
const getCertificateOfTutor = async (idTutor) => {
  const result = await Tutor.findOne(
    {
      _id: ObjectId(idTutor),
    },
    {
      _id: 0,
      certificates: 1,
    }
  );
  return result;
};
//#endregion getCertificateOfTutor

module.exports = {
  getTutor,
  createTutor,
  getAllTutors,
  updateTutor,
  deleteTutor,
  getDetailTutor,
  blockTutor,
  countTutors,
  getAllTutorsNoPagination,
  getDetailTutorWithFlexibleLesson,
  getTutorById,
  getAvgRateTutorById,
  getScheduleByTutor,
  getFixedLessonByTutorId,
  getScheduleAvailableByTutor,
  getStudentTaught,
  getFixedTaughtByTutor,
  getFlexTaughtByTutor,
  getAllTutorsByStudent,
  updateTutorByUserId,
  dashboardTutorTotalFixedByTime,
  dashboardTutorTotalFlexByTime,
  dashboardTutorTotalFlexByYear,
  dashboardTutorTotalFixedByYear,
  getAnalyticFlexibleLessonByAdmin,
  getAnalyticFixedLessonByAdmin,
  getProfileByUserId,
  getFlexibleByTutorId,
  getStudentTaughtAndTotalTimeByTutorId,
  checkTutorAvailbleFixed,
  checkTutorAvailbleFlex,
  createCertificateByTutorId,
  updateCertificate,
  getAllTutorByFilter,
  deleteCertificate,
  getCertificateOfTutor,
};
