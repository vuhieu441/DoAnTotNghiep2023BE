const logger = require('../utils/logger');
const httpResponses = require('../utils/httpResponses');
const { UserRole } = require('../constants/enum');
const constants = require('../constants/constants');

// Service
const userService = require('../services/user');
const authService = require('../services/auth');
const securityService = require('../services/security');
const studentService = require('../services/student');
const tutorService = require('../services/tutor');
const staffService = require('../services/staff');
const verifyCodeService = require('../services/verifyCode');
const walletService = require('../services/wallet');

const { v4 } = require('uuid');
const gcpBucket = require('../helper/gcpBucket');
const enums = require('../constants/enum');
const template = require('../helper/template');
const mailer = require('../helper/mailer');
const helper = require('../helper/helperFunction');

/**
 * Get all tutors
 * @param {*} req
 * @param {*} res
 * @returns
 */
const getAllTutors = async (req, res) => {
  try {
    logger.info(`[getAllTutors]`);

    const tutors = await tutorService.getAllTutors();

    return res.status(httpResponses.HTTP_STATUS_OK).json({
      success: true,
      message: `${httpResponses.SUCCESS}`,
      data: {
        tutors: tutors,
      },
    });
  } catch (err) {
    logger.error(`[getAllTutors] error -> ${err.message}`);
    res.status(httpResponses.HTTP_STATUS_INTERNAL_ERROR).json({
      success: false,
      message: `${err.message}`,
    });
  }
};

//#region login
/**
 * Login
 * @param {*} req
 * @param {*} res
 * @returns
 */
const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    logger.info(`[login]: req -> ${JSON.stringify(req.body)}`);

    const filter = {
      email: email.toLowerCase(),
    };

    const existedUser = await userService.getUser(filter);
    if (!existedUser) {
      logger.debug(`[login] getUser -> ${httpResponses.USER_NOT_FOUND}`);
      return res.status(httpResponses.HTTP_STATUS_NOT_FOUND).json({
        success: false,
        message: `${httpResponses.USER_NOT_FOUND}`,
      });
    }
    const isComparedPassword = securityService.comparePassword(password, existedUser.password);
    if (!isComparedPassword) {
      logger.debug(`[login]: comparePassword -> ${httpResponses.ERROR_PASSWORD_INCORRECT}`);
      return res.status(httpResponses.HTTP_STATUS_BAD_REQUEST).json({
        success: false,
        message: `${httpResponses.ERROR_PASSWORD_INCORRECT}`,
      });
    }

    logger.debug(`[login]: comparePassword -> ${httpResponses.SUCCESS}`);

    if (existedUser.role == enums.UserRole.STUDENT && !existedUser.isConfirm) {
      logger.debug(`[login] getUser -> ${httpResponses.USER_NOT_CONFIRM}`);
      return res.status(httpResponses.HTTP_STATUS_BAD_REQUEST).json({
        success: false,
        message: `${httpResponses.USER_NOT_CONFIRM}`,
      });
    }
    logger.debug(`[login] getUser -> ${httpResponses.SUCCESS}`);

    let user = {
      _id: existedUser._id,
      role: existedUser.role,
      push: existedUser.push,
      email: existedUser.email,
    };

    const token = authService.generateToken({ _id: existedUser._id, role: existedUser.role });
    logger.debug(`[login]: generateToken -> ${httpResponses.SUCCESS}`);

    const admin = await userService.getAllAdmin();
    logger.debug(`[login]: Admin -> ${httpResponses.SUCCESS}`);

    switch (user.role) {
      case UserRole.ADMIN:
      case UserRole.CUSTOMER_SERVICE:
        const existedStaff = await staffService.getStaff({ user: user._id });
        if (!existedStaff) {
          logger.debug(`[login] getStaff -> ${httpResponses.STAFF_NOT_FOUND}`);
          return res.status(httpResponses.HTTP_STATUS_NOT_FOUND).json({
            success: false,
            message: `${httpResponses.STAFF_NOT_FOUND}`,
          });
        }
        user = {
          ...user,
          firstName: existedStaff.firstName,
          lastName: existedStaff.lastName,
        };
        // Do nothing here for now
        break;
      case UserRole.STUDENT:
        const existedStudent = await studentService.getStudent({ user: user._id });
        if (!existedStudent) {
          logger.debug(`[login] getStudent -> ${httpResponses.STUDENT_NOT_FOUND}`);
          return res.status(httpResponses.HTTP_STATUS_NOT_FOUND).json({
            success: false,
            message: `${httpResponses.STUDENT_NOT_FOUND}`,
          });
        }
        if (existedStudent.isBlock) {
          return res.status(httpResponses.HTTP_STATUS_UNAUTHORIZED).json({
            success: false,
            message: `${httpResponses.USER_BLOCKED}`,
            data: {
              email: admin.email,
              phoneNumber: admin.phoneNumber,
            },
          });
        }

        logger.debug(`[login] getStudent -> ${httpResponses.SUCCESS}`);
        user = {
          ...user,
          firstName: existedStudent.firstName,
          lastName: existedStudent.lastName,
          gender: existedStudent.gender,
          isBlock: existedStudent.isBlock,
        };
        break;
      case UserRole.TUTOR:
        const existedTutor = await tutorService.getTutor({ user: user._id });
        if (!existedTutor) {
          logger.debug(`[login] getTutor -> ${httpResponses.TUTOR_NOT_FOUND}`);
          return res.status(httpResponses.HTTP_STATUS_NOT_FOUND).json({
            success: false,
            message: `${httpResponses.TUTOR_NOT_FOUND}`,
          });
        }
        if (existedTutor.isBlock) {
          return res.status(httpResponses.HTTP_STATUS_UNAUTHORIZED).json({
            success: false,
            message: `${httpResponses.USER_BLOCKED}`,
            data: {
              email: admin.email,
              phoneNumber: admin.phoneNumber,
            },
          });
        }

        logger.debug(`[login] getTutor -> ${httpResponses.SUCCESS}`);
        user = {
          ...user,
          firstName: existedTutor.firstName,
          lastName: existedTutor.lastName,
          gender: existedTutor.gender,
          isBlock: existedTutor.isBlock,
          isOAuthGoogle: existedTutor.isOAuthGoogle,
        };
        break;
      default:
        return res.status(httpResponses.HTTP_STATUS_BAD_REQUEST).json({
          success: false,
          message: `${httpResponses.ROLE_NOT_FOUND}`,
        });
    }

    return res.status(httpResponses.HTTP_STATUS_OK).json({
      success: true,
      message: `${httpResponses.SUCCESS}`,
      data: {
        user: user,
        token: token,
      },
    });
  } catch (err) {
    logger.error(`[login] ${err.message}`);
    return res.internalServer(err.message);
  }
};

//#endregion login

//#region updatePassword
/**
 * Function for update password
 * @param {*} req
 * @param {*} res
 * @return
 */
const updatePassword = async (req, res) => {
  try {
    const user = req.session.user;
    logger.info(`[updatePassword]: user -> ${user._id}`);

    const existedUser = await userService.getUser({ _id: user._id });
    if (!existedUser) {
      logger.debug(`[updatePassword]: getUser -> ${httpResponses.USER_NOT_FOUND}`);
      return res.status(httpResponses.HTTP_STATUS_BAD_REQUEST).json({
        success: false,
        message: `${httpResponses.USER_NOT_FOUND}`,
      });
    }
    logger.debug(`[updatePassword]: getUser -> ${httpResponses.SUCCESS}`);

    const { currentPassword, newPassword } = req.body;
    logger.info(`[updatePassword]: password -> *********`);

    const isComparedPassword = await securityService.comparePassword(currentPassword, existedUser.password);
    if (!isComparedPassword) {
      logger.debug(`[updatePassword]: comparePassword -> ${httpResponses.PASSWORD_INVALID}`);
      return res.badRequest(httpResponses.PASSWORD_INVALID);
    }

    const hashPassword = await securityService.hashPassword(newPassword);
    logger.debug(`[updatePassword]: hashPassword -> ${httpResponses.SUCCESS}`);

    await userService.updateUser(existedUser._id, { password: hashPassword });
    logger.debug(`[updatePassword]: updateUser -> ${httpResponses.SUCCESS}`);

    logger.debug(`[updatePassword]: updatePassword -> ${httpResponses.SUCCESS}`);
    return res.ok(httpResponses.SUCCESS);
  } catch (err) {
    logger.error(`[updatePassword]: ${err.message}`);
    return res.internalServer(err.message);
  }
};
//#endregion updatePassword

//#region getProfile
const getProfile = async (req, res) => {
  try {
    const user = req.session.user;
    logger.info(`[getProfile]: user -> ${user._id}`);

    let profile = {};
    switch (user.role) {
      case enums.UserRole.ADMIN:
        profile = await staffService.getProfileByUserId(user._id);
        break;
      case enums.UserRole.CUSTOMER_SERVICE:
        profile = await staffService.getProfileByUserId(user._id);
        break;
      case enums.UserRole.STUDENT:
        profile = await studentService.getProfileByUserId(user._id);
        break;
      case enums.UserRole.TUTOR:
        const tutor = await tutorService.getProfileByUserId(user._id);
        profile = tutor[0];
        break;
    }

    if (!profile) {
      logger.debug(`[getProfile]: getProfile -> ${httpResponses.USER_NOT_FOUND}`);
      return res.notFound(httpResponses.USER_NOT_FOUND);
    }

    return res.ok(httpResponses.SUCCESS, { profile });
  } catch (err) {
    logger.error(`[getProfile]: ${err.message}`);
    return res.internalServer(err.message);
  }
};
//#endregion getProfile

//#region updateProfile
/**
 * Update Profile
 * @param {*} req
 * @param {*} res
 * @returns
 */
const updateProfile = async (req, res) => {
  try {
    const { user } = req.session;
    const newModel = req.body;

    let avatar, certificatesAvatar;
    if (req.files) {
      avatar = req.files.avatar;
      certificatesAvatar = req.files.certificates;
    }

    logger.info(`[updateProfile]: user -> ${user._id}`);

    if (avatar) {
      const urlGCS = await gcpBucket.sendUploadMultiToGCS(avatar);
      logger.debug(`[updateProfile]: upload avatar -> ${httpResponses.SUCCESS}`);
      newModel.avatarUrl = urlGCS[0];
    }

    if (newModel.email) {
      delete newModel.email;
    }

    switch (user.role) {
      case enums.UserRole.STUDENT:
        newModel.notification && (newModel.notification = helper.jsonToObject(newModel.notification));
        newModel.phoneNumber && (newModel.phoneNumber = helper.jsonToObject(newModel.phoneNumber));

        await Promise.all([
          studentService.updateProfileByUserId(user._id, newModel),
          userService.updateUser(user._id, newModel),
        ]);
        logger.info(`[updateProfile]: update profile -> ${httpResponses.SUCCESS}`);
        break;
      case enums.UserRole.TUTOR:
        const tutor = await tutorService.getTutor({ user: user._id });

        if (tutor.isActive && newModel.videoUrl) {
          delete newModel.videoUrl;
        }

        newModel.notification && (newModel.notification = helper.jsonToObject(newModel.notification));
        newModel.phoneNumber && (newModel.phoneNumber = helper.jsonToObject(newModel.phoneNumber));
        newModel.certificates && (newModel.certificates = helper.jsonToObject(newModel.certificates));

        if (certificatesAvatar) {
          const urlGCP = await gcpBucket.sendUploadMultiToGCS(certificatesAvatar);
          logger.debug(`[updateProfile]: upload certificatesAvatar -> ${httpResponses.SUCCESS}`);

          let index = 0;
          newModel.certificates.forEach((doc) => {
            if (!doc.cerUrl) {
              doc.cerUrl = urlGCP[index];
              index++;
            }
          });
        }

        await Promise.all([
          tutorService.updateTutorByUserId(user._id, newModel),
          userService.updateUser(user._id, newModel),
        ]);
        logger.info(`[updateProfile]: update profile -> ${httpResponses.SUCCESS}`);
        break;
    }
    return res.ok(httpResponses.PROFILE_UPDATED_SUCCESS);
  } catch (err) {
    logger.error(`[updateProfile]: error -> ${err.message}`);
    res.status(httpResponses.HTTP_STATUS_INTERNAL_ERROR).json({
      success: false,
      message: `${err.message}`,
    });
  }
};
//#endregion registerFlexibleLesson

//#region forgotPassword
/**
 * forgot Password
 * @param {*} req
 * @param {*} res
 */
const forgotPassword = async (req, res) => {
  try {
    const { email, returnUrl } = req.query;
    logger.info(`[forgotPassword]: email -> ${email}`);

    const user = await userService.getUserByEmail(email);
    if (!user) {
      logger.debug(`[forgotPassword]: getUserByEmail -> ${httpResponses.USER_NOT_FOUND}`);
      return res.badRequest(httpResponses.USER_NOT_FOUND);
    }

    const code = v4();

    await verifyCodeService.deleteManyVerifyCode({ email });

    await verifyCodeService.createVerifyCode({ email, code });

    const temp = template.sendMailForgotPassword(code, email, constants.FORGOT_PASSWORD, returnUrl);
    const mailSuccess = await mailer.sendGmail(temp);
    if (!mailSuccess.success) {
      return res.status(httpResponses.HTTP_STATUS_INTERNAL_ERROR).json({
        success: false,
        message: `${httpResponses.SEND_MAIL_ERROR}`,
        messageTitle: `${mailSuccess.message}`,
      });
    }

    return res.ok(httpResponses.SUCCESS);
  } catch (err) {
    logger.error(`[forgotPassword]: error -> ${err.message}`);
    res.status(httpResponses.HTTP_STATUS_INTERNAL_ERROR).json({
      success: false,
      message: `${err.message}`,
    });
  }
};
//#endregion forgotPassword

//#region resetPassword
/**
 * Reset password
 * @param {*} req
 * @param {*} res
 */
const resetPassword = async (req, res) => {
  try {
    const { code, newPassword } = req.body;
    logger.info(`[resetPassword]: code -> ${code}`);

    const _verifyCode = await verifyCodeService.getVerifyCode(code);
    if (!_verifyCode) {
      logger.debug(`[resetPassword]: getUserByEmail -> ${httpResponses.CODE_NOT_FOUND}`);
      return res.badRequest(httpResponses.CODE_NOT_FOUND);
    }

    const hours = helper.calculateHour(_verifyCode.createdAt, new Date());
    if (hours > 1) {
      return res.badRequest(httpResponses.LINK_EXPIRE);
    }

    const user = await userService.getUserByEmail(_verifyCode.email);
    if (!user) {
      logger.debug(`[resetPassword]: getUserByEmail -> ${httpResponses.USER_NOT_FOUND}`);
      return res.badRequest(httpResponses.USER_NOT_FOUND);
    }

    const hashPassword = await securityService.hashPassword(newPassword);
    await userService.updateUser(user._id, { password: hashPassword });
    await verifyCodeService.deleteVerifyCode(_verifyCode._id);

    return res.ok(httpResponses.SUCCESS);
  } catch (err) {
    logger.error(`[forgotPassword]: error -> ${err.message}`);
    return res.status(httpResponses.HTTP_STATUS_INTERNAL_ERROR).json({
      success: false,
      message: `${err.message}`,
    });
  }
};
//#endregion resetPassword

/**
 * Send mail with role tutor and student to admin and all customer service
 * @param {*} req
 * @param {*} res
 * @returns
 */
const sendMailForTutorAndStudent = async (req, res) => {
  try {
    const { user } = req.session;
    logger.info(`[sendMailForTutorAndStudent]: userId -> ${user._id}`);

    const emailStudent = await userService.getUserById({ _id: user._id });
    logger.info(`[sendMailForTutorAndStudent]: emailStudent -> ${emailStudent.email}`);

    const { subject, body, type } = req.body;
    logger.info(`[sendMailForTutorAndStudent]: body -> ${JSON.stringify(req.body)}`);

    const admin = await userService.getAdmin({ role: UserRole.ADMIN });
    const customerServiceEmail = await userService.getEmailUser({ role: UserRole.CUSTOMER_SERVICE });

    const multiEmail = [...customerServiceEmail, admin.email];

    customerServiceEmail.map((bcc) => {
      let templateMultiEmail;
      if (type === enums.MailType.SUPPORT) {
        templateMultiEmail = template.sendMultiMailForTypeSupport(admin.email, bcc, subject, body, emailStudent.email);
      } else if (type === enums.MailType.RESPONSE) {
        templateMultiEmail = template.sendMultiMailForTypeResponse(admin.email, bcc, subject, body, emailStudent.email);
      }
      templateMultiEmail && mailer.sendGmail(templateMultiEmail);
    });

    return res.status(httpResponses.HTTP_STATUS_OK).json({
      success: true,
      message: `${httpResponses.SUCCESS}`,
    });
  } catch (err) {
    logger.error(`[sendMailForTutorAndStudent]: error -> ${err.message}`);
    return res.status(httpResponses.HTTP_STATUS_INTERNAL_ERROR).json({
      success: false,
      message: `${err.message}`,
    });
  }
};

/**
 * Send mail with role customer service to student
 * @param {*} req
 * @param {*} res
 * @returns
 */
const sendMailForCustomerService = async (req, res) => {
  try {
    const { user } = req.session;
    logger.info(`[sendMailForCustomerService]: userId -> ${user._id}`);

    const { to, subject, body, type } = req.body;
    logger.info(`[sendMailForCustomerService]: body -> ${JSON.stringify(req.body)}`);

    let templateMultiEmail;
    if (type === enums.MailType.SUPPORT) {
      templateMultiEmail = template.sendMailForCustomerServer(to, subject, body);
    } else if (type === enums.MailType.RESPONSE) {
      templateMultiEmail = template.sendMailForCustomerServer(to, subject, body);
    }
    templateMultiEmail && mailer.sendGmail(templateMultiEmail);

    return res.status(httpResponses.HTTP_STATUS_OK).json({
      success: true,
      message: `${httpResponses.SUCCESS}`,
    });
  } catch (err) {
    logger.error(`[sendMailForCustomerService]: error -> ${err.message}`);
    return res.status(httpResponses.HTTP_STATUS_INTERNAL_ERROR).json({
      success: false,
      message: `${err.message}`,
    });
  }
};
/**
 * Send mail with role customer service to all student
 * @param {*} req
 * @param {*} res
 * @returns
 */
const sendMultiMailForCustomerService = async (req, res) => {
  try {
    const { user } = req.session;
    logger.info(`[sendMultiMailForCustomerService]: userId -> ${user._id}`);

    const { subject, body } = req.body;
    logger.info(`[sendMultiMailForCustomerService]: body -> ${JSON.stringify(req.body)}`);

    const studentEmail = await userService.getStudents({ role: UserRole.STUDENT });

    studentEmail.map((e) => {
      let templateMultiEmail = template.sendMultiMailForCustomerService(e.email, subject, body);
      templateMultiEmail && mailer.sendGmail(templateMultiEmail);
    });
    return res.status(httpResponses.HTTP_STATUS_OK).json({
      success: true,
      message: `${httpResponses.SUCCESS}`,
    });
  } catch (err) {
    logger.error(`[sendMultiMailForCustomerService]: error -> ${err.message}`);
    return res.status(httpResponses.HTTP_STATUS_INTERNAL_ERROR).json({
      success: false,
      message: `${err.message}`,
    });
  }
};

/**
 * Confirm user
 * @param {*} req
 * @param {*} res
 * @returns
 */
const confirmUser = async (req, res) => {
  try {
    const { confirmToken } = req.query;
    logger.info(`[confirmUser] confirmToken -> ${confirmToken}`);
    const payload = authService.verifyToken(confirmToken);
    if (!payload) {
      logger.debug(`[confirmUser] token -> ${httpResponses.TOKEN_INVALID}`);
      return res.notFound(httpResponses.TOKEN_INVALID);
    }

    const { _id, redirectUrl } = payload;
    const user = await userService.getUser({ _id: _id });
    if (!user) {
      logger.debug(`[confirmUser]  -> ${httpResponses.LINK_CONFIRM_DEAD}`);
      return res.badRequest(httpResponses.LINK_CONFIRM_DEAD);
    }
    await userService.updateUser(_id, { isConfirm: true });
    logger.debug(`[confirmUser]  -> ${httpResponses.HTTP_STATUS_OK}`);

    return res.status(httpResponses.HTTP_STATUS_OK).redirect(redirectUrl);
  } catch (err) {
    logger.error(`[confirmUser]: error -> ${err.message}`);
    return res.status(httpResponses.HTTP_STATUS_INTERNAL_ERROR).json({
      success: false,
      message: `${err.message}`,
    });
  }
};

module.exports = {
  getAllTutors,
  login,
  updatePassword,
  getProfile,
  updateProfile,
  forgotPassword,
  resetPassword,
  sendMailForTutorAndStudent,
  confirmUser,
  sendMailForCustomerService,
  sendMultiMailForCustomerService,
};
