const express = require('express');
const reviewRoute = express.Router();
const enums = require('../constants/enum');
const permissions = require('../middleware/permission');

const reviewController = require('../controllers/review');

reviewRoute.post(
  '/',
  permissions.requireLogin,
  permissions.checkPermissions(enums.UserRole.STUDENT),
  reviewController.createReview
);

reviewRoute.get('/by?', permissions.requireLogin, reviewController.getAllReviews);

module.exports = reviewRoute;
