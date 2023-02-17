const express = require('express');
const leaveNoticeRoute = express.Router();

const leaveNoticeController = require('../controllers/leaveNotice');
const permissions = require('../middleware/permission');
const enums = require('../constants/enum');

leaveNoticeRoute.post(
  '/',
  permissions.requireLogin,
  permissions.checkPermissions(enums.UserRole.TUTOR, enums.UserRole.STUDENT),
  leaveNoticeController.createLeaveNotice
);

module.exports = leaveNoticeRoute;
