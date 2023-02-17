const logger = require('../utils/logger');
const httpResponses = require('../utils/httpResponses');
const enums = require('../constants/enum');
const helper = require('../helper/helperFunction');
const constants = require('../constants/constants');

const leaveNoticeService = require('../services/leaveNotice');
const flexibleLessonService = require('../services/flexibleLesson');
const fixedLessonService = require('../services/fixedLesson');
const studentService = require('../services/student');
const tutorService = require('../services/tutor');
const walletService = require('../services/wallet');
const courseService = require('../services/course');
const notificationService = require('../services/notification');
const notifyUserService = require('../services/notifyUsers');
const userService = require('../services/user');
const tutorAvailableScheduleService = require('../services/tutorAvailableSchedule');

// Helper
const moment = require('moment');

//#region createLeaveNotice
/**
 * Create Leave Notice
 * @param {*} req
 * @param {*} res
 * @returns
 */
const createLeaveNotice = async (req, res) => {
  try {
    const { user, student, tutor } = req.session;
    const newModel = req.body;
    const rooms = req.rooms;
    logger.info(`[createLeaveNotice]: newModel -> ${JSON.stringify(req.body)}`);

    // #region Validate
    if (!newModel.flexibleLesson && !newModel.fixedLesson) {
      logger.info(`[createLeaveNotice]: fixedLesson -> ${httpResponses.ERROR_NOT_LESSON}`);
      return res.badRequest(httpResponses.ERROR_NOT_LESSON);
    }
    if (newModel.flexibleLesson && newModel.fixedLesson) {
      logger.info(`[createLeaveNotice]: fixedLesson -> ${httpResponses.ERROR_TWO_TYPE_LESSON}`);
      return res.badRequest(httpResponses.ERROR_TWO_TYPE_LESSON);
    }
    // #endregion Validate

    if (newModel.flexibleLesson) {
      let flexibleLessonFounded;
      let filterFlex = {
        _id: newModel.flexibleLesson,
        startTime: { $gt: moment().utc() },
      };

      if (student) {
        flexibleLessonFounded = await flexibleLessonService.getFlexibleLesson({
          ...filterFlex,
          student: student._id,
        });
        if (!flexibleLessonFounded) {
          logger.info(`[createLeaveNotice]: getFlexibleLessonById -> ${httpResponses.LESSON_FLEXIBLE_NOT_FOUND}`);
          return res.notFound(httpResponses.LESSON_FLEXIBLE_NOT_FOUND);
        }
        const hours = helper.calculateHour(new Date(), flexibleLessonFounded.startTime);
        newModel.isRefund = hours > 24 ? true : false;
      }
      if (tutor) {
        flexibleLessonFounded = await flexibleLessonService.getFlexibleLesson({
          ...filterFlex,
          tutor: tutor._id,
        });
        if (!flexibleLessonFounded) {
          logger.info(`[createLeaveNotice]: getFlexibleLessonById -> ${httpResponses.LESSON_FLEXIBLE_NOT_FOUND}`);
          return res.notFound(httpResponses.LESSON_FLEXIBLE_NOT_FOUND);
        }
        newModel.isRefund = true;
      }
      newModel.student = flexibleLessonFounded.student;
      newModel.tutor = flexibleLessonFounded.tutor;
      newModel.price = flexibleLessonFounded.price;
      newModel.flexibleLessonFounded = flexibleLessonFounded;
    }

    if (newModel.fixedLesson) {
      const existFixedLesson = await fixedLessonService.getFixedLessonForLeaveNotion(newModel.fixedLesson, student._id);
      if (!existFixedLesson) {
        logger.info(`[createLeaveNotice]: fixedLesson -> ${httpResponses.FIXED_NOT_FOUND}`);
        return res.notFound(httpResponses.FIXED_NOT_FOUND);
      }

      newModel.student = student._id;
      newModel.tutor = existFixedLesson.tutorCourse.tutor;
    }

    const checkModel = {
      tutor: newModel.tutor,
      student: newModel.student,
      fixedLesson: newModel.fixedLesson,
      flexibleLesson: newModel.flexibleLesson,
    };
    const leaveNotExist = await leaveNoticeService.getLeaveNotice(checkModel);
    if (leaveNotExist) {
      logger.info(`[createLeaveNotice]: -> ${httpResponses.LEAVE_NOTION_EXISTED}`);
      return res.badRequest(httpResponses.LEAVE_NOTION_EXISTED);
    }
    if (user.role == enums.UserRole.STUDENT) {
      newModel.type = enums.TypeLeaveNotice.STUDENT_CANCEL;
    }
    if (user.role == enums.UserRole.TUTOR) {
      newModel.type = enums.TypeLeaveNotice.TUTOR_CANCEL;
    }

    const newLeaveNoticeService = await leaveNoticeService.createLeaveNotice(newModel);

    // Refund
    if (newModel.isRefund) {
      const walletS = await walletService.getWalletByStudent(newModel.student);
      const newPoint = walletS.point + newModel.price;
      const updateWallet = await walletService.updateWalletByStudent(newModel.student, { point: newPoint });
      if (!updateWallet) {
        logger.info(`[createLeaveNotice]: updateWallet -> ${httpResponses.FAIL}`);
        return res.notFound(httpResponses.FAIL);
      }
      logger.info(`[createLeaveNotice]: updatePoint -> ${httpResponses.SUCCESS}`);
    }

    // Update status available time tutor
    if (newModel.flexibleLesson) {
      const processUpdate = newModel.flexibleLessonFounded.available.map((avai) =>
        tutorAvailableScheduleService.updateTutorTutorAvailableSchedule({ _id: avai }, { status: false })
      );
      await Promise.all(processUpdate);
      await flexibleLessonService.updateFlexibleLesson(
        { _id: newModel.flexibleLesson },
        { status: enums.StatusFlexibleLesson.CANCEL }
      );
    }

    // Create notification
    const arrayNewModel = [];
    let newNoitication;
    if (user.role == enums.UserRole.STUDENT) {
      newNoitication = await notificationService.createNotification({
        title: enums.TypeNotification.LEAVE_NOTICE,
        titleId: newLeaveNoticeService._id,
        owner: student ? student.user : tutor.user,
      });
      if (!newNoitication) {
        logger.debug(`[createLeaveNotice] ${httpResponses.CREATE_NOTIFICATION_ERROR}`);
        return logger.badRequest(httpResponses.CREATE_NOTIFICATION_ERROR);
      }

      const [userCustomerService, userTutor] = await Promise.all([
        userService.getAllUserByFilter({ role: enums.UserRole.CUSTOMER_SERVICE }),
        userService.getAllUserByFilter({ _id: newModel.tutorUser }),
      ]);

      userCustomerService.forEach((u) => {
        arrayNewModel.push({ user: u._id, notification: newNoitication._id });
      });
      userTutor.forEach((u) => {
        arrayNewModel.push({ user: u._id, notification: newNoitication._id });
      });

      await notifyUserService.createManyNotifyUsers(arrayNewModel);
    }

    if (user.role == enums.UserRole.TUTOR) {
      newNoitication = await notificationService.createNotification({
        title: enums.TypeNotification.LEAVE_NOTICE,
        titleId: newLeaveNoticeService._id,
        owner: student ? student.user : tutor.user,
      });
      if (!newNoitication) {
        logger.debug(`[createLeaveNotice] ${httpResponses.CREATE_NOTIFICATION_ERROR}`);
        return logger.badRequest(httpResponses.CREATE_NOTIFICATION_ERROR);
      }

      const [userCustomerService, userStudent] = await Promise.all([
        userService.getAllUserByFilter({ role: enums.UserRole.CUSTOMER_SERVICE }),
        userService.getAllUserByFilter({ _id: newModel.studentUser }),
      ]);

      userCustomerService.forEach((u) => {
        arrayNewModel.push({ user: u._id, notification: newNoitication._id });
      });
      userStudent.forEach((u) => {
        arrayNewModel.push({ user: u._id, notification: newNoitication._id });
      });
      await notifyUserService.createManyNotifyUsers(arrayNewModel);
    }

    // Emit event socket
    const idClient = arrayNewModel.map((elem) => elem.user.toString());
    logger.info(`[createFlexibleLesson] idClient -> ${JSON.stringify(idClient)}`);

    if (rooms[enums.RoomName.LESSON]) {
      Object.entries(rooms[enums.RoomName.LESSON]).forEach(([_id, client]) => {
        if (idClient.includes(_id)) {
          logger.info(`[createLeaveNotice][emitEventNotification] _id -> ${_id} isAlive -> ${client.isAlive}`);
          client.send(JSON.stringify({ type: enums.EventName.NOTIFICATION, idNotification: newNoitication._id }));
        }
      });
    }
    logger.debug(`[createLeaveNotice] emitEventNotification -> ${httpResponses.SUCCESS}`);

    return res.created(httpResponses.CREATE_LEAVE_NOTICE_SUCCESSFULLY);
  } catch (err) {
    logger.error(`[createLeaveNotice] error -> ${err.message}`);
    res.status(httpResponses.HTTP_STATUS_INTERNAL_ERROR).json({
      success: false,
      message: `${err.message}`,
    });
  }
};
//#endregion createLeaveNotice

module.exports = {
  createLeaveNotice,
};
