const express = require('express');
const permissions = require('../middleware/permission');
const enums = require('../constants/enum');
const staffRoute = express.Router();
const gcpBucket = require('../helper/gcpBucket');

// Middleware
const staffController = require('../controllers/staff');

staffRoute.post(
  '/',
  permissions.requireLogin,
  permissions.checkPermissions(enums.UserRole.ADMIN),
  staffController.createStaff
);

staffRoute.get('/profile', permissions.requireLogin, staffController.getProfileStaff);

staffRoute.get(
  '/admin/dash-board',
  permissions.requireLogin,
  permissions.checkPermissions(enums.UserRole.ADMIN, enums.UserRole.CUSTOMER_SERVICE),
  staffController.dashboardAdmin
);

staffRoute.get(
  '/customer-service/dash-board',
  permissions.requireLogin,
  permissions.checkPermissions(enums.UserRole.CUSTOMER_SERVICE),
  staffController.dashboardCustomerService
);

staffRoute.get(
  '/notifications',
  permissions.requireLogin,
  permissions.checkPermissions(
    enums.UserRole.ADMIN,
    enums.UserRole.CUSTOMER_SERVICE,
    enums.UserRole.TUTOR,
    enums.UserRole.STUDENT
  ),
  staffController.getNotifications
);

staffRoute.get(
  '/notificationsByStudent',
  permissions.requireLogin,
  permissions.checkPermissions(enums.UserRole.STUDENT, enums.UserRole.CUSTOMER_SERVICE, enums.UserRole.TUTOR),
  staffController.getNotificationsByStudent
);

staffRoute.get(
  '/notificationsByTutor',
  permissions.requireLogin,
  permissions.checkPermissions(enums.UserRole.TUTOR, enums.UserRole.CUSTOMER_SERVICE),
  staffController.getNotificationsByTutor
);

staffRoute.get(
  '/?',
  permissions.requireLogin,
  permissions.checkPermissions(enums.UserRole.ADMIN),
  staffController.getAllStaffs
);

staffRoute.get(
  '/:_id',
  permissions.requireLogin,
  permissions.checkPermissions(enums.UserRole.ADMIN),
  staffController.getDetailStaff
);

staffRoute.put(
  '/:_id',
  permissions.requireLogin,
  permissions.checkPermissions(enums.UserRole.ADMIN, enums.UserRole.CUSTOMER_SERVICE),
  gcpBucket.multer.fields([
    {
      name: 'avatar',
    },
  ]),
  staffController.updateProfile
);

staffRoute.put(
  '/:_id/password',
  permissions.requireLogin,
  permissions.checkPermissions(enums.UserRole.ADMIN, enums.UserRole.CUSTOMER_SERVICE),
  staffController.updatePassword
);

staffRoute.delete(
  '/:_id',
  permissions.requireLogin,
  permissions.checkPermissions(enums.UserRole.ADMIN),
  staffController.deleteStaff
);

module.exports = staffRoute;
