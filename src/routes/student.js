const express = require('express');
const studentRoute = express.Router();

const studentController = require('../controllers/student');
const enums = require('../constants/enum');
const permissions = require('../middleware/permission');

studentRoute.post('/register', studentController.createStudentUser);

studentRoute.get(
  '/?',
  permissions.requireLogin,
  permissions.checkPermissions(enums.UserRole.ADMIN, enums.UserRole.CUSTOMER_SERVICE),
  studentController.getAllStudents
);

studentRoute.put(
  '/:_id/blocking',
  permissions.requireLogin,
  permissions.checkPermissions(enums.UserRole.ADMIN),
  studentController.blockStudent
);

studentRoute.get(
  '/schedule?',
  permissions.requireLogin,
  permissions.checkPermissions(enums.UserRole.STUDENT),
  studentController.getScheduleStudent
);

studentRoute.get(
  '/:studentId/schedule?',
  permissions.requireLogin,
  permissions.checkPermissions(enums.UserRole.ADMIN, enums.UserRole.CUSTOMER_SERVICE),
  studentController.getScheduleStudent
);

studentRoute.get(
  '/tutors-learned',
  permissions.requireLogin,
  permissions.checkPermissions(enums.UserRole.STUDENT),
  studentController.getTutorsLearned
);

studentRoute.post(
  '/register-course',
  permissions.requireLogin,
  permissions.checkPermissions(enums.UserRole.STUDENT),
  studentController.registerCourse
);

studentRoute.post(
  '/register-flexible-lesson',
  permissions.requireLogin,
  permissions.checkPermissions(enums.UserRole.STUDENT),
  studentController.registerFlexibleLesson
);

studentRoute.post(
  '/payment',
  permissions.requireLogin,
  permissions.checkPermissions(enums.UserRole.STUDENT),
  studentController.payment
);

studentRoute.get(
  '/course-registered',
  permissions.requireLogin,
  permissions.checkPermissions(enums.UserRole.STUDENT),
  studentController.getCourseRegistered
);

studentRoute.get(
  '/:_id',
  permissions.requireLogin,
  permissions.checkPermissions(enums.UserRole.ADMIN, enums.UserRole.CUSTOMER_SERVICE),
  studentController.getDetailStudent
);

module.exports = studentRoute;
