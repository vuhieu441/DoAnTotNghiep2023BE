const tutorAvailableScheduleService = require('../services/tutorAvailableSchedule');
const tutorService = require('../services/tutor');
const httpResponses = require('../utils/httpResponses');
const logger = require('../utils/logger');
const flexibleLessonService = require('../services/flexibleLesson');
const fixedLessonService = require('../services/fixedLesson');
const helper = require('../helper/helperFunction');

//#region createTutorAvailableSchedule
/**
 * Create tutor Available Schedule
 * @param {*} req
 * @param {*} res
 */
const createTutorAvailableSchedule = async (req, res) => {
  try {
    const { user } = req.session;
    logger.info(`[createTutorAvailableSchedule] user -> ${JSON.stringify(user)}`);
    let newModel = req.body;

    if (!newModel.timeZone || !newModel.month || !newModel.time) {
      logger.debug(`[createTutorAvailableSchedule] -> ${httpResponses.QUERY_ERROR}`);
      return res.badRequest(httpResponses.QUERY_ERROR);
    }
    const currentTutor = await tutorService.getTutor({ user: user._id });
    if (!currentTutor) {
      logger.debug(`[createTutorAvailableSchedule] getTutor -> ${httpResponses.TUTOR_NOT_FOUND}`);
      return res.badRequest(httpResponses.TUTOR_NOT_FOUND);
    }
    const arrTime = [];
    const process = [];
    let minTime = false;
    let maxTime = false;
    let existError = false;
    newModel.tutor = currentTutor._id;
    const checkExist = [];
    const flexExistApi = [];
    const fixedExistApi = [];

    const checkTime = newModel.time.every((time, index) => {
      if (arrTime.includes(JSON.stringify(time))) {
        existError = true;
      }
      const startTime = new Date(time.startTime);
      const endTime = new Date(time.endTime);

      var difference = ((endTime - startTime) / 1000 / 3600) * 4;
      if (!minTime || startTime - minTime < 0) {
        minTime = startTime;
      }
      if (!maxTime || endTime - maxTime > 0) {
        maxTime = endTime;
      }
      process.push({
        tutor: newModel.tutor,
        startTime: startTime,
        endTime: endTime,
        timeZone: newModel.timeZone,
      });
      checkExist.push(
        tutorAvailableScheduleService.getTutorAvailableSchedules({
          tutor: newModel.tutor,
          startTime: startTime,
          endTime: endTime,
          timeZone: newModel.timeZone,
        })
      );
      flexExistApi.push(
        tutorService.checkTutorAvailbleFlex({ tutor: newModel.tutor, startTime: startTime, endTime: endTime })
      );
      fixedExistApi.push(
        tutorService.checkTutorAvailbleFixed({ tutor: newModel.tutor, startTime: startTime, endTime: endTime })
      );

      arrTime.push(JSON.stringify(time));
      return difference == 1;
    });

    if (!checkTime) {
      logger.debug(`[createTutorAvailableSchedule] ${httpResponses.LESSON_TIME_NOT_EQUAL_15M}`);
      return res.badRequest(httpResponses.LESSON_TIME_NOT_EQUAL_15M);
    }
    if (existError) {
      logger.debug(`[createTutorAvailableSchedule] ${httpResponses.LESSON_HAVE_TIME_EXISTED}`);
      return res.badRequest(httpResponses.LESSON_HAVE_TIME_EXISTED);
    }

    if (minTime.getMonth() != maxTime.getMonth()) {
      logger.debug(`[createTutorAvailableSchedule] ${httpResponses.LESSON_NOT_SAME_MONTH}`);
      return res.badRequest(httpResponses.LESSON_NOT_SAME_MONTH);
    }

    const existSchedule = await Promise.all(checkExist);

    const flexs = await Promise.all(flexExistApi);
    const fixed = await Promise.all(fixedExistApi);

    if (existSchedule.some((e) => e)) {
      logger.debug(`[createTutorAvailableSchedule] ${httpResponses.SCHEDULE_ALREADY_EXIST}`);
      return res.badRequest(httpResponses.SCHEDULE_ALREADY_EXIST);
    }
    if (flexs.some((e) => e)) {
      logger.debug(`[createTutorAvailableSchedule] ${httpResponses.FLEX_CALENDAR_DUPLICATE}`);
      return res.badRequest(httpResponses.FLEX_CALENDAR_DUPLICATE);
    }
    if (fixed.some((e) => e)) {
      logger.debug(`[createTutorAvailableSchedule] ${httpResponses.FIXED_CALENDAR_DUPLICATE}`);
      return res.badRequest(httpResponses.FIXED_CALENDAR_DUPLICATE);
    }
    const createdAvaiable = await tutorAvailableScheduleService.createManyTutorAvailableSchedules(process);

    return res.created(httpResponses.SUCCESS, {
      times: createdAvaiable,
      month: newModel.month,
    });
  } catch (err) {
    logger.error(`[createTutorAvailableSchedule] error -> ${err.message}`);
    res.status(httpResponses.HTTP_STATUS_INTERNAL_ERROR).json({
      success: false,
      message: `${err.message}`,
    });
  }
};
//#endregion createTutorAvailableSchedule

//#region getTutorAvailableSchedules
/**
 * Get tutor Available Schedule
 * @param {*} req
 * @param {*} res
 */
const getTutorAvailableSchedules = async (req, res) => {
  try {
    let { tutorId, firstDay, lastDay, timeZone } = req.query;

    const { tutor } = req.session;
    if (!tutorId && tutor) {
      tutorId = tutor._id;
    }
    logger.info(`[getTutorAvailableSchedules] query -> ${JSON.stringify(req.query)}`);
    const existTutor = await tutorService.getTutor({ _id: tutorId });

    if (!existTutor) {
      logger.debug(`[getTutorAvailableSchedules] ${httpResponses.TUTOR_NOT_FOUND}`);
      return res.notFound(httpResponses.TUTOR_NOT_FOUND);
    }

    timeZone = helper.convertTimezone(timeZone);

    const schedule = await tutorAvailableScheduleService.getTutorAvailableSchedulesByMonth({
      tutor: tutorId,
      firstDay,
      lastDay,
      timeZone,
    });

    return res.ok(httpResponses.SUCCESS, { schedules: schedule || [] });
  } catch (err) {
    logger.error(`[getTutorAvailableSchedules] error -> ${err.message}`);
    res.status(httpResponses.HTTP_STATUS_INTERNAL_ERROR).json({
      success: false,
      message: `${err.message}`,
    });
  }
};
//#endregion getTutorAvailableSchedule

//#region deleteTutorAvailableSchedules
/**
 * Get tutor Available Schedule
 * @param {*} req
 * @param {*} res
 */

const deleteTutorAvailableSchedules = async (req, res) => {
  try {
    const { tutor } = req.session;
    logger.info(`[deleteTutorAvailableSchedules] tutorId => ${tutor._id}`);

    const { deleteSchedules } = req.body;

    if (!deleteSchedules) {
      logger.debug(`[deleteTutorAvailableSchedules] ${httpResponses.QUERY_ERROR}`);
      return res.ok(httpResponses.QUERY_ERROR);
    }
    const processFlex = [];
    const processDel = deleteSchedules.map((sch) => {
      processFlex.push(flexibleLessonService.getFlexibleLesson({ available: sch._id }));
      return tutorAvailableScheduleService.deleteTutorTutorAvailableSchedule({ _id: sch._id });
    });

    const existsAvailable = await Promise.all(processDel);

    if (existsAvailable.some((ex) => !ex)) {
      logger.debug(`[deleteTutorAvailableSchedules] ${httpResponses.AVAILABLE_TIME_NOT_FOUND}`);
      return res.notFound(httpResponses.AVAILABLE_TIME_NOT_FOUND);
    }
    const existFlexs = await Promise.all(processFlex);

    if (existFlexs.some((ex) => !!ex)) {
      logger.debug(`[deleteTutorAvailableSchedules] ${httpResponses.LESSON_FLEXIBLE_EXISTED}`);
      return res.badRequest(httpResponses.LESSON_FLEXIBLE_EXISTED);
    }
    // await Promise.all(processDel);
    logger.debug(`[deleteTutorAvailableSchedules] ${httpResponses.SUCCESS}`);
    res.ok(httpResponses.SUCCESS);
  } catch (err) {
    logger.error(`[deleteTutorAvailableSchedules] error -> ${err.message}`);
    res.status(httpResponses.HTTP_STATUS_INTERNAL_ERROR).json({
      success: false,
      message: `${err.message}`,
    });
  }
};
//#endregion deleteTutorAvailableSchedules

module.exports = {
  createTutorAvailableSchedule,
  getTutorAvailableSchedules,
  deleteTutorAvailableSchedules,
};
