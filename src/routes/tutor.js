const express = require('express');
const tutorRoute = express.Router();
const permissions = require('../middleware/permission');
const enums = require('../constants/enum');
const tutorController = require('../controllers/tutor');
const gcpBucket = require('../helper/gcpBucket');

tutorRoute.post(
  '/',
  permissions.requireLogin,
  permissions.checkPermissions(enums.UserRole.ADMIN),
  gcpBucket.multer.fields([
    {
      name: 'cersUrl',
    },
  ]),
  tutorController.createTutor
);

tutorRoute.post(
  '/:_id/mail',
  permissions.requireLogin,
  permissions.checkPermissions(enums.UserRole.ADMIN),
  tutorController.sendMailForTutor
);

tutorRoute.get('/by-student', tutorController.getAllTutorsByStudent);

tutorRoute.get(
  '/students-taught',
  permissions.requireLogin,
  permissions.checkPermissions(enums.UserRole.TUTOR),
  tutorController.getStudentTaught
);

tutorRoute.get(
  '/profile',
  permissions.requireLogin,
  permissions.checkPermissions(enums.UserRole.TUTOR),
  tutorController.getProfileTutor
);

tutorRoute.get(
  '/fixed-taught',
  permissions.requireLogin,
  permissions.checkPermissions(enums.UserRole.TUTOR),
  tutorController.getFixedTaughtByTutor
);

tutorRoute.get(
  '/:_id/export-pdf',
  permissions.requireLogin,
  permissions.checkPermissions(enums.UserRole.ADMIN),
  tutorController.exportPdf
);

tutorRoute.post('/registers', tutorController.register);

tutorRoute.get(
  '/registers',
  permissions.requireLogin,
  permissions.checkPermissions(enums.UserRole.ADMIN),
  tutorController.getAllRegister
);

tutorRoute.put(
  '/registers/:tutorRegisterId',
  permissions.requireLogin,
  permissions.checkPermissions(enums.UserRole.ADMIN),
  tutorController.updateTutorRegister
);

tutorRoute.get(
  '/dash-board',
  permissions.requireLogin,
  permissions.checkPermissions(enums.UserRole.TUTOR),
  tutorController.dashboardTutor
);

tutorRoute.get(
  '/flex-taught',
  permissions.requireLogin,
  permissions.checkPermissions(enums.UserRole.TUTOR),
  tutorController.getFlexTaughtByTutor
);

tutorRoute.get('/:_id/schedule/by-student', tutorController.getScheduleAvailableOfTutor);

tutorRoute.get('/:_id/by-student?', tutorController.getTutorByIdByStudent);

tutorRoute.get(
  '/schedule?',
  permissions.requireLogin,
  permissions.checkPermissions(enums.UserRole.TUTOR),
  tutorController.getScheduleByTutor
);

tutorRoute.get(
  '/:_id/schedule?',
  permissions.requireLogin,
  permissions.checkPermissions(enums.UserRole.ADMIN, enums.UserRole.CUSTOMER_SERVICE),
  tutorController.getScheduleByTutorId
);

tutorRoute.get(
  '/?',
  permissions.requireLogin,
  permissions.checkPermissions(enums.UserRole.ADMIN, enums.UserRole.CUSTOMER_SERVICE),
  tutorController.getAllTutors
);

tutorRoute.get(
  '/:_id',
  permissions.requireLogin,
  permissions.checkPermissions(enums.UserRole.ADMIN, enums.UserRole.CUSTOMER_SERVICE),
  tutorController.getTutorById
);

tutorRoute.put(
  '/:_id/blocking',
  permissions.requireLogin,
  permissions.checkPermissions(enums.UserRole.ADMIN),
  tutorController.blockTutor
);

tutorRoute.put(
  '/:_id/certificate',
  permissions.requireLogin,
  permissions.checkPermissions(enums.UserRole.TUTOR),
  gcpBucket.multer.fields([
    {
      name: 'cerUrls',
    },
  ]),
  tutorController.updateTutorCertificate
);

tutorRoute.post(
  '/certificate',
  permissions.requireLogin,
  permissions.checkPermissions(enums.UserRole.TUTOR),
  gcpBucket.multer.single('cerUrl'),
  tutorController.createCertificate
);

tutorRoute.put(
  '/certificate/:idCertificate',
  permissions.requireLogin,
  permissions.checkPermissions(enums.UserRole.TUTOR, enums.UserRole.ADMIN),
  gcpBucket.multer.fields([
    {
      name: 'cerUrl',
    },
  ]),
  tutorController.updateCertificate
);

tutorRoute.delete(
  '/certificate/:_certificateId',
  permissions.requireLogin,
  permissions.checkPermissions(enums.UserRole.TUTOR),
  tutorController.deleteTutorCertificate
);

tutorRoute.post(
  '/:idTutor/certificate',
  permissions.requireLogin,
  permissions.checkPermissions(enums.UserRole.ADMIN),
  gcpBucket.multer.single('cerUrl'),
  tutorController.createCertificateByAdmin
);

tutorRoute.delete(
  '/:idTutor/certificate/:idCertificate',
  permissions.requireLogin,
  permissions.checkPermissions(enums.UserRole.ADMIN),
  tutorController.deleteCertificateByAdmin
);

tutorRoute.put(
  '/:_id',
  permissions.requireLogin,
  permissions.checkPermissions(enums.UserRole.ADMIN, enums.UserRole.TUTOR),
  gcpBucket.multer.fields([
    {
      name: 'avatarUrl',
    },
  ]),
  tutorController.updateTutor
);

tutorRoute.delete(
  '/:_id',
  permissions.requireLogin,
  permissions.checkPermissions(enums.UserRole.ADMIN),
  tutorController.deleteTutor
);

tutorRoute.get(
  '/:idTutor/certificate',
  permissions.requireLogin,
  permissions.checkPermissions(enums.UserRole.ADMIN),
  tutorController.getCertificateOfTutor
);

module.exports = tutorRoute;
