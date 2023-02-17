const express = require('express');
const paymentRoute = express.Router();

const paymentController = require('../controllers/payment');
const permissions = require('../middleware/permission');
const enums = require('../constants/enum');

paymentRoute.post(
  '/',
  permissions.requireLogin,
  permissions.checkPermissions(enums.UserRole.STUDENT),
  paymentController.createPayment
);

paymentRoute.post(
  '/by-paypal',
  permissions.requireLogin,
  permissions.checkPermissions(enums.UserRole.STUDENT),
  paymentController.createPaymentByPaypal
);

paymentRoute.get(
  '/by-paypal/execute',
  permissions.requireLogin,
  permissions.checkPermissions(enums.UserRole.STUDENT),
  paymentController.executePaymentByPaypal
);

paymentRoute.get(
  '/by-paypal/cancel',
  permissions.requireLogin,
  permissions.checkPermissions(enums.UserRole.STUDENT),
  paymentController.cancelPaymentByPaypal
);

paymentRoute.post(
  '/by-momo',
  permissions.requireLogin,
  permissions.checkPermissions(enums.UserRole.STUDENT),
  paymentController.createPaymentByMomo
);

paymentRoute.get('/by-momo', paymentController.returnPaymentByMomo);

paymentRoute.get(
  '/?',
  permissions.requireLogin,
  permissions.checkPermissions(enums.UserRole.STUDENT),
  paymentController.getAllPaymentByStudent
);

module.exports = paymentRoute;
