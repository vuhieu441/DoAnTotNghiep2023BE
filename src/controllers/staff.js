const logger = require('../utils/logger');
const httpResponses = require('../utils/httpResponses');
const { UserRole } = require('../constants/enum');
const constants = require('../constants/constants');
const gcpBucket = require('../helper/gcpBucket');
const helper = require('../helper/helperFunction');

// Service
const staffService = require('../services/staff');
const userService = require('../services/user');
const securityService = require('../services/security');
const tutorService = require('../services/tutor');
const studentService = require('../services/student');
const flexibleLessonService = require('../services/flexibleLesson');
const courseService = require('../services/course');
const notifyUserService = require('../services/notifyUsers');

const moment = require('moment');
const helpFunctions = require('../helper/helperFunction');
const { checkGmail } = require('../helper/mailer');
const enums = require('../constants/enum');
const emailCheck = require('email-check');
const template = require('../helper/template');
const mailer = require('../helper/mailer');
const randomString = require('randomstring');

//#region createStaff
/**
 * Create Staff
 * // @TODO this is still in progress
 * @param {*} req
 * @param {*} res
 * @returns
 */
const createStaff = async (req, res) => {
  try {
    const { email, lastName, firstName, phoneNumber, avatarUrl, dob, gender, role } = req.body;
    logger.info(`[createStaff] req -> ${JSON.stringify(req.body)}`);

    const existedUser = await userService.getUserByEmail(email);
    if (existedUser) {
      logger.debug(`[createStaff]: ${email} email -> ${httpResponses.USER_EXISTED}`);
      return res.status(httpResponses.HTTP_STATUS_BAD_REQUEST).json({
        success: false,
        message: `${httpResponses.USER_EXISTED}`,
      });
    }

    const password = randomString.generate(10);
    const hashPassword = await securityService.hashPassword(password);
    const newUser = {
      email: email,
      password: hashPassword,
      role: role ?? UserRole.CUSTOMER_SERVICE,
    };
    const user = await userService.createUser(newUser);

    let templateMultiEmail = template.sendMailPassWordToCustomerServer(email, password);

    templateMultiEmail && mailer.sendGmail(templateMultiEmail);

    const newStaff = {
      lastName: lastName,
      firstName: firstName,
      user: user._id,
      phoneNumber: phoneNumber,
      avatarUrl: avatarUrl,
      email: email,
      dob: dob,
      gender: gender,
    };
    await staffService.createStaff(newStaff);

    logger.debug(`[createStaff]: ${httpResponses.STAFF_CREATED_SUCCESSFULLY}`);
    return res.status(httpResponses.HTTP_STATUS_CREATED).json({
      success: true,
      message: `${httpResponses.STAFF_CREATED_SUCCESSFULLY}`,
    });
  } catch (err) {
    logger.error(`[createStaff] error -> ${err.message}`);
    res.status(httpResponses.HTTP_STATUS_INTERNAL_ERROR).json({
      success: false,
      message: `${err.message}`,
    });
  }
};
//#endregion createStaff

/**
 * Get all staffs
 * @param {*} req
 * @param {*} res
 * @returns
 */
const getAllStaffs = async (req, res) => {
  try {
    const { _page, _limit, _textSearch } = req.query;
    logger.info(`[getAllStaffs]: query -> ${JSON.stringify(req.query)}`);

    const pagination = {
      _page: +_page || constants.PAGINATION_DEFAULT_PAGE,
      _limit: +_limit || constants.PAGINATION_DEFAULT_LIMIT,
    };

    if (_page < 1 || _limit < 0) {
      logger.debug(`[getAllStaffs]: ${httpResponses.QUERY_NEGATIVE}`);
      return res.badRequest(httpResponses.QUERY_NEGATIVE);
    }

    const [{ staffs, count }, total] = await Promise.all([
      staffService.getAllStaff(_textSearch, pagination),
      staffService.countStaffs({}),
    ]);

    return res.ok(`${httpResponses.SUCCESS}`, {
      staffs: staffs,
      pagination: {
        ...pagination,
        _total: count,
      },
      total,
    });
  } catch (err) {
    logger.error(`[getAllStaffs]: error -> ${err.message}`);
    res.internalServer(`${err.message}`);
  }
};

/**
 * Update Profile
 * @param {*} req
 * @param {*} res
 */
const updateProfile = async (req, res) => {
  try {
    const user = req.session.user;
    logger.info(`[updateProfile]: userId -> ${JSON.stringify(user._id)}`);

    const { _id } = req.params;
    logger.info(`[updateProfile]: _staffId -> ${JSON.stringify(_id)}`);

    const dataUpdate = req.body;
    if (dataUpdate.email) {
      delete dataUpdate.email;
    }
    logger.info(`[updateProfile]: req -> ${JSON.stringify(req.body)}`);

    //convert phoneNumber
    dataUpdate.phoneNumber && (dataUpdate.phoneNumber = helper.jsonToObject(dataUpdate.phoneNumber));

    const currentStaff = await staffService.getStaff({ _id: _id });
    if (!currentStaff) {
      logger.debug(`[updateProfile]: -> ${httpResponses.STAFF_NOT_FOUND}`);
      return res.status(httpResponses.HTTP_STATUS_NOT_FOUND).json({
        success: false,
        message: `${httpResponses.STAFF_NOT_FOUND}`,
      });
    }

    const existedUser = await userService.getUser({ _id: currentStaff.user });
    if (!existedUser) {
      logger.debug(`[updateProfile]: -> ${httpResponses.USER_NOT_FOUND}`);
      return res.notFound(httpResponses.USER_NOT_FOUND);
    }

    const { avatar } = req.files;
    if (avatar) {
      const urlGCS = await gcpBucket.sendUploadMultiToGCS(avatar);

      logger.debug(`[updateProfile]: upload avatar -> ${httpResponses.SUCCESS}`);
      dataUpdate.avatarUrl = urlGCS[0];
    }

    await staffService.updateStaff(currentStaff._id, dataUpdate);
    logger.debug(`[updateStaff]: -> ${httpResponses.SUCCESS}`);

    logger.debug(`[updateProfile]: ${httpResponses.STAFF_UPDATED_SUCCESSFULLY}`);
    return res.status(httpResponses.HTTP_STATUS_OK).json({
      success: true,
      message: `${httpResponses.STAFF_UPDATED_SUCCESSFULLY}`,
    });
  } catch (err) {
    logger.error(`[updateProfile] error -> ${err.message}`);
    return res.status(httpResponses.HTTP_STATUS_INTERNAL_ERROR).json({
      success: false,
      message: `${err.message}`,
    });
  }
};

const updatePassword = async (req, res) => {
  try {
    const user = req.session.user;

    logger.info(`[updatePassword]: user -> ${JSON.stringify(user)}`);
    const { _id } = req.params;

    const { currentPassword, newPassword, email } = req.body;

    logger.info(`[updatePassword]: req -> ${JSON.stringify(req.body)}`);

    const currentUser = await staffService.getStaff({ _id: _id });
    if (!currentUser) {
      logger.debug(`[updatePassword]: -> ${httpResponses.USER_NOT_FOUND}`);
      return res.notFound(httpResponses.USER_NOT_FOUND);
    }

    const existedUser = await userService.getUserByEmail(email);

    const checkRole =
      existedUser.role === enums.UserRole.CUSTOMER_SERVICE && user._id.toString() === existedUser._id.toString();

    if (checkRole || user.role === enums.UserRole.ADMIN) {
      if (existedUser && currentUser.user.toString() !== existedUser._id.toString()) {
        logger.debug(`[updatePassword]: ${email} email -> ${httpResponses.USER_EXISTED}`);
        return res.badRequest(`${httpResponses.USER_EXISTED}`);
      }

      const isMatchPassword = await securityService.comparePassword(currentPassword, existedUser.password);

      if (!isMatchPassword) {
        logger.debug(`[updatePassword]: comparePassword -> ${httpResponses.PASSWORD_INCORRECT}`);
        return res.status(httpResponses.HTTP_STATUS_BAD_REQUEST).json({
          success: false,
          message: `${httpResponses.PASSWORD_INCORRECT}`,
        });
      }

      if (!newPassword) {
        return res.badRequest(httpResponses.ERROR_NOT_NEW_PASSWORD);
      }

      const hashPassword = await securityService.hashPassword(newPassword);
      const updateUser = {
        password: hashPassword,
      };

      await userService.updateUser(currentUser.user, updateUser);

      logger.debug(`[updatePassword]: ${httpResponses.STAFF_UPDATED_SUCCESSFULLY}`);
      return res.status(httpResponses.HTTP_STATUS_OK).json({
        success: true,
        message: `${httpResponses.STAFF_UPDATED_SUCCESSFULLY}`,
      });
    } else {
      return res.badRequest(httpResponses.PERMISSION_DENIED);
    }
  } catch (err) {
    logger.error(`[updatePassword] error -> ${err.message}`);
    return res.status(httpResponses.HTTP_STATUS_INTERNAL_ERROR).json({
      success: false,
      message: `${err.message}`,
    });
  }
};

/**
 * Delete staff
 * @param {*} req
 * @param {*} res
 * @returns
 */
const deleteStaff = async (req, res) => {
  try {
    const { _id } = req.params;
    const currentStaff = await staffService.getStaff({ _id: _id });
    if (!currentStaff) {
      logger.debug(`[delete Staff] ${httpResponses.STAFF_NOT_FOUND}`);
      return res.badRequest(httpResponses.STAFF_NOT_FOUND);
    }
    logger.debug(`[deleteStaff] ${JSON.stringify(currentStaff)}`);

    const userId = currentStaff.user;
    await Promise.all([staffService.deleteStaff({ _id: _id }), userService.deleteUser({ _id: userId })]);

    logger.debug(`[deleteStaff] ${httpResponses.STAFF_DELETE_SUCCESSFULLY}`);
    return res.ok(httpResponses.STAFF_DELETE_SUCCESSFULLY);
  } catch (error) {
    logger.error(`[deleteStaff] ${error.message}`);
    return res.internalServer(error.message);
  }
};

/**
 * Get detail staff
 * @param {*} req
 * @param {*} res
 * @returns
 */
const getDetailStaff = async (req, res) => {
  try {
    const { _id } = req.params;
    let currentStaff = await staffService.getStaff({ _id: _id });
    if (!currentStaff) {
      logger.debug(`[getDetailStaff] ${httpResponses.STAFF_NOT_FOUND}`);
      return res.badRequest(httpResponses.STAFF_NOT_FOUND);
    }
    const currentUser = await userService.getUser({ _id: currentStaff.user });

    currentStaff.user = currentUser;

    logger.debug(`[getDetailStaff] ${httpResponses.STAFF_DELETE_SUCCESSFULLY}`);
    return res.ok(httpResponses.STAFF_DELETE_SUCCESSFULL, currentStaff);
  } catch (error) {
    logger.error(`[getDetailStaff] ${error.message}`);
    return res.internalServer(error.message);
  }
};

/**
 * Get profile staff
 * @param {*} req
 * @param {*} res
 * @returns
 */
const getProfileStaff = async (req, res) => {
  try {
    logger.debug(`[getProfileStaff]`);

    const { user } = req.session;
    logger.info(`[getProfileStaff]: userId -> ${user._id}`);

    const existedUser = await userService.getUser({ _id: user._id });
    if (!existedUser) {
      logger.debug(`[getProfileStaff]: getUser -> ${httpResponses.USER_NOT_FOUND}`);
      return res.badRequest(httpResponses.USER_NOT_FOUND);
    }

    const existedStaff = await staffService.getStaff({ user: user._id });
    if (!existedStaff) {
      logger.debug(`[getProfileStaff]: getUser -> ${httpResponses.STAFF_NOT_FOUND}`);
      return res.badRequest(httpResponses.STAFF_NOT_FOUND);
    }

    const dataResponse = {
      _id: existedStaff._id,
      firstName: existedStaff.firstName,
      lastName: existedStaff.lastName,
      email: existedStaff.email,
      phoneNumber: existedStaff.phoneNumber,
      avatarUrl: existedStaff.avatarUrl,
      role: existedUser.role,
    };

    return res.ok(httpResponses.SUCCESS, dataResponse);
  } catch (error) {
    logger.error(`[getProfileStaff]: ${error.message}`);
    return res.internalServer(error.message);
  }
};

/**
 * Get data analytic
 * @query year: use get data analytic in that year || current year
 * @param {*} req
 * @param {*} res
 * @returns total {Array}, chart {Array}
 */
const dashboardAdmin = async (req, res) => {
  try {
    let { year } = req.query;
    year = +year || new Date().getFullYear();
    logger.info(`[dashboardAdmin] year ->${year}`);

    let startYear;
    let endYear;
    if (year) {
      startYear = helpFunctions.dateToStringLocal(moment(`${year}`).startOf('year'), constants.DATE_TIME_FORMAT);
      endYear = helpFunctions.dateToStringLocal(moment(`${year}`).endOf('year'), constants.DATE_TIME_FORMAT);
    }
    logger.info(`[dashboardAdmin] startYear -> ${startYear} endYear -> ${endYear}`);

    const [
      totalFlex,
      totalFixed,
      flexByYear,
      fixedByYear,
      countTutors,
      countStudents,
      countCourses,
      countFlexibleLessons,
    ] = await Promise.all([
      tutorService.getAnalyticFlexibleLessonByAdmin(),
      tutorService.getAnalyticFixedLessonByAdmin(),
      tutorService.getAnalyticFlexibleLessonByAdmin(startYear, endYear),
      tutorService.getAnalyticFixedLessonByAdmin(startYear, endYear),
      tutorService.countTutors(),
      studentService.countStudents(),
      courseService.countCourses(),
      flexibleLessonService.countFlexibleLessons(),
    ]);
    const total = {
      totalFlex: { ...totalFlex, count: countFlexibleLessons },
      totalCourse: { ...totalFixed, count: countCourses },
      totalStudents: countStudents,
      totalTutor: countTutors,
      totalTime: totalFixed.totalTime + totalFlex.totalTime,
      year: [],
    };

    if (flexByYear.length > 0) {
      for (let i = 0; i < 12; i++) {
        total.year[i] = {
          totalPrice: flexByYear[i].totalPrice + fixedByYear[i].totalPrice,
          month: `Tháng ${i + 1}`,
        };
      }
    }
    const result = [
      { totalTime: total.totalTime || 0, icon: enums.KeysIcon.TOTAL_TIME },
      // { label: 'Tổng thu nhập', value: total.totalFlex.totalPrice + total.totalCourse.totalPrice, icon: '' },
      { sizeCourse: total.totalCourse.count || 0, icon: enums.KeysIcon.TOTAL_COURSES },
      { sizeFlex: total.totalFlex.count || 0, icon: enums.KeysIcon.TOTAL_FLEXIBLE_LESSON },
      { totalTutor: total.totalTutor || 0, icon: enums.KeysIcon.TOTAL_TUTOR },
      { totalStudents: total.totalStudents || 0, icon: enums.KeysIcon.TOTAL_STUDENTS },
    ];

    logger.debug(`[dashboard ] -> ${httpResponses.SUCCESS}`);
    return res.ok(httpResponses.SUCCESS, { total: result, chart: total.year });
  } catch (err) {
    logger.error(err.message);
    return res.internalServer(err.message);
  }
};

const dashboardCustomerService = async (req, res) => {
  try {
    const [totalFlex, totalFixed, countTutors, countStudents, countCourses, countFlexibleLessons] = await Promise.all([
      tutorService.getAnalyticFlexibleLessonByAdmin(),
      tutorService.getAnalyticFixedLessonByAdmin(),
      tutorService.countTutors(),
      studentService.countStudents(),
      courseService.countCourses(),
      flexibleLessonService.countFlexibleLessons(),
    ]);
    const total = {
      totalFlex: { ...totalFlex, count: countFlexibleLessons },
      totalCourse: { ...totalFixed, count: countCourses },
      totalStudents: countStudents,
      totalTutor: countTutors,
      totalTime: totalFixed.totalTime + totalFlex.totalTime,
    };

    const result = [
      { label: 'Tổng thời gian', value: total.totalTime || 0, icon: enums.KeysIcon.TOTAL_TIME },
      // { label: 'Tổng thu nhập', value: total.totalFlex.totalPrice + total.totalCourse.totalPrice, icon: '' },
      { label: 'Khóa cố định', value: total.totalCourse.count || 0, icon: enums.KeysIcon.TOTAL_COURSES },
      { label: 'Lớp linh hoạt', value: total.totalFlex.count || 0, icon: enums.KeysIcon.TOTAL_FLEXIBLE_LESSON },
      { label: 'Giáo viên', value: total.totalTutor || 0, icon: enums.KeysIcon.TOTAL_TUTOR },
      { label: 'Học sinh', value: total.totalStudents || 0, icon: enums.KeysIcon.TOTAL_STUDENTS },
    ];

    logger.debug(`[dashboard ] -> ${httpResponses.SUCCESS}`);
    return res.ok(httpResponses.SUCCESS, result);
  } catch (err) {
    logger.error(err.message);
    return res.internalServer(err.message);
  }
};

//#region getNotifications
/**
 * get  Notifications
 * @param {*} req
 * @param {*} res
 * @returns
 */
const getNotifications = async (req, res) => {
  try {
    const { user } = req.session;
    let { _limit, _page, isSeen, sortTime } = req.query;
    logger.info(`[getNotifications] req.query  ->${JSON.stringify(req.query)}  'userId  ->' ${user._id}`);

    const filter = {};
    filter.isSeen = isSeen;
    filter.sortTime = sortTime;
    filter.userId = user._id;
    logger.info(`[getNotifications]: filter -> ${JSON.stringify(filter)}`);

    if (+_page <= 0) {
      _page = constants.PAGINATION_DEFAULT_PAGE;
    }
    if (+_limit <= 0) {
      _limit = constants.PAGINATION_DEFAULT_LIMIT;
    }
    const pagination = {
      _limit: +_limit || constants.PAGINATION_DEFAULT_LIMIT,
      _page: +_page || constants.PAGINATION_DEFAULT_PAGE,
      _total: 0,
    };

    logger.info(`[getNotifications] pagination -> ${JSON.stringify(pagination)}`);
    const notiationByAdmin = await notifyUserService.getAllNoticationByAdmin(filter, pagination);

    const noticationByStudent = await notifyUserService.getAllNoticationByStudent(filter, pagination);

    const noticationByTutor = await notifyUserService.getAllNoticationByTutor(filter, pagination);

    const noticationPromotion = await notifyUserService.getAllNoticationPromotion(filter, pagination);

    const countIsSeen = await notifyUserService.countAllIsSeen(filter);

    switch (user.role) {
      case UserRole.CUSTOMER_SERVICE:
        (notifications = notiationByAdmin.notifications.concat(
          noticationByStudent.notifications,
          noticationByTutor.notifications
        )),
          (pagination._total = notiationByAdmin.count + noticationByStudent.count + noticationByTutor.count);
        total = notiationByAdmin.total + noticationByStudent.total + noticationByTutor.total;
        isSeen = countIsSeen.isSeen;
        logger.debug(`[getNotifications] role CUSTOMER_SERVICE -> ${httpResponses.SUCCESS}`);
        notifications = notifications.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
        break;

      case UserRole.STUDENT:
        (notifications = noticationByStudent.notifications.concat(noticationPromotion.notifications)),
          (pagination._total = noticationByStudent.count + noticationPromotion.count);
        total = noticationByStudent.total + noticationPromotion.total;
        isSeen = countIsSeen.isSeen;
        notifications = notifications.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
        logger.debug(`[getNotifications] role STUDENT -> ${httpResponses.SUCCESS}`);

        break;

      case UserRole.TUTOR:
        (notifications = noticationByStudent.notifications.concat(noticationByTutor.notifications)),
          (pagination._total = noticationByStudent.count + noticationByTutor.count);
        total = noticationByStudent.total + noticationByTutor.total;
        isSeen = countIsSeen.isSeen;
        notifications = notifications.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
        logger.debug(`[getNotifications] role TUTOR -> ${httpResponses.SUCCESS}`);

        break;
      default:
        return res.status(httpResponses.HTTP_STATUS_BAD_REQUEST).json({
          success: false,
          message: `${httpResponses.ROLE_NOT_FOUND}`,
        });
    }
    logger.debug(`[getNotifications] ${httpResponses.SUCCESS}`);

    return res.ok(httpResponses.SUCCESS, { notifications, isSeen, pagination, total });
  } catch (err) {
    logger.error(`[getNotifications] ${err.message}`);
    return res.internalServer(err.message);
  }
};

//#region getNotifications
/**
 * get  Notifications
 * @param {*} req
 * @param {*} res
 * @returns
 */
const getNotificationsByStudent = async (req, res) => {
  try {
    const { user } = req.session;

    let { _limit, _page, isSeen, sortTime } = req.query;
    logger.info(`[getNotificationsByStudent] req.query  ->${JSON.stringify(req.query)}  'userId  ->' ${user._id}`);

    if (+_page <= 0) {
      _page = constants.PAGINATION_DEFAULT_PAGE;
    }
    if (+_limit <= 0) {
      _limit = constants.PAGINATION_DEFAULT_LIMIT;
    }
    const pagination = {
      _limit: +_limit || constants.PAGINATION_DEFAULT_LIMIT,
      _page: +_page || constants.PAGINATION_DEFAULT_PAGE,
      _total: 0,
    };

    logger.info(`[getNotifications] pagination -> ${JSON.stringify(pagination)}`);

    const filter = {};
    filter.isSeen = isSeen;
    filter.sortTime = sortTime;
    filter.userId = user._id;
    logger.info(`[getNotificationsByStudent]: filter -> ${JSON.stringify(filter)}`);

    const { notifications, count, total } = await notifyUserService.getAllNoticationByStudent(filter, pagination);
    pagination._total = count;
    logger.debug(`[getNotificationsByStudent] ${httpResponses.SUCCESS}`);

    return res.ok(httpResponses.SUCCESS, { notifications, pagination, total });
  } catch (err) {
    logger.error(`[getNotificationsByStudent] ${err.message}`);
    return res.internalServer(err.message);
  }
};

const getNotificationsByTutor = async (req, res) => {
  try {
    const { user } = req.session;

    let { _page, _limit, isSeen, sortTime } = req.query;
    logger.info(`[getNotificationsByTutor] req.query  ->${JSON.stringify(req.query)}  'userId  ->' ${user._id}`);

    if (+_page <= 0) {
      _page = constants.PAGINATION_DEFAULT_PAGE;
    }
    if (+_limit <= 0) {
      _limit = constants.PAGINATION_DEFAULT_LIMIT;
    }
    const pagination = {
      _limit: +_limit || constants.PAGINATION_DEFAULT_LIMIT,
      _page: +_page || constants.PAGINATION_DEFAULT_PAGE,
      _total: 0,
    };
    logger.info(`[getNotifications] pagination -> ${JSON.stringify(pagination)}`);

    const filter = {};
    filter.isSeen = isSeen;
    filter.sortTime = sortTime;
    filter.userId = user._id;
    logger.info(`[getNotificationsByTutor]: filter -> ${JSON.stringify(filter)}`);

    const { notifications, count, total } = await notifyUserService.getAllNoticationByTutor(filter, pagination);
    pagination._total = count;
    logger.debug(`[getNotificationsByTutor] ${httpResponses.SUCCESS}`);

    return res.ok(httpResponses.SUCCESS, { notifications, pagination, total });
  } catch (err) {
    logger.error(`[getNotificationsByTutor] ${err.message}`);
    return res.internalServer(err.message);
  }
};

//#endregion getNotifications
module.exports = {
  createStaff,
  getAllStaffs,
  updateProfile,
  deleteStaff,
  getDetailStaff,
  updatePassword,
  getProfileStaff,
  dashboardAdmin,
  dashboardCustomerService,
  getNotifications,
  getNotificationsByStudent,
  getNotificationsByTutor,
};
