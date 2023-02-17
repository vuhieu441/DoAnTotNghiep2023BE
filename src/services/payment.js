const Payment = require('../models/payment');
const utilities = require('../utils/utility');
const mongoose = require('mongoose');
const enums = require('../constants/enum');

const createPayment = async (newModel) => {
  const newPayment = new Payment(newModel);
  return await newPayment.save();
};

//#region getAllPaymentByStudent
const getAllPaymentByStudent = async (studentId, { _page, _limit }) => {
  const skip = _limit * (_page - 1);
  const pipeline = [
    {
      $match: {
        student: mongoose.Types.ObjectId(studentId),
        status: enums.StatusPayment.SUCCESS,
      },
    },
  ];
  const documents = await Payment.aggregate(pipeline);

  pipeline.push(
    {
      $skip: skip,
    },
    {
      $limit: _limit,
    },
    utilities.lookup('promotions', 'promotion', '_id', 'promotion'),
    utilities.unwind('$promotion', true),
    {
      $project: {
        amount: 1,
        point: 1,
        createdAt: 1,
        status: 1,
        promotion: {
          _id: 1,
          name: 1,
        },
      },
    }
  );

  const payments = await Payment.aggregate(pipeline);

  return { payments, total: documents.length };
};
//#endregion getAllPaymentByStudent

//#region getAllPaymentByStudentNoPagination
const getAllPaymentByStudentNoPagination = async (studentId) => {
  return await Payment.aggregate([
    {
      $match: {
        student: mongoose.Types.ObjectId(studentId),
        status: enums.StatusPayment.SUCCESS,
      },
    },
    utilities.lookup('promotions', 'promotion', '_id', 'promotion'),
    utilities.unwind('$promotion', true),
    {
      $project: {
        amount: 1,
        point: 1,
        createdAt: 1,
        status: 1,
        promotion: {
          _id: 1,
          name: 1,
        },
      },
    },
  ]);
};
//#endregion getAllPaymentByStudentNoPagination

const updatePaymentById = async (id, newModel) => {
  return await Payment.findByIdAndUpdate(id, newModel);
};

const updatePaymentByTransaction = async (transactionId, newModel) => {
  return await Payment.findOneAndUpdate({ transactionId }, newModel);
};

const getPaymentByTransaction = async (transactionId) => {
  return await Payment.findOne({ transactionId });
};

const getPaymentUsedByStudentId = async (studentId) => {
  const payment = await Payment.aggregate([
    {
      $match: {
        student: mongoose.Types.ObjectId(studentId),
        status: enums.StatusPayment.SUCCESS,
      },
    },
    {
      $group: {
        _id: null,
        totalPrice: { $sum: '$amount' },
        totalPoint: { $sum: '$point' },
      },
    },
  ]);
  return payment[0] || { totalPrice: 0, totalPoint: 0 };
};

const getOnePaymentNotDone = async (transactionId) => {
  const payment = await Payment.aggregate([
    {
      $match: { transactionId: transactionId },
    },
    {
      $match: {
        $expr: {
          $eq: [{ $eq: ['$status', enums.StatusPayment.SUCCESS] }, false],
        },
      },
    },
  ]);
  const result = payment.length > 0 ? payment[0] : null;
  return result;
};
module.exports = {
  createPayment,
  getAllPaymentByStudent,
  updatePaymentById,
  getPaymentByTransaction,
  updatePaymentByTransaction,
  getAllPaymentByStudentNoPagination,
  getPaymentUsedByStudentId,
  getOnePaymentNotDone,
};
