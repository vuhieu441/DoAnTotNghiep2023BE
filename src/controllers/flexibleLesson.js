const httpResponses = require('../utils/httpResponses');
const constants = require('../constants/constants');
const enums = require('../constants/enum');
const logger = require('../utils/logger');

const flexibleLessonService = require('../services/flexibleLesson');
const tutorService = require('../services/tutor');
const tutorAvailableScheduleService = require('../services/tutorAvailableSchedule');
const walletService = require('../services/wallet');
const googleHelper = require('../helper/googleHelper');
const notificationService = require('../services/notification');
const notifyUserService = require('../services/notifyUsers');
const userService = require('../services/user');
const studentService = require('../services/student');
const moment = require('moment');

//#region createFlexibleLesson
/**
 * create Flexible Lesson
 * @param {*} req
 * @param {*} res
 * @returns
 */
const createFlexibleLesson = async (req, res) => {
  try {
    const { student } = req.session;
    logger.info(`[createFlexibleLesson] studentId ${student._id}`);
    const newModel = req.body;
    const rooms = req.rooms;
    logger.info(`[createFlexibleLesson] req.body ${JSON.stringify(req.body)}`);

    // Validate body
    if (!newModel.tutor || !newModel.available || !Array.isArray(newModel.available) || !newModel.information) {
      logger.debug(`[createFlexibleLesson] ${httpResponses.QUERY_ERROR}`);
      return res.notFound(httpResponses.QUERY_ERROR);
    }

    const existTutor = await tutorService.getTutor({ _id: newModel.tutor });
    if (!existTutor) {
      logger.debug(`[createFlexibleLesson] ${httpResponses.TUTOR_NOT_FOUND}`);
      return res.notFound(httpResponses.TUTOR_NOT_FOUND);
    }

    // Logic
    const flexibleHasAvailbleApi = [];
    const avaliableApi = [];
    const updateAvailbleApi = [];

    newModel.available.forEach((avai) => {
      avaliableApi.push(tutorAvailableScheduleService.getTutorAvailableSchedules({ _id: avai, tutor: newModel.tutor }));
      flexibleHasAvailbleApi.push(
        flexibleLessonService.getFlexibleLesson({ available: avai, status: { $ne: enums.StatusFlexibleLesson.CANCEL } })
      );
    });

    /** Check time available is exist  */
    const availableExist = await Promise.all(avaliableApi);
    if (avaliableApi.length == 0 || availableExist.some((available) => !available)) {
      logger.debug(`[createFlexibleLesson] ${httpResponses.SCHEDULE_NOT_FOUND}`);
      return res.notFound(httpResponses.SCHEDULE_NOT_FOUND);
    }

    /** Check time available is has been set  */
    const existFlex = await Promise.all(flexibleHasAvailbleApi);
    if (existFlex.some((ex) => !!ex)) {
      logger.debug(`[createFlexibleLesson] ${httpResponses.SCHEDULE_ALREADY_EXIST}`);
      return res.badRequest(httpResponses.SCHEDULE_ALREADY_EXIST);
    }

    /** Check google tokens */
    if (!existTutor.googleCalendarTokens || !existTutor.googleCalendarTokens.refreshToken) {
      logger.debug(`[createFlexibleLesson] ${httpResponses.TUTOR_NOT_GOOGLE}`);
      return res.notFound(httpResponses.TUTOR_NOT_GOOGLE);
    }

    /** Get list start time of available schedule */
    availableExist.sort((a, b) => a.startTime - b.startTime);
    const startTimeArr = availableExist.map((a) => a.startTime);
    logger.info(`[createFlexibleLesson] startTimeArrAvailable -> ${JSON.stringify(startTimeArr)}`);

    /** Check time available is there is continuous  */
    let isContinue = true;
    let minTime = availableExist[0]?.startTime;
    let maxTime = availableExist[availableExist.length - 1]?.endTime;
    logger.info(
      `[createFlexibleLesson] timeAvailableStudentBook: minTime -> ${JSON.stringify(
        minTime
      )} - maxTime -> ${JSON.stringify(maxTime)} `
    );

    for (let i = 0; i < startTimeArr.length - 1; i++) {
      const diff = (startTimeArr[i + 1] - startTimeArr[i]) / 1000 / constants.DEFAULT_MIMUTE / 60;

      if (diff != 1) isContinue = false;
    }
    if (!isContinue) {
      logger.debug(`[createFlexibleLesson] ${httpResponses.SCHEDULE_NOT_CONTINUE}`);
      return res.notFound(httpResponses.SCHEDULE_NOT_CONTINUE);
    }

    /** Check time student book have match with booked time available  */
    const scheduleStudent = await studentService.getScheduleStudent(student._id, moment.utc().format('YYYY-MM-DD'));
    let isStudentBooked = false;
    for (let schedule of scheduleStudent) {
      if (!(maxTime <= schedule.start || schedule.end <= minTime)) {
        isStudentBooked = true;
        break;
      }
    }
    if (isStudentBooked) {
      logger.debug(`[createFlexibleLesson] ${httpResponses.SAME_SCHEDULE_AVAILABLE}`);
      return res.notFound(httpResponses.SAME_SCHEDULE_AVAILABLE);
    }

    /** Update new model */
    newModel.price = ((existTutor.salaryPerHour * startTimeArr.length) / 60) * constants.DEFAULT_MIMUTE;
    newModel.status = enums.StatusFlexibleLesson.REGISTERED;
    newModel.student = student._id;
    newModel.information =
      typeof newModel.information == 'string' ? JSON.parse(newModel.information) : newModel.information;

    /** Create linke meet */
    const linkMeet = await googleHelper.createMeeting(
      { startTime: minTime, endTime: maxTime, description: newModel.information.description },
      existTutor.googleCalendarTokens.refreshToken
    );
    if (!linkMeet) {
      logger.debug(`[createFlexibleLesson] createMeeting -> ${httpResponses.CREATE_LINK_MEET_FAIL}`);
      return res.notFound(httpResponses.CREATE_LINK_MEET_FAIL);
    }
    logger.debug(`[createFlexibleLesson] ${httpResponses.CREATE_LINK_MEEET_SUCCESS}`);

    newModel.linkMeet = linkMeet;
    newModel.startTime = minTime;
    newModel.endTime = maxTime;

    /** Deduct point of student when register flexible lesson */
    const walletStudent = await walletService.getWalletByStudent(student._id);
    const point = walletStudent.point;
    if (point < newModel.price) {
      logger.debug(`[createFlexibleLesson] ${httpResponses.STUDENT_NOT_ENOUGH_MONEY}`);
      return res.badRequest(httpResponses.STUDENT_NOT_ENOUGH_MONEY);
    }
    const newPoint = point - newModel.price;

    /** Create flexible lesson and update schedule available of tutor */
    const flexibleLesson = await flexibleLessonService.createFlexibleLesson(newModel);
    await walletService.updateWalletByStudent(student._id, { point: newPoint });
    newModel.available.forEach((avai) => {
      updateAvailbleApi.push(
        tutorAvailableScheduleService.updateTutorTutorAvailableSchedule({ _id: avai }, { status: true })
      );
    });

    await Promise.all([updateAvailbleApi]);
    logger.debug(`[createFlexibleLesson] ${httpResponses.CREATE_FLEXIBLE_SUCCESS}`);

    /** Create notification  */
    const newNoitication = await notificationService.createNotification({
      title: enums.TypeNotification.REGISTER_FLEXIBLELESSON,
      titleId: flexibleLesson._id,
      owner: student.user,
    });
    if (!newNoitication) {
      logger.debug(`[createFlexibleLesson] ${httpResponses.CREATE_NOTIFICATION_ERROR}`);
      return logger.badRequest(httpResponses.CREATE_NOTIFICATION_ERROR);
    }
    // Push socket
    const [userCustomerService, userTutor] = await Promise.all([
      userService.getAllUserByFilter({ role: enums.UserRole.CUSTOMER_SERVICE }),
      tutorService.getAllTutorByFilter({ _id: newModel.tutor }),
    ]);

    const arrayNewModel = [];
    userCustomerService.forEach((u) => {
      arrayNewModel.push({ user: u._id, notification: newNoitication._id });
    });
    userTutor.forEach((u) => {
      arrayNewModel.push({ user: u.user, notification: newNoitication._id });
    });
    await notifyUserService.createManyNotifyUsers(arrayNewModel);

    const idClient = arrayNewModel.map((elem) => elem.user.toString());
    logger.info(`[createFlexibleLesson] idClient -> ${JSON.stringify(idClient)}`);

    if (rooms[enums.RoomName.LESSON]) {
      Object.entries(rooms[enums.RoomName.LESSON]).forEach(([_id, client]) => {
        if (idClient.includes(_id)) {
          logger.info(`[createFlexibleLesson][emitEventNotification] _id -> ${_id} isAlive -> ${client.isAlive}`);
          client.send(JSON.stringify({ type: enums.EventName.NOTIFICATION, idNotification: newNoitication._id }));
        }
      });
    }
    logger.debug(`[createFlexibleLesson] emitEventNotification -> ${httpResponses.SUCCESS}`);

    res.created(httpResponses.CREATE_FLEXIBLE_SUCCESS);
  } catch (err) {
    logger.error(`[createFlexibleLesson]: error -> ${err.message}`);
    res.status(httpResponses.HTTP_STATUS_INTERNAL_ERROR).json({
      success: false,
      message: `${err.message}`,
    });
  }
};
//#endregion createFlexibleLesson

//#region getAllFlexibleLessons
/**
 * get All Flexibl eLessons
 * @param {*} req
 * @param {*} res
 * @returns
 */
const getAllFlexibleLessons = async (req, res) => {
  try {
    const { user, student, tutor } = req.session;
    logger.debug(`[getAllFlexibleLessons] userId  ${user._id}`);

    const filter = [];
    const { _textSearch, _page, _limit } = req.query;
    const pagination = {
      _page: _page && +_page > 0 ? +_page : constants.PAGINATION_DEFAULT_PAGE,
      _limit: _limit && +_limit > 0 ? +_limit : constants.PAGINATION_DEFAULT_LIMIT,
    };
    filter._textSearch = _textSearch;
    filter.pagination = pagination;

    if (student) {
      logger.debug(`[getAllFlexibleLessons] studentId  ${student._id}`);
      filter.studentId = student._id;
    }
    if (tutor) {
      logger.debug(`[getAllFlexibleLessons] tutorId  ${tutor._id}`);
      filter.tutorId = tutor._id;
    }

    const { flexibles, count, total } = await flexibleLessonService.getAllFlexibleLessonsForRole(filter);
    pagination._total = count;
    logger.debug(`[getAllFlexibleLessons] ${httpResponses.SUCCESS}`);
    return res.ok(httpResponses.SUCCESS, { flexibleLessons: flexibles, pagination, total });
  } catch (err) {
    logger.error(`[getAllFlexibleLessons]: error -> ${err.message}`);
    res.status(httpResponses.HTTP_STATUS_INTERNAL_ERROR).json({
      success: false,
      message: `${err.message}`,
    });
  }
};
//#endregion getAllFlexibleLessons
module.exports = { createFlexibleLesson, getAllFlexibleLessons };
