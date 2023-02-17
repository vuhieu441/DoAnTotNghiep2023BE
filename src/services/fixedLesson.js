const FixedLesson = require('../models/fixedLesson');
const StudentCourse = require('../models/studentCourse');
const mongoose = require('mongoose');
const utilities = require('../utils/utility');
const constants = require('../constants/constants');

// Constants
const { LessonType } = require('../constants/enum');
const fixedLesson = require('../models/fixedLesson');

const createFixedLessons = async (lessons) => {
  return await FixedLesson.insertMany(lessons);
};

const deleteManyByCourse = async (courseId) => {
  return await FixedLesson.deleteMany({ course: courseId });
};

//#region getScheduleFixedLessonStudent
const getScheduleFixedLessonStudent = async (idStudent, filter) => {
  const { startDateLimit, endDateLimit } = filter;

  const pipeLine = [
    {
      $match: {
        student: mongoose.Types.ObjectId(idStudent),
      },
    },
    {
      $lookup: {
        from: 'courses',
        localField: 'course',
        foreignField: '_id',
        as: 'courses',
      },
    },
    {
      $unwind: '$courses',
    },
    utilities.lookup('tutor-courses', 'courses._id', 'course', 'tutorCourses'),
    utilities.unwind('$tutorCourses', true),
    utilities.lookup('tutors', 'tutorCourses.tutor', '_id', 'tutor'),
    utilities.unwind('$tutor', true),
    {
      $lookup: {
        from: 'fixed-lessons',
        localField: 'courses._id',
        foreignField: 'course',
        as: 'fixed_lessons',
      },
    },
    {
      $unwind: '$fixed_lessons',
    },
    {
      $addFields: {
        totalTime: { $divide: [{ $subtract: ['$fixed_lessons.endTime', '$fixed_lessons.startTime'] }, 60 * 1000 * 60] },
      },
    },
    {
      $addFields: {
        startDate: {
          $dateToString: { format: constants.DATE_FORMAT_AGGREGATE, date: '$fixed_lessons.startTime' },
        },
      },
    },
    {
      $addFields: {
        endDate: {
          $dateToString: { format: constants.DATE_FORMAT_AGGREGATE, date: '$fixed_lessons.endTime' },
        },
      },
    },
    {
      $match: {
        startDate: { $gte: startDateLimit },
        endDate: { $lte: endDateLimit },
      },
    },
    {
      $group: {
        _id: '$fixed_lessons._id',
        startTime: { $first: '$fixed_lessons.startTime' },
        endTime: { $first: '$fixed_lessons.endTime' },
        name: { $first: '$courses.name' },
        totalTime: { $first: '$totalTime' },
        tutor: { $first: '$tutor' },
      },
    },
    {
      $project: {
        _id: 1,
        tutor: { firstName: 1, _id: 1, lastName: 1, avatarUrl: 1 },
        start: '$startTime',
        end: '$endTime',
        title: '$name',
        totalTime: 1,
        type: LessonType.FIXED,
      },
    },
    { $match: { $expr: { $ne: [{ $type: '_id' }, 'missing'] } } },
  ];

  const result = await StudentCourse.aggregate(pipeLine);
  return result;
};
//#endregion getScheduleFixedLessonStudent

//#region getFixedLessons
const getFixedLessons = async (filter) => {
  return FixedLesson.find(filter);
};
//#endregion getFixedLessons

const getFixedLesson = async (filter) => {
  return FixedLesson.findOne(filter);
};

const getDetailFixedLesson = async (lessonId, studentId) => {
  const fixed = await FixedLesson.aggregate([
    { $match: { _id: mongoose.Types.ObjectId(lessonId) } },
    {
      $project: { startTime: 1, endTime: 1, course: 1 },
    },
    {
      $lookup: {
        from: 'courses',
        let: {
          courseId: '$course',
        },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  {
                    $eq: ['$_id', '$$courseId'],
                  },
                ],
              },
            },
          },
          {
            $project: {
              price: 1,
              description: 1,
              name: 1,
              avatarUrl: 1,
              openDay: 1,
              endDay: 1,
              maxStudents: 1,
              documents: 1,
              linkMeet: 1,
            },
          },
        ],
        as: 'course',
      },
    },
    { $unwind: '$course' },
    {
      $lookup: {
        from: 'tutor-courses',
        let: {
          courseId: '$course._id',
        },
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
        as: 'tutorCourse',
      },
    },
    {
      $unwind: {
        path: '$tutorCourse',
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $lookup: {
        from: 'tutors',
        let: {
          tutorId: '$tutorCourse.tutor',
        },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  {
                    $eq: ['$_id', '$$tutorId'],
                  },
                ],
              },
            },
          },
          { $project: { firstName: 1, lastName: 1, _id: 1, avatarUrl: 1 } },
        ],
        as: 'tutor',
      },
    },
    {
      $unwind: {
        path: '$tutor',
        preserveNullAndEmptyArrays: true,
      },
    },
    studentId
      ? {
          $lookup: {
            from: 'reviews',
            let: {
              tutorId: '$tutor._id',
              fixedId: '$_id',
            },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      // {
                      //   $eq: ['$tutor', '$$tutorId'],
                      // },
                      {
                        $eq: ['$fixedLesson', '$$fixedId'],
                      },
                      {
                        $eq: ['$student', mongoose.Types.ObjectId(studentId)],
                      },
                    ],
                  },
                },
              },
              { $project: { star: 1, content: 1 } },
            ],
            as: 'review',
          },
        }
      : { $match: { $expr: { $eq: [true, true] } } },

    utilities.lookup('student-courses', 'course._id', 'course', 'student-courses'),
    {
      $addFields: {
        registerStudent: { $size: '$student-courses' },
      },
    },
    utilities.unwind('$student-courses', true),
    {
      $lookup: {
        from: 'students',
        let: {
          studentId: '$student-courses.student',
        },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  {
                    $eq: ['$_id', '$$studentId'],
                  },
                ],
              },
            },
          },
          { $project: { firstName: 1, lastName: 1, _id: 1, avatarUrl: 1 } },
        ],
        as: 'student',
      },
    },
    utilities.unwind('$student', true),
    {
      $addFields: {
        courseId: '$course._id',
        name: '$course.name',
        description: '$course.description',
        price: '$course.price',
        avatarUrl: '$course.avatarUrl',
        maxStudents: '$course.maxStudents',
        documents: '$course.documents',
        linkMeet: '$course.linkMeet',
        openDay: '$course.openDay',
        endDay: '$course.endDay',
        student: '$student',
      },
    },
    {
      $project: {
        tutorCourses: 1,
        courseId: 1,
        name: 1,
        description: 1,
        price: 1,
        avatarUrl: 1,
        maxStudents: 1,
        registerStudent: 1,
        openDay: 1,
        endDay: 1,
        startTime: 1,
        endTime: 1,
        linkMeet: 1,
        tutor: 1,
        review: 1,
        student: 1,
      },
    },
  ]);
  const result = fixed.length > 0 && fixed[0]._id ? fixed[0] : {};
  if (result.review) {
    if (result.review.length > 0) result.review = result.review[0];
    else {
      result.review = {};
    }
  }
  return result;
};

const getFixedLessonForLeaveNotion = async (_id, studentId) => {
  const fixed = await FixedLesson.aggregate([
    {
      $match: {
        $expr: {
          $and: [{ $eq: ['$_id', mongoose.Types.ObjectId(_id)] }, { $gt: [{ $subtract: ['$startTime', '$$NOW'] }, 0] }],
        },
      },
    },
    {
      $lookup: {
        from: 'tutor-courses',
        let: {
          courseId: '$course',
        },
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
        as: 'tutorCourse',
      },
    },
    utilities.unwind('$tutorCourse'),
    {
      $lookup: {
        from: 'student-courses',
        let: {
          courseId: '$course',
        },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  {
                    $eq: ['$course', '$$courseId'],
                  },
                  {
                    $eq: ['$student', mongoose.Types.ObjectId(studentId)],
                  },
                ],
              },
            },
          },
        ],
        as: 'studentCourses',
      },
    },
    utilities.lookup('courses', 'course', '_id', 'course'),
    utilities.unwind('$course'),
  ]);

  const result = fixed.length > 0 && fixed[0].studentCourses.length > 0 ? fixed[0] : null;
  return result;
};

//#region getFixedLessonsByCourse
const getFixedLessonsByCourse = async (courseId) => {
  const fixedLessons = await FixedLesson.aggregate([
    {
      $match: {
        course: mongoose.Types.ObjectId(courseId),
      },
    },
  ]);

  return fixedLessons;
};
//#endregion getFixedLessonsByCourse

module.exports = {
  createFixedLessons,
  deleteManyByCourse,
  getScheduleFixedLessonStudent,
  getFixedLessons,
  getDetailFixedLesson,
  getFixedLesson,
  getFixedLessonForLeaveNotion,
  getFixedLessonsByCourse,
};
