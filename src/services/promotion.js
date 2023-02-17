const Promotion = require('../models/promotion');
const utilities = require('../utils/utility');
const enums = require('../constants/enum');
const mongoose = require('mongoose');

const createPromotion = async (promotion) => {
  const newPromotion = new Promotion(promotion);
  return await newPromotion.save();
};

const getAllPromotions = async (textSearch, { _page, _limit }) => {
  const filterQuery = {};
  if (textSearch) {
    filterQuery.name = { $regex: textSearch, $options: 'i' };
  }

  const documents = await Promotion.aggregate([
    {
      $match: filterQuery,
    },
  ]);
  const promotions = await Promotion.aggregate([
    {
      $match: filterQuery,
    },
    {
      $skip: (_page - 1) * _limit,
    },
    {
      $limit: _limit,
    },
    {
      $lookup: {
        from: 'payments',
        let: { promotionId: '$_id' },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  {
                    $eq: ['$promotion', '$$promotionId'],
                  },
                  {
                    $eq: ['$status', enums.StatusPayment.SUCCESS],
                  },
                ],
              },
            },
          },
        ],
        as: 'payments',
      },
    },
    {
      $project: {
        name: 1,
        code: 1,
        price: 1,
        point: 1,
        promo: 1,
        isPublic: 1,
        quantityPurchased: { $size: '$payments' },
        expirationDate: 1,
      },
    },
  ]);

  return { promotions, count: documents.length };
};

const getPromotions = async (filter) => {
  return await Promotion.aggregate([
    {
      $match: filter,
    },
  ]);
};

const getPromotionById = async (_id) => {
  return await Promotion.findOne({ _id: _id });
};

const updatePromotionById = async (_id, update) => {
  return await Promotion.findOneAndUpdate({ _id: _id }, update);
};

const getPromotionByCode = async (code) => {
  return await Promotion.findOne({ code: code });
};

const deletePromotionById = async (_id) => {
  return await Promotion.findOneAndDelete({ _id: _id });
};

const countPromotions = async (filter) => {
  return await Promotion.countDocuments(filter);
};

const getOnePromotionAvailble = async (_id) => {
  const promotions = await Promotion.aggregate([
    {
      $match: { _id: mongoose.Types.ObjectId(_id) },
    },
    { $match: { $expr: { $gt: [{ $subtract: ['$expirationDate', '$$NOW'] }, 0] } } },
  ]);
  const result = promotions && promotions.length > 0 ? promotions[0] : null;
  return result;
};
module.exports = {
  createPromotion,
  getAllPromotions,
  getPromotions,
  getPromotionById,
  getPromotionByCode,
  updatePromotionById,
  deletePromotionById,
  countPromotions,
  getOnePromotionAvailble,
};
