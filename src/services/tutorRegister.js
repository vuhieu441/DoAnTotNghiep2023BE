const TutorRegister = require('../models/tutorRegister');

const createTutorRegister = async (neWModel) => {
  const newTutorRegister = new TutorRegister(neWModel);
  return await newTutorRegister.save();
};

const getAllTutorRegister = async (query, _status, _textSearch, pagination) => {
  const skip = (pagination._page - 1) * pagination._limit;
  const pipeline = [
    {
      $match: query,
    },
    {
      $addFields: {
        name: { $concat: ['$lastName', ' ', '$firstName'] },
      },
    },
  ];

  const documentNotSearch = await TutorRegister.aggregate(pipeline);
  const total = documentNotSearch.length;

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
  if (_status) {
    pipeline.push({
      $match: { status: _status },
    });
  }

  const documents = await TutorRegister.aggregate(pipeline);
  const count = documents.length;

  pipeline.push(
    {
      $skip: skip,
    },
    {
      $limit: pagination._limit,
    }
  );

  const tutorRegisters = await TutorRegister.aggregate(pipeline);
  return { tutorRegisters, count, total };
};

const getTutorRegisterById = async (tutorRegisterId) => {
  return await TutorRegister.findById(tutorRegisterId);
};

const updateTutorRegisterById = async (tutorRegisterId, newModel) => {
  return await TutorRegister.findByIdAndUpdate(tutorRegisterId, newModel);
};

const countDocuments = async (filter) => {
  return await TutorRegister.countDocuments(filter);
};

module.exports = {
  createTutorRegister,
  getAllTutorRegister,
  getTutorRegisterById,
  updateTutorRegisterById,
  countDocuments,
};
