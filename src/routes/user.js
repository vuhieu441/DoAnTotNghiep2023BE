const express = require('express');

const userRoute = express.Router();

// Middleware
const { requireLogin } = require('../middleware/permission');
const gcpBucket = require('../helper/gcpBucket');

const userController = require('../controllers/user');

userRoute.post('/login', userController.login);

userRoute.post('/send-mail', requireLogin, userController.sendMailForTutorAndStudent);

userRoute.post('/send-mail-student', requireLogin, userController.sendMailForCustomerService);

userRoute.post('/send-mail-all', requireLogin, userController.sendMultiMailForCustomerService);

userRoute.put('/password', requireLogin, userController.updatePassword);

userRoute.get('/profile', requireLogin, userController.getProfile);

userRoute.get('/password/forgot', userController.forgotPassword);

userRoute.get('/confirm', userController.confirmUser);

userRoute.put('/password/reset', userController.resetPassword);

userRoute.put(
  '/profile',
  requireLogin,
  gcpBucket.multer.fields([
    {
      name: 'avatar',
      maxCount: 1,
    },
    {
      name: 'certificatesAvatar',
    },
  ]),
  userController.updateProfile
);

module.exports = userRoute;
