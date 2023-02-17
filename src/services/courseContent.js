const CourseContent = require('../models/courseContent');
const mongoose = require('mongoose');

const create = async (courseContent) => {
  return await CourseContent.insertMany(courseContent);
};

const getAllByCourseId = async (courseId) => {
  return await CourseContent.find({ course: mongoose.Types.ObjectId(courseId) });
};

const deletedCourseContent = async (courseId) => {
  return await CourseContent.deleteMany({
    course: mongoose.Types.ObjectId(courseId),
  });
}

module.exports = {
  create,
  getAllByCourseId,
  deletedCourseContent,
};
