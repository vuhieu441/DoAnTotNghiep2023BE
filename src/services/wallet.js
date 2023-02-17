const Wallet = require('../models/wallet');

const createWallet = async (newModel) => {
  const newWallet = new Wallet(newModel);
  return await newWallet.save();
};

const updateWalletByStudent = async (studentId, newModel) => {
  return await Wallet.findOneAndUpdate({ student: studentId }, newModel);
};

const getWalletByStudent = async (studentId) => {
  return await Wallet.findOne({ student: studentId });
};

module.exports = {
  createWallet,
  updateWalletByStudent,
  getWalletByStudent,
};
