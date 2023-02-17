const express = require('express');
const enums = require('../constants/enum');
const flexibleLessonRoute = express.Router();

// Middleware
const { requireLogin, checkPermissions, checkLogin } = require('../middleware/permission');

const flexibleLessonController = require('../controllers/flexibleLesson');

flexibleLessonRoute.post(
  '/',
  requireLogin,
  checkPermissions(enums.UserRole.STUDENT),
  flexibleLessonController.createFlexibleLesson
);

flexibleLessonRoute.get(
  '/',
  requireLogin,
  checkPermissions(enums.UserRole.STUDENT, enums.UserRole.CUSTOMER_SERVICE, enums.UserRole.TUTOR, enums.UserRole.ADMIN),
  flexibleLessonController.getAllFlexibleLessons
);

module.exports = flexibleLessonRoute;
