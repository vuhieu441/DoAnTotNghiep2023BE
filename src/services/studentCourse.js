const StudentCourse = require('../models/studentCourse');
const utilities = require('../utils/utility');
const constant = require('../constants/constants');

const getStudentCoursed = async (filter, aggregate = false) => {
  if (!aggregate) {
    return StudentCourse.find(filter);
  }
  return StudentCourse.aggregate([
    {
      $match: filter,
    },
    {
      $lookup: {
        from: 'courses',
        let: { coursesId: '$course' },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ['$_id', '$$coursesId'] },
                  {
                    $gte: [
                      '$openDay',
                      {
                        $dateToString: {
                          date: new Date(),
                          format: constant.DATE_FORMAT_AGGREGATE,
                        },
                      },
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
    // utilities.lookup('courses', 'course', '_id', 'courses'),
    utilities.unwind('$courses'),
    {
      $project: {
        _id: '$courses._id',
        name: '$courses.name',
        imgUrl: '$courses.avatarUrl',
      },
    },
  ]);
};

module.exports = {
  getStudentCoursed,
};
