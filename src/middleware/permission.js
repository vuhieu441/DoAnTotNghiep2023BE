const httpResponses = require('../utils/httpResponses');
const logger = require('../utils/logger');
const authService = require('../services/auth');
const studentService = require('../services/student');
const tutorService = require('../services/tutor');
const userService = require('../services/user');
const enums = require('../constants/enum');

const requireLogin = async (req, res, next) => {
  try {
    if (req.headers.authorization) {
      const token = req.headers.authorization.split(' ')[1];

      const user = authService.verifyToken(token);
      logger.info(`[requireLogin]: user -> ${JSON.stringify(user)}`);

      const admin = await userService.getAllAdmin();
      logger.debug(`[login]: Admin -> ${httpResponses.SUCCESS}`);

      req.session.user = user;
      switch (user.role) {
        case enums.UserRole.STUDENT:
          const student = await studentService.getByUserId(user._id);
          if (!student) {
            logger.debug(`[requireLogin]: find student by user id -> ${httpResponses.STUDENT_NOT_FOUND}`);
            return res.status(httpResponses.HTTP_STATUS_UNAUTHORIZED).json({
              success: false,
              message: `${httpResponses.STUDENT_NOT_FOUND}`,
            });
          }

          if (student.isBlock) {
            return res.status(httpResponses.HTTP_STATUS_UNAUTHORIZED).json({
              success: false,
              message: `${httpResponses.USER_BLOCKED}`,
              data: {
                email: admin.email,
                phoneNumber: admin.phoneNumber,
              },
            });
          }

          req.session.student = student;
          break;
        case enums.UserRole.TUTOR:
          const tutor = await tutorService.getTutor({ user: user._id });
          if (!tutor) {
            logger.debug(`[requireLogin]: find student by user id -> ${httpResponses.TUTOR_NOT_FOUND}`);
            return res.status(httpResponses.HTTP_STATUS_UNAUTHORIZED).json({
              success: false,
              message: `${httpResponses.TUTOR_NOT_FOUND}`,
            });
          }

          if (tutor.isBlock) {
            return res.status(httpResponses.HTTP_STATUS_UNAUTHORIZED).json({
              success: false,
              message: `${httpResponses.USER_BLOCKED}`,
              data: {
                email: admin.email,
                phoneNumber: admin.phoneNumber,
              },
            });
          }

          req.session.tutor = tutor;
          break;
        default:
          break;
      }
      logger.info(`[RequireLogin]: ${JSON.stringify(user)}`);
      next();
    } else {
      logger.debug(`[RequireLogin]: error -> ${httpResponses.UNAUTHORIZED}`);
      return res.status(httpResponses.HTTP_STATUS_UNAUTHORIZED).json({
        success: false,
        message: `${httpResponses.UNAUTHORIZED}`,
      });
    }
  } catch (error) {
    logger.error(`[RequireLogin]: error -> ${error.message}`);
    return res
      .status(httpResponses.HTTP_STATUS_INTERNAL_ERROR)
      .json({ success: false, message: `Error: ${error.message}` });
  }
};

const checkPermissions = (...roles) => {
  return (req, res, next) => {
    try {
      const user = req.session.user;
      logger.info(`[checkPermissions]: userId -> ${user._id}`);
      if (Array.isArray(roles) && roles.includes(user.role)) {
        logger.debug(`[checkPermissions]: ${httpResponses.CAN_GET_ACCESS}`);
        return next();
      }
      logger.debug(`[checkPermissions]: error -> ${httpResponses.PERMISSION_DENIED}`);
      return res
        .status(httpResponses.HTTP_STATUS_UNAUTHORIZED)
        .json({ success: false, message: `Error: ${httpResponses.PERMISSION_DENIED}` });
    } catch (err) {
      logger.error(`[checkPermissions]: error -> ${err.message}`);
      res.status(httpResponses.HTTP_STATUS_INTERNAL_ERROR).json({ success: false, message: `Error: ${err.message}` });
    }
  };
};

const checkLogin = async (req, res, next) => {
  try {
    if (req.headers.authorization) {
      const token = req.headers.authorization.split(' ')[1];

      const user = authService.verifyToken(token);
      logger.info(`[checkLogin]: user -> ${JSON.stringify(user)}`);

      req.session.user = user;
      switch (user.role) {
        case enums.UserRole.STUDENT:
          const student = await studentService.getByUserId(user._id);
          if (student) {
            req.session.student = student;
          }

          break;
        case enums.UserRole.TUTOR:
          const tutor = await tutorService.getTutor({ user: user._id });
          if (tutor) {
            req.session.tutor = tutor;
          }
          break;
        default:
          break;
      }
      logger.info(`[checkLogin]: ${JSON.stringify(user)}`);
      next();
    } else {
      logger.debug(`[checkLogin]: not token -> ${httpResponses.SUCCESS}`);
      next();
    }
  } catch (error) {
    logger.error(`[checkLogin]: error -> ${error.message}`);
    return res
      .status(httpResponses.HTTP_STATUS_INTERNAL_ERROR)
      .json({ success: false, message: `Error: ${error.message}` });
  }
};

module.exports = {
  checkPermissions,
  requireLogin,
  checkLogin,
};
