const TutorCourse = require('../models/tutorCourse');

const createTutorCourse = async (data) => {
  const newDocument = new TutorCourse(data);
  return await newDocument.save();
};

const deleteManyTutorCourse = async (filter) => {
  return await TutorCourse.deleteMany(filter);
}

const getTutorCourse = async (filter) => {
  return await TutorCourse.find(filter);
}

const updateTutorCourse = async (filter, newModel) => {
  return await TutorCourse.findOneAndUpdate(filter, newModel);
}

module.exports = {
  createTutorCourse,
  deleteManyTutorCourse,
  getTutorCourse,
  updateTutorCourse,
};
