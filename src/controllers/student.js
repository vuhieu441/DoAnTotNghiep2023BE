const logger = require('../utils/logger');
const httpResponses = require('../utils/httpResponses');
const { UserRole } = require('../constants/enum');
const utility = require('../utils/utility');
const constants = require('../constants/constants');
const mongoose = require('mongoose');
const ObjectId = mongoose.Types.ObjectId;
const moment = require('moment');

// Service
const studentService = require('../services/student');
const tutorService = require('../services/tutor');
const userService = require('../services/user');
const securityService = require('../services/security');
const flexibleLessonService = require('../services/flexibleLesson');
const fixedLessonService = require('../services/fixedLesson');
const reviewService = require('../services/review');
const walletService = require('../services/wallet');
const courseService = require('../services/course');
const studentCourseService = require('../services/studentCourse');
const paymentService = require('../services/payment');
const authService = require('../services/auth');

const enums = require('../constants/enum');
const helper = require('../helper/helperFunction');
const mailerHelper = require('../helper/mailer');
const templateHelper = require('../helper/template');
const helperFucntion = require('../helper/function');

//#region createStudentUser
/**
 * Student register
 * Here, we create a generic user is student.
 * @param {*} req
 * @param {*} res
 * @returns
 */
const createStudentUser = async (req, res) => {
  try {
    const { email, password, lastName, firstName, phoneNumber, nationality, gender, dob, redirectUrl } = req.body;
    const confirmUrl = constants.AUTHENTICATION_REDIRECT_URL;

    logger.info(`[createStudentUser] req -> ${JSON.stringify(req.body)}`);

    if (!utility.checkGender(gender)) {
      logger.debug(`[createStudentUser]: ${gender} gender -> ${httpResponses.GENDER_NOT_FOUND}`);
      return res.status(httpResponses.HTTP_STATUS_BAD_REQUEST).json({
        success: false,
        message: `${httpResponses.GENDER_NOT_FOUND}`,
      });
    }

    if (!utility.checkNationality(nationality)) {
      logger.debug(`[createStudentUser]: ${nationality} nationality -> ${httpResponses.NATIONALITY_NOT_FOUND}`);
      return res.status(httpResponses.HTTP_STATUS_BAD_REQUEST).json({
        success: false,
        message: `${httpResponses.NATIONALITY_NOT_FOUND}`,
      });
    }
    if (!redirectUrl) {
      logger.debug(`[CreateStudentUser]  redirectUrl ->${httpResponses.REDIRECT_URL_CREATE_NOT_FOUND}`);
      return res.badRequest(httpResponses.REDIRECT_URL_CREATE_NOT_FOUND);
    }
    if (!confirmUrl) {
      logger.debug(`[CreateStudentUser]  confirmUrl ->${httpResponses.CONFIRM_URL_CREATE_NOT_FOUND}`);
      return res.badRequest(httpResponses.CONFIRM_URL_CREATE_NOT_FOUND);
    }
    if (!email || !constants.REGEX_VALID_GMAIL.test(email)) {
      logger.debug(`[CreateStudentUser] ${email} email ->${httpResponses.EMAIL_INVALID}`);
      return res.badRequest(httpResponses.EMAIL_INVALID);
    }
    if (!password || password.length < 8) {
      logger.debug(`[CreateStudentUser] ${password} password ->${httpResponses.PASSWORD_INVALID}`);
      return res.badRequest(httpResponses.PASSWORD_INVALID);
    }
    const existedUser = await userService.getUser({ email });
    const checkUserStudent = existedUser && existedUser.isConfirm && existedUser.role === enums.UserRole.STUDENT;
    const checkUserNotStudent = existedUser && existedUser.role !== enums.UserRole.STUDENT;
    if (checkUserStudent || checkUserNotStudent) {
      logger.debug(`[createStudentUser]: ${email} email -> ${httpResponses.USER_EXISTED}`);
      return res.status(httpResponses.HTTP_STATUS_BAD_REQUEST).json({
        success: false,
        message: `${httpResponses.USER_EXISTED}`,
      });
    }

    await Promise.all([
      userService.deleteUser({ email: email }),
      studentService.deleteStudent({ user: existedUser && existedUser._id }),
    ]);

    const hashPassword = await securityService.hashPassword(password);

    const newUser = {
      email: email.toLowerCase(),
      password: hashPassword,
      role: UserRole.STUDENT,
    };

    const user = await userService.createUser(newUser);
    logger.debug(`[createStudentUser]: ${httpResponses.USER_CREATED_SUCCESSFULLY}`);

    const newStudent = {
      user: user._id,
      lastName: lastName,
      firstName: firstName,
      phoneNumber: phoneNumber,
      nationality: nationality,
      gender: gender,
      dob: dob,
    };
    const student = await studentService.createStudent(newStudent);
    logger.debug(`[createStudentUser]: createStudent -> ${httpResponses.STUDENT_CREATED_SUCCESSFULLY}`);

    const newWallet = {
      student: student._id,
      point: 0,
      expirationDate: helper.dateToStringLocal(new Date(), constants.DATE_FORMAT),
    };
    await walletService.createWallet(newWallet);
    logger.debug(`[createStudentUser]: createWallet -> ${httpResponses.WALLET_CREATED_SUCCESS}`);

    logger.debug(`[createStudentUser]: ${httpResponses.STUDENT_CREATED_SUCCESSFULLY}`);

    const confirmToken = authService.generateToken1Hour({ redirectUrl, _id: user._id });

    const template = templateHelper.sendMailCreateForStudent({ to: email, confirmUrl: confirmUrl, confirmToken });

    const mailSuccess = await mailerHelper.sendGmail(template);
    if (!mailSuccess.success) {
      return res.status(httpResponses.HTTP_STATUS_INTERNAL_ERROR).json({
        success: false,
        message: `${httpResponses.SEND_MAIL_ERROR}`,
        messageTitle: `${mailSuccess.message}`,
      });
    }
    return res.status(httpResponses.HTTP_STATUS_CREATED).json({
      success: true,
      message: `${httpResponses.USER_CREATED_SUCCESSFULLY}`,
    });
  } catch (err) {
    logger.error(`[createStudentUser] error -> ${err.message}`);
    res.status(httpResponses.HTTP_STATUS_INTERNAL_ERROR).json({
      success: false,
      message: `${err.message}`,
    });
  }
};
//#endregion createStudentUser

//#region getAllStudents
/**
 * Get all students
 * // @TODO : add some field subjects, hours for studying, paid, point, used point, ...
 * @param {*} req
 * @param {*} res
 * @returns
 */
const getAllStudents = async (req, res) => {
  try {
    const { _textSearch, _page, _limit } = req.query;
    logger.info(`[getAllStudents]`);

    const pagination = {
      _page: +_page || constants.PAGINATION_DEFAULT_PAGE,
      _limit: +_limit || constants.PAGINATION_DEFAULT_LIMIT,
    };

    const getAllStudent = await studentService.getAllStudents(_textSearch, pagination);
    const total = await studentService.countStudents({});

    return res.status(httpResponses.HTTP_STATUS_OK).json({
      success: true,
      message: `${httpResponses.SUCCESS}`,
      data: {
        students: getAllStudent.students,
        _total: total,
        pagination: {
          ...pagination,
          _total: getAllStudent.count,
        },
      },
    });
  } catch (err) {
    logger.error(`[getAllStudents] error -> ${err.message}`);
    res.status(httpResponses.HTTP_STATUS_INTERNAL_ERROR).json({
      success: false,
      message: `${err.message}`,
    });
  }
};
//#endregion getAllStudents

//#region blockStudent
/**
 * Blocking Student
 * @param {*} req
 * @param {*} res
 * @returns
 */
const blockStudent = async (req, res) => {
  try {
    const { _id } = req.params;
    const newModel = req.body;
    logger.info(`[blockStudent]: req.params -> ${_id}`);

    const existedStudent = await studentService.getStudent({ _id: _id });
    if (!existedStudent) {
      logger.debug(`[blockStudent]: getStudent -> ${httpResponses.STUDENT_NOT_FOUND}`);
      return res.status(httpResponses.HTTP_STATUS_NOT_FOUND).json({
        success: false,
        message: `${httpResponses.STUDENT_NOT_FOUND}`,
      });
    }

    await studentService.updateStudentById(_id, newModel);
    logger.debug(`[blockStudent]: blockStudent -> ${httpResponses.STUDENT_BLOCKED_SUCCESSFULLY}`);

    return res.status(httpResponses.HTTP_STATUS_OK).json({
      success: true,
      message: `${httpResponses.STUDENT_BLOCKED_SUCCESSFULLY}`,
    });
  } catch (err) {
    logger.error(`[getAllStudents] error -> ${err.message}`);
    res.status(httpResponses.HTTP_STATUS_INTERNAL_ERROR).json({
      success: false,
      message: `${err.message}`,
    });
  }
};
//#endregion blockStudent

//#region registerCourse
/**
 * Register Course
 * @param {*} req
 * @param {*} res
 * @returns
 */
const registerCourse = async (req, res) => {
  try {
    const { student } = req.session;
    const { courseId } = req.body;
    logger.info(`[registerCourse]: studentId -> ${student._id} courseId -> ${courseId}`);
    const newModel = {
      student: student._id,
      course: courseId,
    };

    const [course, wallet] = await Promise.all([
      courseService.getCourseById(courseId),
      walletService.getWalletByStudent(student._id),
    ]);
    if (!course.isActive) {
      logger.debug(`[registerCourse]: courseIsActive -> ${httpResponses.COURSE_NOT_ACTIVE}`);
      return res.badRequest(httpResponses.COURSE_NOT_ACTIVE);
    }
    if (!course) {
      logger.debug(`[registerCourse]: getCourseById -> ${httpResponses.COURSE_NOT_FOUND}`);
      return res.notFound(httpResponses.COURSE_NOT_FOUND);
    }
    if (!wallet) {
      logger.debug(`[registerCourse]: getWalletByStudent -> ${httpResponses.WALLET_NOT_FOUND}`);
      return res.notFound(httpResponses.WALLET_NOT_FOUND);
    }

    const scheduleStudent = await studentService.getScheduleStudent(student._id, moment().format('YYYY-MM-DD'));
    const fixedLessons = await fixedLessonService.getFixedLessonsByCourse(courseId);
    let sameTimeObj = null;
    for (const item of fixedLessons) {
      sameTimeObj = scheduleStudent.find((x) => !(item.startTime >= x.end || item.endTime <= x.start));
      if (sameTimeObj) {
        break;
      }
    }

    if (sameTimeObj) {
      logger.debug(`[createCourse]: ${httpResponses.SAME_SCHEDULE_AVAILABLE}`);
      return res.badRequest(httpResponses.SAME_SCHEDULE_AVAILABLE);
    }

    const studentCourse = await studentCourseService.getStudentCoursed({ course: courseId });

    const studentRegistered = await studentCourseService.getStudentCoursed({ student: student._id, course: courseId });
    if (studentRegistered.length > 0) {
      logger.info(`[registerCourse]: checkStudentRegistered -> ${httpResponses.COURSE_REGISTERED}`);
      return res.badRequest(httpResponses.COURSE_REGISTERED);
    }
    logger.info(`[registerCourse]: course -> ${course.maxStudents}, studentCourse -> ${studentCourse.length}`);
    if (course.maxStudents === studentCourse.length) {
      logger.info(`[registerCourse]: checkCourseFull -> ${httpResponses.COURSE_FULL_SLOT}`);
      return res.badRequest(httpResponses.COURSE_FULL_SLOT);
    }

    const price = course.price ?? 0;
    const point = wallet.point ?? 0;
    if (point < price) {
      logger.debug(`[registerCourse]: point -> ${httpResponses.STUDENT_REGISTER_NOT_ENOUGH_POINT}`);
      return res.badRequest(httpResponses.STUDENT_REGISTER_NOT_ENOUGH_POINT);
    }

    const registerModel = await studentService.registerCourse(newModel);
    if (!registerModel) {
      logger.debug(`[registerCourse]: register -> ${httpResponses.FAIL}`);
      return res.status(httpResponses.HTTP_STATUS_BAD_REQUEST).json({
        success: false,
        message: `${httpResponses.STUDENT_REGISTER_COURSE_FAIL}`,
      });
    }

    const newWallet = {
      point: point - price,
    };
    await walletService.updateWalletByStudent(student._id, newWallet);
    logger.debug(`[registerCourse]: updatePointStudent -> ${httpResponses.SUCCESS}`);

    return res.status(httpResponses.HTTP_STATUS_OK).json({
      success: true,
      message: `${httpResponses.STUDENT_REGISTER_COURSE_SUCCESS}`,
    });
  } catch (err) {
    logger.error(`[registerCourse] error -> ${err.message}`);
    res.status(httpResponses.HTTP_STATUS_INTERNAL_ERROR).json({
      success: false,
      message: `${err.message}`,
    });
  }
};

//#endregion registerCourse

//#region registerFlexibleLesson
/**
 * Register flexible lesson
 * @param {*} req
 * @param {*} res
 * @returns
 */
const registerFlexibleLesson = async (req, res) => {
  try {
    const { student } = req.session;
    const { flexibleLessonId } = req.body;
    const rooms = req.rooms;
    logger.info(`[registerFlexibleLesson]: studentId -> ${student._id} flexibleLessonId -> ${flexibleLessonId}`);

    const newModel = {
      student: student._id,
      status: enums.StatusFlexibleLesson.REGISTERED,
    };

    const [flexibleLesson, wallet] = await Promise.all([
      flexibleLessonService.getFlexibleLessonById(flexibleLessonId),
      walletService.getWalletByStudent(student._id),
    ]);
    if (!flexibleLesson) {
      logger.debug(`[registerFlexibleLesson]: getFlexibleLessonById -> ${httpResponses.LESSON_NOT_FOUND}`);
      return res.notFound(httpResponses.LESSON_NOT_FOUND);
    }
    if (flexibleLesson.student || flexibleLesson.status === enums.StatusFlexibleLesson.REGISTERED) {
      logger.debug(`[registerFlexibleLesson]: checkRegisted -> ${httpResponses.LESSON_REGISTERED}`);
      return res.badRequest(httpResponses.LESSON_REGISTERED);
    }
    if (!wallet) {
      logger.debug(`[registerFlexibleLesson]: getWalletByStudent -> ${httpResponses.WALLET_NOT_FOUND}`);
      return res.notFound(httpResponses.WALLET_NOT_FOUND);
    }

    const existedTutor = await tutorService.getTutorById(flexibleLesson.tutor);
    if (!existedTutor) {
      logger.debug(`[registerFlexibleLesson]: getTutorById -> ${httpResponses.TUTOR_NOT_FOUND}`);
      return res.notFound(httpResponses.TUTOR_NOT_FOUND);
    }

    const price = flexibleLesson.price ?? 0;
    const point = wallet.point ?? 0;
    if (point < price) {
      logger.debug(`[registerFlexibleLesson]: checkPointStudent -> ${httpResponses.WALLET_NOT_FOUND}`);
      return res.badRequest(httpResponses.STUDENT_REGISTER_NOT_ENOUGH_POINT);
    }

    const newFlexibleLesson = await flexibleLessonService.updateFlexibleLesson(flexibleLessonId, newModel);
    if (!newFlexibleLesson) {
      logger.debug(`[registerFlexibleLesson]: register -> ${httpResponses.FAIL}`);
      return res.badRequest(httpResponses.STUDENT_REGISTER_LESSON_FAIL);
    }

    const newWallet = {
      point: point - price,
    };
    await walletService.updateWalletByStudent(student._id, newWallet);
    logger.debug(`[registerFlexibleLesson]: updatePointStudent -> ${httpResponses.SUCCESS}`);

    // WebSocket send data to client
    Object.entries(rooms[enums.RoomName.CONNECT_LESSON]).forEach(([_id, client]) => {
      if (_id === existedTutor.user) client.send(JSON.stringify({ type: enums.EventName.NOTIFICATION }));
    });

    return res.status(httpResponses.HTTP_STATUS_OK).json({
      success: true,
      message: `${httpResponses.STUDENT_REGISTER_LESSON_SUCCESS}`,
    });
  } catch (err) {
    logger.error(`[registerFlexibleLesson] error -> ${err.message}`);
    res.status(httpResponses.HTTP_STATUS_INTERNAL_ERROR).json({
      success: false,
      message: `${err.message}`,
    });
  }
};
//#endregion registerFlexibleLesson

//#region getDetailStudent
/**
 * Get detail student for admin and customer service
 * @param {*} req
 * @param {*} res
 * @returns
 */
const getDetailStudent = async (req, res) => {
  try {
    const { _id } = req.params;
    logger.info(`[getDetailStudent] req.params -> ${_id}`);

    let { _limit, _page } = req.query;
    logger.info(`[getDetailStudent] req.query -> ${JSON.stringify(req.query)}`);

    const currentStudent = await studentService.getStudent({ _id: _id });
    if (!currentStudent) {
      logger.debug(`[getDetailStudent]: ${httpResponses.STUDENT_NOT_FOUND}`);
      return res.badRequest(httpResponses.STUDENT_NOT_FOUND);
    }

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

    const { firstDay, lastDay } = helperFucntion.getFirstDayLastDayInMonth();
    const filterSchedule = {
      startDateLimit: helperFucntion.formatDate(constants.DATE_FORMAT, firstDay),
      endDateLimit: helperFucntion.formatDate(constants.DATE_FORMAT, lastDay),
    };

    const [detailStudent, flexibleLesson, fixedLesson, review, historyPayments, paymentUsed] = await Promise.all([
      studentService.getDetailStudent(_id),
      flexibleLessonService.getScheduleFlexibleLessonStudent(_id, filterSchedule),
      fixedLessonService.getScheduleFixedLessonStudent(_id, filterSchedule),
      reviewService.getReviewsByFilter({ student: ObjectId(_id) }, pagination),
      paymentService.getAllPaymentByStudentNoPagination(_id),
      paymentService.getPaymentUsedByStudentId(_id),
    ]);

    const totalTimeFixed = fixedLesson.reduce((total, fixed) => {
      return total + fixed.totalTime;
    }, 0);
    const totalTimeFlexible = flexibleLesson.reduce((total, flexible) => {
      return total + flexible.totalTime;
    }, 0);
    //add pagination to review
    if (review) {
      pagination._total = review.data.length;
      review.pagination = pagination;
    }

    const schedule = flexibleLesson.concat(fixedLesson);
    const dataResponse = {
      detailStudent: detailStudent[0].detailStudent,
      statistical: {
        totalTime: totalTimeFixed + totalTimeFlexible,
        pricePaid: paymentUsed.totalPrice,
        pointUsed: paymentUsed.totalPoint,
      },
      schedule,
      review,
      historyPayments,
    };

    logger.debug(`[getDetailStudent]: ${httpResponses.STUDENT_GET_DETAIL_SUCCESSFULLY}`);
    return res.ok(httpResponses.STUDENT_GET_DETAIL_SUCCESSFULLY, dataResponse);
  } catch (error) {
    logger.debug(`[getDetailStudent]: ${error.message}`);
    return res.badRequest(error.message);
  }
};

//#endregion getDetailStudent

//#region getScheduleStudent
/**
 * Get Schedule Student
 * @param {*} req
 * @param {*} res
 * @returns
 */
const getScheduleStudent = async (req, res) => {
  try {
    const { user } = req.session;
    const { startDate, endDate } = req.query;
    logger.info(`[getScheduleStudent]: startDate -> ${startDate}, endDate -> ${endDate}`);

    let schedules;
    switch (user.role) {
      case enums.UserRole.STUDENT:
        const { student } = req.session;
        logger.info(`[getScheduleStudent]: student -> ${student._id}`);

        schedules = await studentService.getScheduleStudent(student._id, startDate, endDate);
        logger.debug(`[getScheduleStudent]: ${httpResponses.STUDENT_GET_DETAIL_SUCCESSFULLY}`);
        return res.ok(httpResponses.SUCCESS, { schedules });
      case enums.UserRole.ADMIN:
        const { studentId } = req.params;
        logger.info(`[getScheduleStudent]: studentId -> ${studentId}`);

        schedules = await studentService.getScheduleStudent(studentId, startDate, endDate);
        logger.debug(`[getScheduleStudent]: ${httpResponses.STUDENT_GET_DETAIL_SUCCESSFULLY}`);
        return res.ok(httpResponses.SUCCESS, { schedules });
      default:
        return res.badRequest(httpResponses.PERMISSION_DENIED);
    }
  } catch (error) {
    logger.debug(`[getScheduleStudent]: ${error.message}`);
    return res.internalServer(error.message);
  }
};
//#endregion getScheduleStudent

//#region payment
const payment = async (req, res) => {
  try {
    const { student } = req.session;
    const newModel = req.body;
    await walletService.updateWalletByStudent(student._id, newModel);
    logger.debug(`payment: ${httpResponses.SUCCESS}`);
    return res.ok(httpResponses.SUCCESS);
  } catch (error) {
    logger.debug(`payment: error -> ${error.message}`);
    return res.internalServer(error.message);
  }
};
//#endregion payment

//#region getTutorsLearned
/**
 * Get tutors learned of student
 * @todo  @son-tran processing
 * @param {*} req
 * @param {*} res
 * @returns
 */
const getTutorsLearned = async (req, res) => {
  try {
    const { student } = req.session;
    const studentId = student._id;

    logger.info(`[getTutorsLearned]: studentId -> ${studentId}`);

    const { _page, _limit, _textSearch } = req.query;
    const pagination = {
      _page: +_page || constants.PAGINATION_DEFAULT_PAGE,
      _limit: +_limit || constants.PAGINATION_DEFAULT_LIMIT,
    };
    const { tutorLearned, count, total } = await studentService.getTutorsLearnedByStudentId(
      studentId,
      pagination,
      _textSearch
    );
    logger.debug(`[getTutorsLearned]: getTutorsLearnedByStudentId -> ${httpResponses.SUCCESS}`);

    const dataResponse = {
      tutors: tutorLearned || [],
      pagination: {
        ...pagination,
        _total: count || 0,
      },
      total: total || 0,
    };

    return res.ok(httpResponses.SUCCESS, dataResponse);
  } catch (error) {
    logger.debug(`[getTutorsLearned]: error -> ${error.message}`);
    return res.internalServer(error.message);
  }
};
//#endregion getTutorsLearned

//#region getDetailSchedule
/**
 * Get detail lesson for schedule
 * @param {*} req
 * @param {*} res
 */
const getDetailSchedule = async (req, res) => {
  try {
    const { lessonId, type } = req.query;
    logger.info(`[getDetailSchedule]: lessonId -> ${lessonId} type -> ${type}`);
    const { student } = req.session;
    let studentId;
    if (student) {
      studentId = student._id;
    }
    logger.info(`[getDetailSchedule] studentId ->${studentId}`);

    let resultLesson;
    switch (type) {
      case enums.LessonType.FIXED:
        resultLesson = await fixedLessonService.getDetailFixedLesson(lessonId, studentId);
        logger.debug(`[getDetailSchedule]: getDetailFixedLesson -> ${httpResponses.SUCCESS}`);

        if (!resultLesson || !resultLesson._id) {
          return res.badRequest(httpResponses.FIXED_NOT_FOUND);
        }
        resultLesson.type = enums.LessonType.FIXED;
        break;
      case enums.LessonType.FLEXIBLE:
        resultLesson = await flexibleLessonService.getDetailFlexibleLessons(lessonId);
        logger.debug(`[getDetailSchedule]: getDetailFlexibleLessons -> ${httpResponses.SUCCESS}`);

        if (!resultLesson) {
          logger.debug(`[getDetailSchedule]: getDetailFlexibleLessons -> ${httpResponses.LESSON_FLEXIBLE_NOT_FOUND}`);
          return res.badRequest(httpResponses.LESSON_FLEXIBLE_NOT_FOUND);
        }
        resultLesson.type = enums.LessonType.FLEXIBLE;
        break;
      default:
        return res.badRequest(httpResponses.QUERY_ERROR);
    }

    logger.debug(`[getDetailSchedule]: response -> ${httpResponses.SUCCESS}`);
    res.ok(httpResponses.SUCCESS, { detailSchedule: resultLesson });
  } catch (e) {
    logger.debug(`[getDetailSchedule]: error:-> ${e.message}`);
    res.internalServer(e.message);
  }
};
//#endregion getDetailSchedule

//#region getCourseRegistered
/**
 * Get course registered for fixed lesson and flex lesson
 * @param {*} req
 * @param {*} res
 * @returns
 */
const getCourseRegistered = async (req, res) => {
  try {
    const { student } = req.session;

    const flexibleLessons = await flexibleLessonService.getFlexibleLessons({
      student: student._id,
      startTime: { $gte: new Date() },
    });
    const courses = await studentCourseService.getStudentCoursed({ student: ObjectId(student._id) }, true);

    return res.ok(httpResponses.SUCCESS, { flexibleLessons, courses });
  } catch (err) {
    logger.error(`[getCourseRegistered]: error:-> ${err.message}`);
    res.internalServer(err.message);
  }
};
//#endregion getCourseRegistered

module.exports = {
  createStudentUser,
  getAllStudents,
  registerCourse,
  blockStudent,
  registerFlexibleLesson,
  getDetailStudent,
  getScheduleStudent,
  payment,
  getTutorsLearned,
  getDetailSchedule,
  getCourseRegistered,
};
