const User = require('../models/user');
const mongoose = require('mongoose');
const { UserRole } = require('../constants/enum');
const utilities = require('../utils/utility');

const createUser = async (user) => {
  const newUser = new User(user);
  return await newUser.save();
};

const getUser = async (filter) => {
  return await User.findOne(filter);
};
const getEmailUser = async (filter) => {
  const users = await User.find(filter);
  return users.map((user) => user.email);
};

const getUserById = async (_id) => {
  return await User.findById(_id);
};

const getAdmin = async (filter) => {
  return await User.findOne(filter);
};

const getStudents = async (filter) => {
  return await User.find(filter);
};

const deleteUser = async (filter) => {
  return await User.findOneAndDelete(filter);
};

const getUserByEmail = async (m) => {
  return await User.findOne({ email: m });
};

const updateUser = async (_id, update) => {
  return await User.findOneAndUpdate({ _id: _id }, update);
};

const getAllUserByFilter = async (filter) => {
  return await User.find(filter);
};

const getAllAdmin = async () => {
  const admins = await User.aggregate([
    {
      $match: {
        role: UserRole.ADMIN,
      },
    },
    utilities.lookup('staffs', '_id', 'user', 'staff'),
    utilities.unwind('$staff', true),
    {
      $project: {
        email: 1,
        phoneNumber: '$staff.phoneNumber',
      },
    },
  ]);
  return admins[0];
};

module.exports = {
  createUser,
  getUser,
  getUserByEmail,
  deleteUser,
  updateUser,
  getUserById,
  getAdmin,
  getAllUserByFilter,
  getStudents,
  getEmailUser,
  getAllAdmin,
};
