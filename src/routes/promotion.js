const express = require('express');
const promotionRoute = express.Router();

const promotionController = require('../controllers/promotion');

promotionRoute.post('/', promotionController.createPromotion);

promotionRoute.get('/?', promotionController.getAllPromotions);

promotionRoute.get('/by-student', promotionController.getAllPromotionsByStudent);

promotionRoute.get('/:_id', promotionController.getPromotionById);

promotionRoute.put('/:_id', promotionController.updatePromotionById);

promotionRoute.delete('/:_id', promotionController.deletePromotionById);

module.exports = promotionRoute;
