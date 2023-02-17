const express = require('express');
const lessonRoute = express.Router();

const lessonController = require('../controllers/lesson');
const enums = require('../constants/enum');
const permissions = require('../middleware/permission');
const gcpBucket = require('../helper/gcpBucket');

lessonRoute.post(
  '/flexible',
  permissions.requireLogin,
  permissions.checkPermissions(enums.UserRole.TUTOR),
  gcpBucket.multer.fields([
    {
      name: 'imageUrl',
      maxCount: 1,
    },
    {
      name: 'documentsUrl',
    },
  ]),
  lessonController.createFlexibleLesson
);

lessonRoute.get('/flexible/by-student?', lessonController.getAllFlexibleLessonsByStudent);

lessonRoute.get(
  '/flexible?',
  permissions.requireLogin,
  permissions.checkPermissions(enums.UserRole.ADMIN, enums.UserRole.CUSTOMER_SERVICE),
  lessonController.getAllFlexibleLessons
);

lessonRoute.get('/flexible/:flexibleLessonId', lessonController.getDetailFlexibleLesson);

module.exports = lessonRoute;
