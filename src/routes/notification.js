const express = require('express');
const notificationRoute = express.Router();
const notificationController = require('../controllers/notification');
const permissions = require('../middleware/permission');
const enums = require('../constants/enum');

notificationRoute.put('/:_id', permissions.requireLogin, notificationController.updateNotifyUser);

notificationRoute.put('/active/:_id', permissions.requireLogin, notificationController.updateNotifyUserByActive);

notificationRoute.get(
  '/',
  permissions.requireLogin,
  permissions.checkPermissions(
    enums.UserRole.ADMIN,
    enums.UserRole.CUSTOMER_SERVICE,
    enums.UserRole.TUTOR,
    enums.UserRole.STUDENT
  ),
  notificationController.getNotificationsByUser
);

notificationRoute.get(
  '/:idNotification',
  permissions.requireLogin,
  permissions.checkPermissions(
    enums.UserRole.ADMIN,
    enums.UserRole.CUSTOMER_SERVICE,
    enums.UserRole.TUTOR,
    enums.UserRole.STUDENT
  ),
  notificationController.getNotificationsById
);

module.exports = notificationRoute;
