const Review = require('../models/review');
const Course = require('../models/course');
const mongoose = require('mongoose');
const utilities = require('../utils/utility');
const { getLastPage } = require('../helper/helperFunction');

const createReview = async (review) => {
  const newReview = new Review(review);
  return await newReview.save();
};

const getReviewByFilter = async (filter) => {
  return await Review.findOne(filter);
};

const getAllReviews = async ({ ...filter }) => {
  const filterQuery = {};
  if (filter.studentId) {
    filterQuery.student = { $eq: mongoose.Types.ObjectId(filter.studentId) };
  }
  return await Review.find(filterQuery);
};

const getRatingAvgFlexibleLesson = async (flexibleLessonId) => {
  const filter = {};
  if (flexibleLessonId) {
    filter.flexible = flexibleLessonId;
  }

  const rateAvg = await Review.aggregate([
    {
      $match: filter,
    },
    {
      $group: {
        _id: '$flexibleLesson',
        length: { $sum: 1 },
        rate: { $sum: '$star' },
      },
    },
    {
      $project: {
        rateAvg: { $divide: ['$rate', '$length'] },
      },
    },
  ]);
  return rateAvg[0] ? rateAvg[0].rateAvg : 0;
};

const getAllFilter = async (filter) => {
  return await Review.find(filter);
};

const getReviewsByFilter = async (filter, pagination) => {
  const _offset = (pagination._page - 1) * pagination._limit;
  const pipeline = [
    {
      $match: filter,
    },
    {
      $lookup: {
        from: 'flexible-lessons',
        let: { flexId: '$flexibleLesson' },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  {
                    $eq: ['$_id', '$$flexId'],
                  },
                ],
              },
            },
          },
          { $project: { name: 1 } },
        ],
        as: 'flexibleLesson',
      },
    },

    utilities.unwind('$flexibleLesson', true),

    {
      $lookup: {
        from: 'fixed-lessons',
        let: { fixedId: '$fixedLesson' },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  {
                    $eq: ['$_id', '$$fixedId'],
                  },
                ],
              },
            },
          },
          { $project: { name: 1, course: 1 } },
        ],
        as: 'fixedLesson',
      },
    },

    utilities.unwind('$fixedLesson', true),

    {
      $lookup: {
        from: 'courses',
        let: { courseId: '$fixedLesson.course' },
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
          { $project: { name: 1 } },
        ],
        as: 'courses',
      },
    },

    utilities.unwind('$courses', true),
    {
      $match: {
        $expr: {
          $or: [{ $ne: [{ $type: '$fixedLesson' }, 'missing'] }, { $ne: [{ $type: '$flexibleLesson' }, 'missing'] }],
        },
      },
    },
    utilities.lookup('tutors', 'tutor', '_id', 'tutor'),
    utilities.unwind('$tutor', true),
    {
      $project: {
        _id: 1,
        content: 1,
        flexibleLesson: 1,
        tutor: { firstName: 1, lastName: 1, _id: 1, avatarUrl: 1 },
        star: 1,
        courses: 1,
        fixedLesson: { _id: 1, name: 1 },
        createdAt: 1,
        type: { $cond: [{ $ne: [{ $type: '$fixedLesson' }, 'missing'] }, 'Fixed', 'Flexible'] },
      },
    },
    {
      $match: {
        $expr: {
          $and: [{ $ne: [{ $type: '$type' }, 'missing'] }],
        },
      },
    },
    { $sort: { createdAt: -1 } },
  ];
  const documents = await Review.aggregate(pipeline);

  pipeline.push({ $skip: _offset }, { $limit: pagination._limit });

  const dataReviews = await Review.aggregate(pipeline);
  if (dataReviews.length === 0) {
    return null;
  }
  const avgStar = documents.reduce((a, b) => ({ star: a.star + b.star })).star / documents.length;
  const numberStarFives = documents.filter((x) => x.star === 5).length;
  const numberStarFours = documents.filter((x) => x.star === 4).length;
  const numberStarThrees = documents.filter((x) => x.star === 3).length;
  const numberStarTwos = documents.filter((x) => x.star === 2).length;
  const numberStarOnes = documents.filter((x) => x.star === 1).length;

  return {
    avgStar,
    numberStarFives,
    numberStarFours,
    numberStarThrees,
    numberStarTwos,
    numberStarOnes,
    data: dataReviews,
    total: documents.length,
    lastPage: getLastPage(documents.length, pagination._limit),
  };
};

//#region getReviewByTutor
const getReviewByTutor = async (tutorId, pagination) => {
  const _offset = (pagination._page - 1) * pagination._limit;
  const pipeline = [
    {
      $match: {
        tutor: mongoose.Types.ObjectId(tutorId),
      },
    },
  ];
  const totalReviews = await Review.aggregate(pipeline);

  pipeline.push(
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
    {
      $lookup: {
        from: 'fixed-lessons',
        localField: 'fixedLesson',
        foreignField: '_id',
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
        from: 'courses',
        localField: 'fixedLessons.course',
        foreignField: '_id',
        as: 'courses',
      },
    },
    {
      $unwind: {
        path: '$courses',
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $lookup: {
        from: 'flexible-lessons',
        localField: 'flexibleLesson',
        foreignField: '_id',
        as: 'flexibleLessons',
      },
    },
    {
      $unwind: {
        path: '$flexibleLessons',
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $project: {
        createdAt: 1,
        content: 1,
        star: 1,
        student: {
          _id: '$students._id',
          firstName: '$students.firstName',
          lastName: '$students.lastName',
          avatarUrl: '$students.avatarUrl',
        },
        flexibleLessons: {
          _id: 1,
          name: 1,
        },
        courses: {
          _id: 1,
          name: 1,
        },
      },
    },
    { $sort: { createdAt: -1 } },
    { $skip: _offset },
    { $limit: pagination._limit }
  );

  const reviewsPagination = await Review.aggregate(pipeline);

  if (reviewsPagination.length === 0) {
    return null;
  }

  const avgStar = totalReviews.reduce((a, b) => ({ star: a.star + b.star })).star / totalReviews.length;
  const numberStarFives = totalReviews.filter((x) => x.star === 5).length;
  const numberStarFours = totalReviews.filter((x) => x.star === 4).length;
  const numberStarThrees = totalReviews.filter((x) => x.star === 3).length;
  const numberStarTwos = totalReviews.filter((x) => x.star === 2).length;
  const numberStarOnes = totalReviews.filter((x) => x.star === 1).length;

  return {
    avgStar,
    numberStarFives,
    numberStarFours,
    numberStarThrees,
    numberStarTwos,
    numberStarOnes,
    data: reviewsPagination,
    lastPage: getLastPage(totalReviews.length, pagination._limit),
    total: totalReviews.length,
  };
};
//#endregion getReviewByTutor

//#region getReviewByFixedLessons
const getReviewByFixedLessons = async (fixedLessons, pagination) => {
  const _offset = (pagination._page - 1) * pagination._limit;
  const pipeline = [
    {
      $match: {
        fixedLesson: { $in: fixedLessons },
      },
    },
    {
      $lookup: {
        from: 'students',
        let: {
          studentId: '$student',
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
          {
            $project: {
              firstName: 1,
              lastName: 1,
              avatarUrl: 1,
            },
          },
        ],
        as: 'student',
      },
    },
    utilities.unwind('$student'),
    { $sort: { createdAt: -1 } },
  ];
  const documents = await Review.aggregate(pipeline);

  pipeline.push({ $skip: _offset }, { $limit: pagination._limit });

  const dataReviews = await Review.aggregate(pipeline);

  if (dataReviews.length === 0) {
    return null;
  }
  const avgStar = documents.reduce((a, b) => ({ star: a.star + b.star })).star / documents.length;
  const numberStarFives = documents.filter((x) => x.star === 5).length;
  const numberStarFours = documents.filter((x) => x.star === 4).length;
  const numberStarThrees = documents.filter((x) => x.star === 3).length;
  const numberStarTwos = documents.filter((x) => x.star === 2).length;
  const numberStarOnes = documents.filter((x) => x.star === 1).length;

  return {
    avgStar,
    numberStarFives,
    numberStarFours,
    numberStarThrees,
    numberStarTwos,
    numberStarOnes,
    data: dataReviews,
    total: documents.length,
    lastPage: getLastPage(documents.length, pagination._limit),
  };
};
//#endregion getReviewByFixedLessons

//#region getReviewsByCourse
const getReviewsByCourse = async (idCourse, pagination) => {
  const _offset = (pagination._page - 1) * pagination._limit;
  const totalReviews = await Course.aggregate([
    {
      $match: {
        _id: mongoose.Types.ObjectId(idCourse),
      },
    },
    utilities.lookup('fixed-lessons', '_id', 'course', 'fixedLessons'),
  ]);

  const pipeline = [
    {
      $match: {
        $expr: {
          $in: ['$fixedLesson', fixedLessons],
        },
      },
    },
    {
      $lookup: {
        from: 'students',
        let: {
          studentId: '$student',
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
          {
            $project: {
              firstName: 1,
              lastName: 1,
              avatarUrl: 1,
            },
          },
        ],
        as: 'student',
      },
    },
    utilities.unwind('$student'),
    { $sort: { createdAt: -1 } },
  ];
  const documents = await Review.aggregate(pipeline);

  pipeline.push({ $skip: _offset }, { $limit: pagination._limit });

  const dataReviews = await Review.aggregate(pipeline);

  if (dataReviews.length === 0) {
    return {
      avgStar: 0,
      numberStarFives: 0,
      numberStarFours: 0,
      numberStarThrees: 0,
      numberStarTwos: 0,
      numberStarOnes: 0,
      data: [],
      total: 0,
    };
  }
  const avgStar = documents.reduce((a, b) => ({ star: a.star + b.star })).star / documents.length;
  const numberStarFives = documents.filter((x) => x.star === 5).length;
  const numberStarFours = documents.filter((x) => x.star === 4).length;
  const numberStarThrees = documents.filter((x) => x.star === 3).length;
  const numberStarTwos = documents.filter((x) => x.star === 2).length;
  const numberStarOnes = documents.filter((x) => x.star === 1).length;

  return {
    avgStar,
    numberStarFives,
    numberStarFours,
    numberStarThrees,
    numberStarTwos,
    numberStarOnes,
    data: dataReviews,
    total: documents.length,
  };
};
//#endregion getReviewsByCourse

module.exports = {
  createReview,
  getAllReviews,
  getAllFilter,
  getRatingAvgFlexibleLesson,
  getReviewsByFilter,
  getReviewByTutor,
  getReviewByFilter,
  getReviewByFixedLessons,
};
