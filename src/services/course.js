const Course = require('../models/course');
const FixedLesson = require('../models/fixedLesson');
const StudentCourse = require('../models/studentCourse');
const mongoose = require('mongoose');
const enums = require('../constants/enum');
const constants = require('../constants/constants');
const helper = require('../helper/helperFunction');
const ObjectId = mongoose.Types.ObjectId;
const utilities = require('../utils/utility');

//#region createCourse
const createCourse = async (course) => {
  const newCourse = new Course(course);
  return await newCourse.save();
};
//#endregion createCourse

//#region getAllCoursesForAdmin
const getAllCoursesForAdmin = async (textSearch, filter, { _page, _limit }) => {
  const skip = _limit * (_page - 1);
  let documents = await Course.find({});
  const pipeline = [];
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
  switch (filter) {
    case enums.FilterCourse.FINISHED:
      pipeline.push({
        $match: {
          isActive: { $eq: true },
        },
      });
      break;
    case enums.FilterCourse.UPCOMING:
      pipeline.push({
        $match: {
          isActive: { $eq: false },
        },
      });
      break;
  }

  if (pipeline.length > 0) {
    documents = await Course.aggregate(pipeline);
  }

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
        foreignField: 'course',
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
        from: 'tutors',
        localField: 'tutorCourses.tutor',
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
      $lookup: {
        from: 'student-courses',
        localField: '_id',
        foreignField: 'course',
        as: 'studentCourses',
      },
    },
    {
      $lookup: {
        from: 'students',
        localField: 'studentCourses.student',
        foreignField: '_id',
        as: 'students',
      },
    },
    {
      $project: {
        avatarUrl: 1,
        name: 1,
        tutors: {
          _id: 1,
          firstName: 1,
          lastName: 1,
          avatarUrl: 1,
        },
        studentsRegistered: { $size: '$studentCourses' },
        maxStudents: 1,
        openDay: 1,
        price: 1,
        numberLessons: 1,
        isActive: 1,
        endDay: 1,
      },
    }
  );

  const courses = await Course.aggregate(pipeline);
  return { courses, count: documents.length };
};
//#endregion getAllCoursesForAdmin

//#region getAllCoursesForStudent
const getAllCoursesForStudent = async (
  { _textSearch, _languageArray, _price, _time, _dow },
  { _page, _limit },
  studentId
) => {
  const skip = _limit * (_page - 1);
  const now = helper.dateToStringLocal(new Date(), constants.DATE_FORMAT);
  const pipeline = [
    {
      $match: {
        isActive: true,
        openDay: { $gte: now },
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
        as: 'fixedLessons',
      },
    },
    { $addFields: { fixedTimeMin: { $min: '$fixedLessons.endTime' } } },
    {
      $match: {
        $expr: {
          $gt: ['$fixedTimeMin', '$$NOW'],
        },
      },
    },
  ];
  if (_textSearch) {
    pipeline.push({
      $match: {
        name: {
          $regex: _textSearch,
          $options: 'i',
        },
      },
    });
  }
  if (_languageArray) {
    pipeline.push({
      $match: {
        language: { $in: _languageArray },
      },
    });
  }
  if (_price) {
    switch (_price) {
      case enums.FilterPrice.LT100:
        pipeline.push({
          $match: {
            price: { $lt: 100 },
          },
        });
        break;
      case enums.FilterPrice.GTE100_LTE400:
        pipeline.push({
          $match: {
            $and: [{ price: { $gte: 100 } }, { price: { $lte: 400 } }],
          },
        });
        break;
      case enums.FilterPrice.GT400:
        pipeline.push({
          $match: {
            price: { $gt: 400 },
          },
        });
        break;
    }
  }
  // if (_dow) {
  //   pipeline.push(
  //     {
  //       $addFields: {
  //         dayOfWeek: '$timetable.dayOfWeek',
  //       },
  //     },
  //     {
  //       $match: {
  //         dayOfWeek: _dow,
  //       },
  //     }
  //   );
  // }
  // if (_time) {

  // }

  const documents = await Course.aggregate(pipeline);

  pipeline.push(
    {
      $lookup: {
        from: 'tutor-courses',
        localField: '_id',
        foreignField: 'course',
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
        from: 'tutors',
        localField: 'tutorCourses.tutor',
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
      $lookup: {
        from: 'student-courses',
        localField: '_id',
        foreignField: 'course',
        as: 'studentCourses',
      },
    },
    {
      $lookup: {
        from: 'students',
        localField: 'studentCourses.student',
        foreignField: '_id',
        as: 'students',
      },
    },

    studentId
      ? {
          $match: {
            $expr: {
              $eq: [{ $indexOfArray: ['$studentCourses.student', studentId] }, -1],
            },
          },
        }
      : { $match: { $expr: { $eq: [true, true] } } },
    utilities.lookup('reviews', 'tutors._id', 'tutor', 'reviews'),
    {
      $project: {
        avatarUrl: 1,
        name: 1,
        tutors: {
          _id: 1,
          avatarUrl: 1,
          firstName: 1,
          lastName: 1,
          avgStar: { $avg: '$reviews.star' },
        },
        studentsRegistered: { $size: '$studentCourses' },
        maxStudents: 1,
        price: 1,
        openDay: 1,
        endDay: 1,
        numberLessons: 1,
        timetable: 1,
        description: {
          short: 1,
        },
        language: 1,
      },
    },
    {
      $match: {
        $expr: {
          $gt: ['$maxStudents', '$studentsRegistered'],
        },
      },
    }
  );
  const totalIfHaveStudentID = await Course.aggregate(pipeline);

  pipeline.push(
    {
      $skip: skip,
    },
    {
      $limit: _limit,
    }
  );

  const courses = await Course.aggregate(pipeline);
  return { courses, _total: studentId ? totalIfHaveStudentID.length : documents.length };
};
//#endregion getAllCoursesForStudent

//#region getCourseByIdForAdmin
const getCoursesByIdForAdmin = async (courseId) => {
  return await Course.aggregate([
    {
      $match: {
        _id: mongoose.Types.ObjectId(courseId),
      },
    },
    {
      $lookup: {
        from: 'tutor-courses',
        localField: '_id',
        foreignField: 'course',
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
        from: 'tutors',
        localField: 'tutorCourses.tutor',
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
      $lookup: {
        from: 'student-courses',
        localField: '_id',
        foreignField: 'course',
        as: 'studentCourses',
      },
    },
    {
      $lookup: {
        from: 'students',
        localField: 'studentCourses.student',
        foreignField: '_id',
        as: 'students',
      },
    },
    {
      $lookup: {
        from: 'course-contents',
        localField: '_id',
        foreignField: 'course',
        as: 'courseContents',
      },
    },
    {
      $project: {
        avatarUrl: 1,
        name: 1,
        tutors: {
          _id: 1,
          firstName: 1,
          lastName: 1,
          avatarUrl: 1,
        },
        studentsRegistered: { $size: '$studentCourses' },
        maxStudents: 1,
        openDay: 1,
        endDay: 1,
        price: 1,
        timetable: 1,
        numberLessons: 1,
        isActive: 1,
        documentsUrl: 1,
        courseContents: {
          _id: 1,
          name: 1,
          child: 1,
        },
        language: 1,
        description: 1,
        documents: 1,
        students: {
          _id: 1,
          avatarUrl: 1,
          firstName: 1,
          lastName: 1,
        },
      },
    },
  ]);
};
//#endregion getCourseByIdForAdmin

//#region getCoursesByIdForStudent
const getCoursesByIdForStudent = async (courseId) => {
  const dataQuerys = await Course.aggregate([
    {
      $match: {
        _id: mongoose.Types.ObjectId(courseId),
      },
    },
    utilities.lookup('tutor-courses', '_id', 'course', 'tutorCourses'),
    utilities.unwind('$tutorCourses', true),
    utilities.lookup('tutors', 'tutorCourses.tutor', '_id', 'tutor'),
    utilities.unwind('$tutor', true),
    utilities.lookup('reviews', 'tutor._id', 'tutor', 'reviews'),
    utilities.lookup('student-courses', '_id', 'course', 'studentCourses'),
    utilities.lookup('students', 'studentCourses.student', '_id', 'students'),
    // utilities.unwind('$students', true),
    utilities.lookup('course-contents', '_id', 'course', 'courseContents'),
    {
      $project: {
        avatarUrl: 1,
        name: 1,
        description: 1,
        language: 1,
        timetable: 1,
        openDay: 1,
        endDay: 1,
        price: 1,
        maxStudents: 1,
        studentsRegistered: { $size: '$studentCourses' },
        numberLessons: 1,
        tutor: {
          _id: 1,
          avatarUrl: 1,
          firstName: 1,
          lastName: 1,
          avgStar: { $avg: '$reviews.star' },
        },
        courseContents: {
          _id: 1,
          name: 1,
          child: 1,
        },
        students: {
          _id: 1,
          avatarUrl: 1,
          firstName: 1,
          lastName: 1,
        },
      },
    },
  ]);
  return dataQuerys[0];
};
//#endregion getCoursesByIdForStudent

//#region getCourseByCode
const getCourseByCode = async (code) => {
  return await Course.findOne({ code: code });
};
//#endregion getCourseByCode

//#region updateCourse
const updateCourse = async (courseId, newModel) => {
  return await Course.findByIdAndUpdate(courseId, newModel).exec();
};
//#endregion updateCourse

//#region deleteCourseById
const deleteCourseById = async (courseId) => {
  return await Course.findByIdAndDelete(courseId).exec();
};
//#endregion deleteCourseById

//#region getCourseById
const getCourseById = async (courseId) => {
  return await Course.findById(courseId);
};
//#endregion getCourseById

//#region countCourses
const countCourses = async (filter) => {
  return await Course.countDocuments(filter);
};
//#endregion countCourses

module.exports = {
  createCourse,
  getAllCoursesForAdmin,
  getCourseByCode,
  getCoursesByIdForAdmin,
  updateCourse,
  deleteCourseById,
  getCourseById,
  countCourses,
  getAllCoursesForStudent,
  getCoursesByIdForStudent,
};
