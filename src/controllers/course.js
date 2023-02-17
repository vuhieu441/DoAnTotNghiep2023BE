const logger = require('../utils/logger');
const httpResponses = require('../utils/httpResponses');

const courseService = require('../services/course');
const fixedLessonService = require('../services/fixedLesson');
const courseContentService = require('../services/courseContent');
const tutorService = require('../services/tutor');
const tutorCourseService = require('../services/tutorCourse');
const studentService = require('../services/student');
const reviewService = require('../services/review');

const mongoose = require('mongoose');
const ObjectId = mongoose.Types.ObjectId;

const moment = require('moment');
const gcpBucket = require('../helper/gcpBucket');
const helper = require('../helper/helperFunction');
const googleHelper = require('../helper/googleHelper');
const enums = require('../constants/enum');
const constants = require('../constants/constants');

//#region createCourse
/**
 * Create course
 * @param {*} req
 * @param {*} res
 * @returns
 */
const createCourse = async (req, res) => {
  try {
    const newModel = req.body;
    const { avatarUrl, documentsUrl } = req.files;
    logger.info(`[createCourse] req -> ${JSON.stringify(req.body)}`);

    const isActive = newModel.isActive === 'true';
    newModel.timetable && (newModel.timetable = helper.jsonToObject(newModel.timetable));
    newModel.courseContents && (newModel.courseContents = helper.jsonToObject(newModel.courseContents));
    newModel.description && (newModel.description = helper.jsonToObject(newModel.description));

    const now = moment().format('YYYY-MM-DD');
    const schedulesTutor = await tutorService.getScheduleByTutor(newModel.tutor, now);

    let timetableFixedLessons = [];
    if (newModel.timetable && +newModel.numberLessons > 0) {
      timetableFixedLessons = helper.getTimetableFixedLesson(
        newModel.openDay,
        +newModel.numberLessons,
        newModel.timetable
      );
      const lastLesson = timetableFixedLessons[timetableFixedLessons.length - 1];
      if (lastLesson) {
        newModel.endDay = helper.dateToStringLocal(lastLesson.endTime, constants.DATE_FORMAT);
      }
    }

    let sameTimeObj = null;
    for (const item of timetableFixedLessons) {
      sameTimeObj = schedulesTutor.find((x) => !(item.startTime >= x.end || item.endTime <= x.start));
      if (sameTimeObj) {
        break;
      }
    }

    if (sameTimeObj) {
      // Same Time Schedule
      logger.debug(`[createCourse]: Same Time Schedule -> ${httpResponses.SAME_TIME_SCHEDULE}`);
      return res.response(httpResponses.HTTP_STATUS_BAD_REQUEST, false, httpResponses.SAME_TIME_SCHEDULE, sameTimeObj);
    }

    if (isActive && !newModel.timetable) {
      logger.debug(`[createCourse]: timetable -> ${httpResponses.TIMETABLE_MISSING}`);
      return res.badRequest(httpResponses.TIMETABLE_MISSING);
    }

    if (isActive && !newModel.courseContents) {
      logger.debug(`[createCourse]: courseContent -> ${httpResponses.COURSE_CONTENT_MISSING}`);
      return res.badRequest(httpResponses.COURSE_CONTENT_MISSING);
    }

    if (isActive && !newModel.tutor) {
      logger.debug(`[createCourse]: courseContent -> ${httpResponses.TUTOR_MISSING}`);
      return res.badRequest(httpResponses.TUTOR_MISSING);
    }

    //#region Generate Code and Check Exist
    const prefixCode = `COURSE`;
    let existedCourse;
    do {
      newModel.code = helper.generateCodeCourse(prefixCode, 5);
      existedCourse = await courseService.getCourseByCode(newModel.code);
    } while (existedCourse);
    //#endregion Generate Code and Check Exist

    //#region Check Data Exist
    let existedTutor = null;
    if (newModel.tutor) {
      existedTutor = await tutorService.getDetailTutor(newModel.tutor);
      if (!existedTutor) {
        logger.debug(`[createCourse]: tutor -> ${httpResponses.TUTOR_NOT_FOUND}`);
        return res.status(httpResponses.HTTP_STATUS_NOT_FOUND).json({
          success: false,
          message: `${httpResponses.TUTOR_NOT_FOUND}`,
        });
      }
    }
    //#endregion Check Data Exist

    if (avatarUrl) {
      const urlGCP = await gcpBucket.sendUploadMultiToGCS(avatarUrl);
      logger.debug(`[createCourse]: upload avatar -> ${httpResponses.SUCCESS}`);
      newModel.avatarUrl = urlGCP[0];
    }

    if (documentsUrl) {
      const urlGCP = await gcpBucket.sendUploadMultiToGCS(documentsUrl);
      logger.debug(`[createCourse]: upload documents -> ${httpResponses.SUCCESS}`);
      newModel.documents = documentsUrl.map((d) => {
        return {
          name: d.originalname,
          createdAt: helper.dateToStringLocal(new Date(), constants.DATE_FORMAT),
          size: d.size,
          url: urlGCP.find((x) => x.includes(d.originalname)),
        };
      });
    }

    if (isActive) {
      const startLesson = timetableFixedLessons[0];
      if (existedTutor && existedTutor.googleCalendarTokens.refreshToken && startLesson) {
        const event = {
          summary: newModel.name,
          description: newModel.description.short,
          startTime: startLesson.startTime,
          endTime: startLesson.endTime,
        };
        logger.debug(`[createCourse] -->createMeeting`);
        const link = await googleHelper.createMeeting(event, existedTutor.googleCalendarTokens.refreshToken);
        if (!link) {
          logger.debug(`[createCourse] -->${httpResponses.CREATE_CALENDER_ERROR}`);
          return res.badRequest(httpResponses.CREATE_CALENDER_ERROR);
        }
        logger.debug(`[createCourse] -->${httpResponses.CREATE_CALENDER_SUCCESS}`);

        newModel.linkMeet = link;
      }
    }

    const newCourse = await courseService.createCourse(newModel);
    if (!newCourse) {
      logger.debug(`[createCourse]: createCourse -> ${httpResponses.FAIL}`);
      return res.status(httpResponses.HTTP_STATUS_INTERNAL_ERROR).json({
        success: false,
        message: `${httpResponses.COURSE_CREATED_FAIL}`,
      });
    }

    if (timetableFixedLessons.length > 0) {
      const lessons = timetableFixedLessons.map((timetable) => ({
        course: newCourse._id,
        startTime: timetable.startTime,
        endTime: timetable.endTime,
      }));
      await fixedLessonService.createFixedLessons(lessons);
    }

    if (newModel.courseContents) {
      const courseContents = newModel.courseContents.map((content) => ({
        ...content,
        course: newCourse._id,
      }));
      await courseContentService.create(courseContents);
    }

    if (newModel.tutor) {
      const tutorCourse = {
        tutor: newModel.tutor,
        course: newCourse._id,
      };
      await tutorCourseService.createTutorCourse(tutorCourse);
    }

    return res.status(httpResponses.HTTP_STATUS_CREATED).json({
      success: true,
      message: `${httpResponses.COURSE_CREATED_SUCCESSFULLY}`,
    });
  } catch (err) {
    logger.error(`[createCourse] error -> ${err.message}`);
    return res.status(httpResponses.HTTP_STATUS_INTERNAL_ERROR).json({
      success: false,
      message: `${err.message}`,
    });
  }
};
//#endregion createCourse

//#region getAllCourses
/**
 * Get all courses for role admin
 * @param {*} req
 * @param {*} res
 * @returns
 */
const getAllCourses = async (req, res) => {
  try {
    const { user } = req.session;
    const { _textSearch, _page, _limit, _language, _price, _time, _dow, _filter } = req.query;
    logger.info(`[getAllCourses]: query -> ${JSON.stringify(req.query)}`);

    const pagination = {
      _page: +_page || constants.PAGINATION_DEFAULT_PAGE,
      _limit: +_limit || constants.PAGINATION_DEFAULT_LIMIT,
    };
    logger.info(`[getAllCourses]: userId -> ${user._id}`);

    let response = {};
    switch (user.role) {
      case enums.UserRole.ADMIN:
      case enums.UserRole.CUSTOMER_SERVICE:
        const [{ courses, count }, total] = await Promise.all([
          courseService.getAllCoursesForAdmin(_textSearch, _filter, pagination),
          courseService.countCourses({}),
        ]);
        response = {
          courses: courses,
          total: total || 0,
          pagination: {
            ...pagination,
            _total: count,
          },
        };
        break;
      case enums.UserRole.STUDENT:
        const data = await courseService.getAllCoursesForStudent(
          _textSearch,
          _language,
          _price,
          _time,
          _dow,
          pagination
        );
        response = {
          courses: data.courses,
          pagination: {
            ...pagination,
            _total: data._total,
          },
        };
        break;
    }

    return res.status(httpResponses.HTTP_STATUS_OK).json({
      success: true,
      message: `${httpResponses.SUCCESS}`,
      data: response,
    });
  } catch (err) {
    logger.error(`[getAllCourses] error -> ${err.message}`);
    res.status(httpResponses.HTTP_STATUS_INTERNAL_ERROR).json({
      success: false,
      message: `${err.message}`,
    });
  }
};
//#endregion getAllCourses

//#region getCourseById
/**
 * Get Detail Course For Role Admin
 * @param {*} req
 * @param {*} res
 * @returns
 */
const getCourseById = async (req, res) => {
  try {
    const { user } = req.session;
    const { courseId } = req.params;
    logger.info(`[getCourseById]: userId -> ${user._id}`);

    let { _limit, _page } = req.query;
    logger.info(`[getDetailStudent] req.query -> ${req.query}`);

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

    let course;
    let review;
    let totalHourCourse;
    let response;

    switch (user.role) {
      case enums.UserRole.ADMIN:
      case enums.UserRole.CUSTOMER_SERVICE:
      case enums.UserRole.TUTOR:
        course = await courseService.getCoursesByIdForAdmin(courseId);
        if (!course || course.length === 0) {
          logger.debug(`[getCourseById]: getCoursesByIdForAdmin  -> ${httpResponses.COURSE_NOT_FOUND}`);
          return res.status(httpResponses.HTTP_STATUS_NOT_FOUND).json({
            success: false,
            message: `${httpResponses.COURSE_NOT_FOUND}`,
          });
        }
        const fixedLessons = await fixedLessonService.getFixedLessons({ course: courseId });

        let idFixedLessons = [];

        fixedLessons.forEach((fixed, index) => {
          const endTime = moment(fixed.endTime);
          const startTime = moment(fixed.startTime);
          const diff = endTime.diff(startTime, 'hour');
          totalHourCourse = totalHourCourse + diff;
          idFixedLessons.push(fixed._id);
        }, 0);

        review = await reviewService.getReviewByFixedLessons(idFixedLessons, pagination);
        //add pagination to review
        if (review) {
          pagination._total = review.data.length;
          review.pagination = pagination;
        }

        response = {
          course: {
            ...course[0],
            totalHourCourse,
            review,
          },
        };
        break;

      case enums.UserRole.STUDENT:
        course = await courseService.getCoursesByIdForStudent(courseId);
        response = {
          course: course[0],
        };
        break;
    }

    return res.status(httpResponses.HTTP_STATUS_OK).json({
      success: true,
      message: `${httpResponses.SUCCESS}`,
      data: response,
    });
  } catch (err) {
    logger.error(`[getCourseById]: error -> ${err.message}`);
    res.status(httpResponses.HTTP_STATUS_INTERNAL_ERROR).json({
      success: false,
      message: `${err.message}`,
    });
  }
};
//#endregion getCourseById

//#region updateCourse
/**
 * Update Course
 * @param {*} req
 * @param {*} res
 * @returns
 */
const updateCourse = async (req, res) => {
  try {
    const newModel = req.body;
    const { courseId } = req.params;
    logger.info(`[updateCourse] req -> ${JSON.stringify(req.body)}`);

    const existedCourse = await courseService.getCoursesByIdForAdmin(courseId);
    if (!existedCourse[0]) {
      logger.debug(`[updateCourse]: course -> ${httpResponses.COURSE_NOT_FOUND}`);
      return res.notFound(httpResponses.COURSE_NOT_FOUND);
    }
    if (existedCourse[0].isActive) {
      return res.badRequest(httpResponses.COURSE_ACTIVED);
    }
    const _existedCourse = existedCourse[0];

    const isActive = newModel.isActive === 'true';
    newModel.documents = _existedCourse.documents;
    newModel.timetable && (newModel.timetable = helper.jsonToObject(newModel.timetable));
    newModel.courseContents && (newModel.courseContents = helper.jsonToObject(newModel.courseContents));
    newModel.description && (newModel.description = helper.jsonToObject(newModel.description));
    newModel.documentsDeleted && (newModel.documentsDeleted = helper.jsonToObject(newModel.documentsDeleted));
    if (req.files) {
      const { avatarUrl, documentsUrl } = req.files;
      if (avatarUrl) {
        const urlGCS = await gcpBucket.sendUploadMultiToGCS(avatarUrl);
        logger.debug(`[updateCourse]: upload avatar -> ${httpResponses.SUCCESS}`);
        newModel.avatarUrl = urlGCS[0];
      }

      if (documentsUrl) {
        const urlGCP = await gcpBucket.sendUploadMultiToGCS(documentsUrl);
        logger.debug(`[updateCourse]: upload documents -> ${httpResponses.SUCCESS}`);
        const listDocs = documentsUrl.map((d) => {
          return {
            name: d.originalname,
            createdAt: helper.dateToStringLocal(new Date(), constants.DATE_FORMAT),
            size: d.size,
            url: urlGCP.find((x) => x.includes(d.originalname)),
          };
        });
        newModel.documents = newModel.documents.concat(listDocs);
      }
    }

    if (newModel.documentsDeleted) {
      newModel.documents = newModel.documents.filter(
        (x) => x._id && !newModel.documentsDeleted.includes(x._id.toString())
      );
    }

    if (newModel.courseContents) {
      await courseContentService.deletedCourseContent(courseId);
      logger.debug(`[updateCourse]: deletedCourseContent -> ${httpResponses.SUCCESS}`);
      const courseContents = newModel.courseContents.map((content) => ({
        ...content,
        course: courseId,
      }));
      await courseContentService.create(courseContents);
    }

    let timetableFixedLessons = [];
    if (newModel.openDay || newModel.timetable || newModel.numberLessons) {
      const timeTableCourse = {
        openDay: _existedCourse.openDay,
        numberLessons: _existedCourse.numberLessons,
        timetableCourses: _existedCourse.timetable,
      };
      newModel.openDay && (timeTableCourse.openDay = newModel.openDay);
      newModel.timetable && (timeTableCourse.timetableCourses = newModel.timetable);
      newModel.numberLessons && (timeTableCourse.numberLessons = newModel.numberLessons);
      timetableFixedLessons = helper.getTimetableFixedLesson(
        timeTableCourse.openDay,
        +timeTableCourse.numberLessons,
        timeTableCourse.timetableCourses
      );
      const lessons = timetableFixedLessons.map((timetable) => ({
        course: courseId,
        startTime: timetable.startTime,
        endTime: timetable.endTime,
      }));
      const lastLesson = timetableFixedLessons[timetableFixedLessons.length - 1];
      if (lastLesson) {
        newModel.endDay = helper.dateToStringLocal(lastLesson.endTime, constants.DATE_FORMAT);
      }

      await fixedLessonService.deleteManyByCourse(courseId);
      logger.debug(`[updateCourse]: deleteManyByCourse -> ${httpResponses.SUCCESS}`);
      await fixedLessonService.createFixedLessons(lessons);
      logger.debug(`[updateCourse]: createFixedLessons -> ${httpResponses.SUCCESS}`);
    }

    if (newModel.tutor) {
      await tutorCourseService.deleteManyTutorCourse({ course: courseId });
      logger.debug(`[updateCourse]: deleteManytutorCourse -> ${httpResponses.SUCCESS}`);
      const newTutorCourse = {
        course: courseId,
        tutor: newModel.tutor,
      };
      await tutorCourseService.createTutorCourse(newTutorCourse);
      logger.debug(`[updateCourse]: createTutorCourse -> ${httpResponses.SUCCESS}`);
    }

    if (isActive) {
      startLesson = timetableFixedLessons[0];
      const existedTutor = await tutorService.getDetailTutor(newModel.tutor);
      if (!existedTutor) {
        logger.debug(`[createCourse]: tutor -> ${httpResponses.TUTOR_NOT_FOUND}`);
        return res.status(httpResponses.HTTP_STATUS_NOT_FOUND).json({
          success: false,
          message: `${httpResponses.TUTOR_NOT_FOUND}`,
        });
      }

      if (existedTutor && existedTutor.googleCalendarTokens.refreshToken && startLesson) {
        const event = {
          summary: newModel.name,
          description: newModel.description.short,
          startTime: startLesson.startTime,
          endTime: startLesson.endTime,
        };

        const link = await googleHelper.createMeeting(event, existedTutor.googleCalendarTokens.refreshToken);
        newModel.linkMeet = link;
      }
    }

    const newCourse = await courseService.updateCourse(courseId, newModel);
    if (!newCourse) {
      logger.debug(`[updateCourse]: updateCourse -> ${httpResponses.FAIL}`);
      return res.internalServer(httpResponses.COURSE_UPDATED_FAIL);
    }

    return res.ok(httpResponses.COURSE_UPDATED_SUCCESSFULLY);
  } catch (err) {
    logger.error(`[updateCourse] error -> ${err.message}`);
    res.internalServer(err.message);
  }
};
//#endregion updateCourse

//#region activeCourse
/**
 * Active Course
 * @param {*} req
 * @param {*} res
 * @returns
 */
const activeCourse = async (req, res) => {
  try {
    const newModel = req.body;
    const { courseId } = req.params;
    logger.info(`[activeCourse] req -> ${JSON.stringify(req.body)}`);

    const tutorCourse = await tutorCourseService.getTutorCourse({ course: courseId });
    if (!tutorCourse) {
      logger.debug(`[activeCourse]: getTutorCourse -> ${httpResponses.COURSE_MISSING_TUTOR}`);
      return res.badRequest(httpResponses.COURSE_MISSING_TUTOR);
    }

    const newCourse = await courseService.updateCourse(courseId, newModel);
    if (!newCourse) {
      logger.debug(`[activeCourse]: activeCourse -> ${httpResponses.FAIL}`);
      return res.internalServer(httpResponses.COURSE_UPDATED_FAIL);
    }

    return res.created(httpResponses.COURSE_ACTIVED_SUCCESS);
  } catch (err) {
    logger.error(`[activeCourse] error -> ${err.message}`);
    res.internalServer(err.message);
  }
};
//#endregion activeCourse

//#region deleteCourseById
/**
 * Delete Course
 * @param {*} req courseId
 * @param {*} res
 * @returns
 */
const deleteCourseById = async (req, res) => {
  try {
    const { courseId } = req.params;
    logger.info(`[deleteCourseById] req -> ${JSON.stringify(req.body)}`);

    const course = await courseService.getCourseById(courseId);
    if (!course) {
      logger.debug(`[deleteCourseById]: getCourseById -> ${httpResponses.COURSE_NOT_FOUND}`);
      return res.notFound(httpResponses.COURSE_NOT_FOUND);
    }

    const deletedCourse = await courseService.deleteCourseById(courseId);
    if (!deletedCourse) {
      logger.debug(`[deleteCourseById]: deleteCourse -> ${httpResponses.FAIL}`);
      return res.internalServer(httpResponses.COURSE_DELETED_FAIL);
    }

    const deletedCourseContent = await courseContentService.deletedCourseContent(courseId);
    if (!deletedCourseContent) {
      logger.debug(`[deleteCourseById]: deletedCourseContent -> ${httpResponses.FAIL}`);
      return res.internalServer(httpResponses.COURSE_DELETED_FAIL);
    }

    //TODO Delete Fixed Lesson

    return res.created(httpResponses.COURSE_DELETED_SUCCESSFULLY);
  } catch (err) {
    logger.error(`[deleteCourseById] error -> ${err.message}`);
    res.internalServer(err.message);
  }
};
//#endregion deleteCourseById

//#region getAllCoursesByStudent
/**
 * Get all courses for student
 * @param {*} req
 * @param {*} res
 * @returns
 */
const getAllCoursesByStudent = async (req, res) => {
  try {
    const { student } = req.session;
    const { _page, _limit, ...query } = req.query;
    logger.info(`[getAllCoursesByStudent]: query -> ${JSON.stringify(req.query)}`);

    const pagination = {
      _page: +_page || constants.PAGINATION_DEFAULT_PAGE,
      _limit: +_limit || constants.PAGINATION_DEFAULT_LIMIT,
    };

    if (query._time) {
      query._time = helper.jsonToObject(query._time);
    }
    if (query._dow) {
      query._dow = helper.jsonToObject(query._dow);
    }
    if (query._language) {
      query._languageArray = query._language.split(constants.CHAR_COMMA);
    }

    let data = await courseService.getAllCoursesForStudent(query, pagination, student?._id);

    const response = {
      courses: data.courses,
      pagination: {
        ...pagination,
        _total: data._total,
      },
    };

    return res.status(httpResponses.HTTP_STATUS_OK).json({
      success: true,
      message: `${httpResponses.SUCCESS}`,
      data: response,
    });
  } catch (err) {
    logger.error(`[getAllCoursesByStudent] error -> ${err.message}`);
    res.status(httpResponses.HTTP_STATUS_INTERNAL_ERROR).json({
      success: false,
      message: `${err.message}`,
    });
  }
};
//#endregion getAllCoursesByStudent

//#region getDetailCourseByStudent
/**
 * Get Detail Course For Student
 * @param {*} req
 * @param {*} res
 * @returns
 */
const getDetailCourseByStudent = async (req, res) => {
  try {
    const { courseId } = req.params;

    const course = await courseService.getCoursesByIdForStudent(courseId);
    if (!course) {
      logger.info(`[getDetailCourseByStudent]: getCoursesByIdForStudent -> ${httpResponses.COURSE_NOT_FOUND}`);
      return res.notFound(httpResponses.COURSE_NOT_FOUND);
    }

    return res.status(httpResponses.HTTP_STATUS_OK).json({
      success: true,
      message: `${httpResponses.SUCCESS}`,
      data: {
        course,
      },
    });
  } catch (err) {
    logger.error(`[getCourseById]: error -> ${err.message}`);
    res.status(httpResponses.HTTP_STATUS_INTERNAL_ERROR).json({
      success: false,
      message: `${err.message}`,
    });
  }
};
//#endregion getDetailCourseByStudent

module.exports = {
  createCourse,
  getAllCourses,
  getCourseById,
  updateCourse,
  activeCourse,
  deleteCourseById,
  getAllCoursesByStudent,
  getDetailCourseByStudent,
};
