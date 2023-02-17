const LeaveNotice = require('../models/leaveNotice');

const createLeaveNotice = async (newModel) => {
  const newData = new LeaveNotice(newModel);
  return await newData.save();
};

const getLeaveNotice = async (filter) => {
  return await LeaveNotice.findOne(filter);
};

const createManyLeaveNotice = async (arrayNewModel) => {
  return await LeaveNotice.insertMany(arrayNewModel);
};
module.exports = {
  createLeaveNotice,
  getLeaveNotice,
  createManyLeaveNotice,
};
