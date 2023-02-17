const express = require('express');
const courseRoute = express.Router();

const courseController = require('../controllers/course');
const gcpBucket = require('../helper/gcpBucket');
const permissions = require('../middleware/permission');
const enums = require('../constants/enum');

courseRoute.post(
  '/',
  gcpBucket.multer.fields([
    {
      name: 'avatarUrl',
      maxCount: 1,
    },
    {
      name: 'documentsUrl',
    },
  ]),
  permissions.requireLogin,
  permissions.checkPermissions(enums.UserRole.ADMIN),
  courseController.createCourse
);

courseRoute.put(
  '/:courseId',
  gcpBucket.multer.fields([
    {
      name: 'avatarUrl',
    },
    {
      name: 'documentsUrl',
    },
  ]),
  permissions.requireLogin,
  permissions.checkPermissions(enums.UserRole.ADMIN),
  courseController.updateCourse
);

courseRoute.get(
  '/?',
  permissions.requireLogin,
  permissions.checkPermissions(enums.UserRole.ADMIN, enums.UserRole.CUSTOMER_SERVICE),
  courseController.getAllCourses
);

courseRoute.get('/by-student?', permissions.checkLogin, courseController.getAllCoursesByStudent);

courseRoute.get('/:courseId/by-student', courseController.getDetailCourseByStudent);

courseRoute.get(
  '/:courseId',
  permissions.requireLogin,
  permissions.checkPermissions(enums.UserRole.ADMIN, enums.UserRole.CUSTOMER_SERVICE, enums.UserRole.TUTOR),
  courseController.getCourseById
);

courseRoute.put(
  '/:courseId/active',
  permissions.requireLogin,
  permissions.checkPermissions(enums.UserRole.ADMIN),
  courseController.activeCourse
);

courseRoute.delete(
  '/:courseId',
  permissions.requireLogin,
  permissions.checkPermissions(enums.UserRole.ADMIN),
  courseController.deleteCourseById
);

module.exports = courseRoute;
