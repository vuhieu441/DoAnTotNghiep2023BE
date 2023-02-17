const Student = require('../models/student');
const StudentCourse = require('../models/studentCourse');
const StudentPromotion = require('../models/promotion');
const mongoose = require('mongoose');
const ObjectId = mongoose.Types.ObjectId;

// Constant
const utilities = require('../utils/utility');
const constants = require('../constants/constants');
const enums = require('../constants/enum');
const helper = require('../helper/helperFunction');

// Help
const helperFunction = require('../helper/helperFunction');
const logger = require('../utils/logger');

const createStudent = async (student) => {
  const newStudent = new Student(student);
  return await newStudent.save();
};

const deleteStudent = async (filter) => {
  return await Student.deleteOne(filter);
};

const getStudent = async (filter) => {
  return await Student.findOne(filter).exec();
};

const blockStudent = async (_id) => {
  return await Student.findByIdAndUpdate(_id, { isBlock: true }).exec();
};

const getAllStudents = async (textSearch, pagination) => {
  const skip = (pagination._page - 1) * pagination._limit;
  const pipeline = [
    {
      $addFields: {
        name: { $concat: ['$lastName', ' ', '$firstName'] },
      },
    },
    {
      $lookup: {
        from: 'users',
        let: { id: '$user' },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  {
                    $eq: ['$_id', '$$id'],
                  },
                ],
              },
            },
          },
        ],
        as: 'user',
      },
    },
    { $unwind: '$user' },
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

  const documents = await Student.aggregate(pipeline);

  pipeline.push(
    {
      $skip: skip,
    },
    {
      $limit: pagination._limit,
    },
    utilities.lookup('wallets', '_id', 'student', 'wallet'),
    utilities.unwind('$wallet', true),
    {
      $project: {
        avatarUrl: 1,
        name: 1,
        firstName: 1,
        lastName: 1,
        isConfirm: '$user.isConfirm',
        gender: 1,
        nationality: 1,
        isBlock: 1,
        dob: 1,
        wallet: {
          _id: 1,
          point: 1,
          expirationDate: 1,
        },
      },
    }
  );

  const students = await Student.aggregate(pipeline);
  return { students, count: documents.length };
};

//#region getByUserId
const getByUserId = async (userId) => {
  return await Student.findOne({
    user: mongoose.Types.ObjectId(userId),
  }).exec();
};
//#endregion getByUserId

//#region registerCourse
const registerCourse = async (model) => {
  const newRegister = new StudentCourse(model);
  return await newRegister.save();
};
//#endregion registerCourse

//#region countStudents
const countStudents = async (filter) => {
  return await Student.countDocuments(filter);
};
//#endregion countStudents

const getAllStudentCourses = async (_id) => {
  return await StudentCourse.find({ student: _id });
};

const getAllStudentPromotion = async (_id) => {
  return await StudentPromotion.find({ studentId: _id });
};

const getDetailStudent = async (_id) => {
  return await Student.aggregate([
    {
      $match: {
        _id: ObjectId(_id),
      },
    },
    {
      $lookup: {
        from: 'users',
        localField: 'user',
        foreignField: '_id',
        as: 'user',
      },
    },
    {
      $unwind: '$user',
    },
    {
      $project: {
        _id: 0,
        detailStudent: {
          _id: '$_id',
          isConfirm: '$user.isConfirm',
          firstName: '$firstName',
          lastName: '$lastName',
          avatarUrl: '$avatarUrl',
          isBlock: '$isBlock',
          phoneNumber: '$phoneNumber',
          nationality: '$nationality',
          gender: '$gender',
          dob: '$dob',
          email: '$user.email',
        },
      },
    },
  ]);
};

//#region updateStudentById
const updateStudentById = async (studentId, update) => {
  return await Student.findByIdAndUpdate(studentId, update);
};
//#endregion updateStudentById

const getStudentCourses = async (filter) => {
  return await StudentCourse.aggregate([
    {
      $match: filter,
    },
    {
      $lookup: {
        from: 'students',
        localField: 'student',
        foreignField: '_id',
        as: 'student',
      },
    },
    {
      $unwind: '$student',
    },
    {
      $project: {
        _id: 1,
        firstName: '$student.firstName',
        lastName: '$student.lastName',
        avatarUrl: '$student.avatarUrl',
      },
    },
  ]);
};

//#region getProfileByUserId
const getProfileByUserId = async (userId) => {
  const dataQuerys = await Student.aggregate([
    {
      $match: {
        user: mongoose.Types.ObjectId(userId),
      },
    },
    utilities.lookup('users', 'user', '_id', 'users'),
    utilities.unwind('$users', true),
    utilities.lookup('wallets', '_id', 'student', 'wallet'),
    utilities.unwind('$wallet', true),
    {
      $project: {
        firstName: 1,
        lastName: 1,
        avatarUrl: 1,
        phoneNumber: 1,
        email: '$users.email',
        dob: 1,
        gender: 1,
        nationality: 1,
        wallet: {
          _id: 1,
          point: 1,
          expirationDate: 1,
        },
        role: '$users.role',
      },
    },
  ]);
  return dataQuerys[0];
};
//#endregion getProfileByUserId

//#region updateProfileByUserId
const updateProfileByUserId = async (userId, newModel) => {
  return await Student.findOneAndUpdate({ user: userId }, newModel);
};
//#endregion updateProfileByUserId

//#region getScheduleStudent
const getScheduleStudent = async (studentId, startDate, endDate) => {
  let queryDate = [];

  if (startDate) {
    queryDate.push({
      'flexibleLessons._startTime': {
        $gte: startDate,
      },
    });
  }
  if (endDate) {
    queryDate.push({
      'flexibleLessons._endTime': {
        $lte: endDate,
      },
    });
  }
  logger.info(`[serviceStudent][getScheduleStudent] queryDate -> ${JSON.stringify(queryDate)}`);

  const flexibleLessons = await Student.aggregate([
    {
      $match: {
        _id: mongoose.Types.ObjectId(studentId),
      },
    },
    {
      $lookup: {
        from: 'flexible-lessons',
        let: { studentId: '$_id' },
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
                $and: [
                  {
                    $and: [
                      { $eq: ['$student', '$$studentId'] },
                      {
                        $ne: ['$status', enums.StatusFlexibleLesson.CANCEL],
                      },
                    ],
                  },
                ],
              },
            },
          },
        ],
        as: 'flexibleLessons',
      },
    },
    utilities.unwind('$flexibleLessons', true),
    { $match: { $and: queryDate.length === 0 ? [{}] : queryDate } },
    utilities.lookup('leave-notices', 'flexibleLessons._id', 'flexibleLesson', 'leaveNotices'),
    {
      $project: {
        _id: '$flexibleLessons._id',
        title: '$flexibleLessons.name',
        start: '$flexibleLessons.startTime',
        end: '$flexibleLessons.endTime',
        type: {
          $cond: [{ $ne: [{ $type: '$flexibleLessons._id' }, 'missing'] }, enums.LessonType.FLEXIBLE, '$$REMOVE'],
        },
        isLeaveNotices: {
          $cond: [{ $eq: ['$leaveNotices', []] }, false, true],
        },
      },
    },
  ]);

  const fixedLessons = await Student.aggregate([
    {
      $match: {
        _id: mongoose.Types.ObjectId(studentId),
      },
    },
    utilities.lookup('student-courses', '_id', 'student', 'studentCourses'),
    utilities.lookup('courses', 'studentCourses.course', '_id', 'courses'),
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
    utilities.unwind('$fixedLessons', true),
    utilities.lookup('leave-notices', 'fixedLessons._id', 'fixedLesson', 'leaveNotices'),
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
        // isLeaveNotices: {
        //   $cond: [{ $eq: ['$leaveNotices', []] }, false, true],
        // },
      },
    },
  ]);

  const result = flexibleLessons.concat(fixedLessons).filter((ele) => !helperFunction.isObjectEmpty(ele));

  return result;
};
//#endregion getScheduleStudent

const getTutorsLearnedByStudentId = async (studentId, pagination, _textSearch) => {
  const { _page, _limit } = pagination;
  const offset = (_page - 1) * _limit;
  const now = helper.dateToStringUTC(new Date(), constants.DATE_FORMAT);

  let pipeLine = [
    {
      $match: {
        _id: studentId,
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
                    $eq: ['$student', studentId],
                  },
                  { $lt: [{ $subtract: ['$endTime', '$$NOW'] }, 0] },
                ],
              },
            },
          },
        ],
        as: 'flexibleLessons',
      },
    },
    utilities.lookup('student-courses', '_id', 'student', 'studentCourses'),
    utilities.unwind('$studentCourses'),
    {
      $lookup: {
        from: 'courses',
        let: { courseId: '$studentCourses.course' },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  {
                    $eq: ['$_id', '$$courseId'],
                  },
                  { $lt: [{ $subtract: [{ $toDate: '$openDay' }, '$$NOW'] }, 0] },
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
        from: 'fixed-lessons',
        let: { courseId: '$courses._id' },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  {
                    $eq: ['$course', '$$courseId'],
                  },
                  { $lt: [{ $subtract: ['$endTime', '$$NOW'] }, 0] },
                ],
              },
            },
          },
        ],
        as: 'fixedLessons',
      },
    },

    { $addFields: { courses: { $cond: [{ $gt: [{ $size: '$fixedLessons' }, 0] }, '$courses', []] } } },

    utilities.lookup('tutor-courses', 'courses._id', 'course', 'tutorCourses'),
    utilities.unwind('$tutorCourses', true),

    // utilities.lookup('tutors', 'flexibleLessons.tutor', '_id', 'tutorFlex'),
    {
      $group: {
        _id: '$_id',
        flexibleLessons: { $first: '$flexibleLessons' },
        tutorCourses: { $addToSet: '$tutorCourses' },
      },
    },
    { $addFields: { tutors: { $concatArrays: ['$tutorCourses.tutor', '$flexibleLessons.tutor'] } } },
    { $unwind: '$tutors' },
    utilities.lookup('tutors', 'tutors', '_id', 'tutor'),
    utilities.unwind('$tutor'),

    utilities.lookup('flexible-lessons', 'tutor._id', 'tutor', 'flexibleLessons'),
    utilities.lookup('tutor-courses', 'tutor._id', 'tutor', 'tutorCourses'),
    {
      $lookup: {
        from: 'student-courses',
        let: { courseId: '$tutorCourses.course' },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  {
                    $in: ['$course', '$$courseId'],
                  },
                  {
                    $eq: ['$student', studentId],
                  },
                ],
              },
            },
          },
        ],
        as: 'studentCourses',
      },
    },

    {
      $project: {
        _id: '$tutor._id',
        lastName: '$tutor.lastName',
        firstName: '$tutor.firstName',
        salaryPerHour: '$tutor.salaryPerHour',
        avatarUrl: '$tutor.avatarUrl',
        gender: '$tutor.gender',
        nationality: '$tutor.nationality',
        languages: '$tutor.languages',
        description: '$tutor.description',
        createdAt: '$tutor.createdAt',
        courses: { $cond: [{ $ne: [{ $type: '$tutorCourses' }, 'missing'] }, { $size: '$studentCourses' }, 0] },
        flexibleLesson: {
          $cond: [{ $ne: [{ $type: '$flexibleLessons' }, 'missing'] }, { $size: '$flexibleLessons' }, 0],
        },
      },
    },

    utilities.lookup('reviews', '_id', 'tutor', 'reviews'),
    {
      $addFields: {
        avgReviews: {
          $reduce: {
            input: '$reviews.star',
            initialValue: 0,
            in: {
              $sum: ['$$value', '$$this'],
            },
          },
        },
      },
    },
    {
      $addFields: {
        avgReviews: {
          $cond: [{ $gt: [{ $size: '$reviews' }, 0] }, { $divide: ['$avgReviews', { $size: '$reviews' }] }, -1],
        },
      },
    },
    {
      $group: {
        _id: '$_id',
        lastName: { $first: '$lastName' },
        firstName: { $first: '$firstName' },
        salaryPerHour: { $first: '$salaryPerHour' },
        avatarUrl: { $first: '$avatarUrl' },
        gender: { $first: '$gender' },
        nationality: { $first: '$nationality' },
        languages: { $first: '$languages' },
        description: { $first: '$description' },
        createdAt: { $first: '$createdAt' },
        courses: { $first: '$courses' },
        flexibleLesson: { $first: '$flexibleLesson' },
        avgReviews: { $first: '$avgReviews' },
      },
    },
    { $sort: { createdAt: 1 } },
  ];

  const tutorAllsNoSearch = await Student.aggregate(pipeLine);

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

  const tutorAlls = await Student.aggregate(pipeLine);

  if (_limit && _page) {
    pipeLine.push({ $skip: offset }, { $limit: _limit });
  }
  const tutorLearned = await Student.aggregate(pipeLine);
  return { tutorLearned, count: tutorAlls.length, total: tutorAllsNoSearch.length };
};

module.exports = {
  getStudent,
  createStudent,
  getAllStudents,
  blockStudent,
  getByUserId,
  registerCourse,
  countStudents,
  getAllStudentCourses,
  getAllStudentPromotion,
  getDetailStudent,
  updateStudentById,
  getStudentCourses,
  getProfileByUserId,
  updateProfileByUserId,
  getScheduleStudent,
  getTutorsLearnedByStudentId,
  deleteStudent,
};
