const express = require('express');
const { requireLogin, checkPermissions, checkLogin } = require('../middleware/permission');
const scheduleRoute = express.Router();
const enums = require('../constants/enum');

const studentController = require('../controllers/student');
const tutorAvailableScheduleController = require('../controllers/tutorAvailableSchedule');

scheduleRoute.get(
  '/detail-schedule?',
  requireLogin,
  checkPermissions(enums.UserRole.ADMIN, enums.UserRole.TUTOR, enums.UserRole.CUSTOMER_SERVICE, enums.UserRole.STUDENT),
  studentController.getDetailSchedule
);

scheduleRoute.post(
  '/tutor-available-schedule',
  requireLogin,
  tutorAvailableScheduleController.createTutorAvailableSchedule
);

scheduleRoute.get(
  '/tutor-available-schedule?',
  checkLogin,
  tutorAvailableScheduleController.getTutorAvailableSchedules
);

scheduleRoute.delete(
  '/tutor-available-schedule?',
  requireLogin,
  checkPermissions(enums.UserRole.TUTOR),
  tutorAvailableScheduleController.deleteTutorAvailableSchedules
);
module.exports = scheduleRoute;
