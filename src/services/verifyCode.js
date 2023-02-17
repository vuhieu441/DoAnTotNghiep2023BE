const VerifyCode = require('../models/verifyCode');

const createVerifyCode = async ({ email, code }) => {
  const newVerifyCode = {
    email: email,
    code: code,
  };

  const _newVerifyCode = new VerifyCode(newVerifyCode);
  return await _newVerifyCode.save();
};

const getVerifyCode = async (code) => {
  return await VerifyCode.findOne({ code: code });
};

const deleteVerifyCode = async (id) => {
  return await VerifyCode.findByIdAndDelete(id);
};

const deleteManyVerifyCode = async (filter) => {
  return await VerifyCode.deleteMany(filter);
};
module.exports = {
  createVerifyCode,
  getVerifyCode,
  deleteVerifyCode,
  deleteManyVerifyCode,
};
