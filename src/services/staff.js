const Staff = require('../models/staff');
const enums = require('../constants/enum');
const utilities = require('../utils/utility');
const mongoose = require('mongoose');

const createStaff = async (staff) => {
  const newStaff = new Staff(staff);
  return await newStaff.save();
};

const getStaff = async (filter) => {
  return await Staff.findOne(filter);
};

const getAllStaff = async (textSearch, pagination) => {
  let pipeline = [
    utilities.lookup('users', 'user', '_id', 'user'),
    utilities.unwind('$user'),
    {
      $match: {
        'user.role': enums.UserRole.CUSTOMER_SERVICE,
      },
    },
  ];
  if (textSearch) {
    pipeline.push(
      {
        $addFields: {
          name: { $concat: ['$lastName', ' ', '$firstName'] },
        },
      },
      {
        $match: {
          name: {
            $regex: textSearch,
            $options: 'i',
          },
        },
      }
    );
  }
  const documents = await Staff.aggregate(pipeline);

  if (pagination._page && pagination._limit) {
    const offset = (pagination._page - 1) * pagination._limit;
    pipeline.push(
      {
        $skip: offset,
      },
      { $limit: pagination._limit }
    );
  }
  const staffs = await Staff.aggregate(pipeline);
  return { staffs, count: documents.length };
};

const getEmailStaffs = async (filter) => {
  const staffs = await Staff.find(filter);
  return staffs.map((staff) => staff.email);
};

const updateStaff = async (_id, update) => {
  return await Staff.findOneAndUpdate({ _id: _id }, update);
};

const deleteStaff = async (filter) => {
  return await Staff.deleteOne(filter);
};

//#region countStaffs
const countStaffs = async (filter) => {
  const pipeline = [
    utilities.lookup('users', 'user', '_id', 'user'),
    utilities.unwind('$user', true),
    {
      $match: {
        'user.role': enums.UserRole.CUSTOMER_SERVICE,
      },
    },
  ];
  const documents = await Staff.aggregate(pipeline);
  return documents.length;
};

const getProfileByUserId = async (userId) => {
  const dataQuerys = await Staff.aggregate([
    {
      $match: {
        user: mongoose.Types.ObjectId(userId),
      },
    },
    utilities.lookup('users', 'user', '_id', 'users'),
    utilities.unwind('$users', true),
    {
      $project: {
        firstName: 1,
        lastName: 1,
        avatarUrl: 1,
        email: 1,
        phoneNumber: 1,
        role: '$users.role',
      },
    },
  ]);
  return dataQuerys[0];
};
//#endregion countStaffs

module.exports = {
  createStaff,
  getStaff,
  getAllStaff,
  updateStaff,
  deleteStaff,
  countStaffs,
  getEmailStaffs,
  getProfileByUserId,
};
