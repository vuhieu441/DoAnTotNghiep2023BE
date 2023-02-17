const logger = require('../utils/logger');
const httpResponses = require('../utils/httpResponses');

const gcpBucket = require('../helper/gcpBucket');
const helper = require('../helper/helperFunction');
const googleHelper = require('../helper/googleHelper');
const constants = require('../constants/constants');
const enums = require('../constants/enum');

// Service
const categoryService = require('../services/category');
const flexibleLessonService = require('../services/flexibleLesson');
const reviewService = require('../services/review');
const tutorService = require('../services/tutor');

//#region createFlexibleLesson
/**
 * Create flexible lesson
 * @param {*} req
 * @param {*} res
 * @returns
 */
const createFlexibleLesson = async (req, res) => {
  try {
    const { tutor } = req.session;
    const newModel = req.body;
    const { imageUrl, documentsUrl } = req.files;
    logger.info(`[createFlexibleLesson] req -> ${JSON.stringify(req.body)}`);
    newModel.tutor = tutor._id;

    //#region Generate Code and Check Exist
    const prefixCode = `FLEXIBLE_LESSON`;
    let existedLesson;
    do {
      newModel.code = helper.generateCodeCourse(prefixCode, 5);
      existedLesson = await flexibleLessonService.getFlexibleLesson({ code: newModel.code });
    } while (existedLesson);
    //#endregion Generate Code and Check Exist

    const tutorFound = await tutorService.getTutor({ _id: tutor._id });
    if (!tutorFound) {
      logger.debug(`[createFlexibleLesson]: getTutor -> ${httpResponses.TUTOR_NOT_FOUND}`);
      return res.notFound(httpResponses.TUTOR_NOT_FOUND);
    }

    const hours = await helper.calculateHour(newModel.startTime, newModel.endTime);
    newModel.price = tutor.salaryPerHour * hours;

    const existedCategory = await categoryService.checkExist().byId(newModel.category);
    if (!existedCategory) {
      logger.debug(`[createFlexibleLesson]: ${category} category -> ${httpResponses.CATEGORY_NOT_FOUND}`);
      return res.notFound(httpResponses.CATEGORY_NOT_FOUND);
    }

    if (imageUrl) {
      const urlGCS = await gcpBucket.sendUploadMultiToGCS(imageUrl);
      logger.debug(`[createFlexibleLesson]: upload avatar -> ${httpResponses.SUCCESS}`);
      newModel.imgUrl = urlGCS[0];
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
    newModel.status = enums.StatusFlexibleLesson.OPEN;
    newModel.skill = helper.jsonToObject(newModel.skill);

    const createdFlexLesson = await flexibleLessonService.createFlexibleLesson(newModel);

    logger.debug(`[createFlexibleLesson]: ${httpResponses.LESSON_CREATED_SUCCESSFULLY}`);
    if (tutorFound.googleCalendarTokens.refreshToken) {
      const startTime = newModel.startTime.split(' ').join('T').concat(':00');
      const endTime = newModel.startTime.split(' ').join('T').concat(':00');
      const event = {
        summary: createdFlexLesson.name,
        description: createdFlexLesson.description,
        startTime: startTime,
        endTime: endTime,
      };

      const link = await googleHelper.createMeeting(event, tutor.googleCalendarTokens.refreshToken);

      await flexibleLessonService.updateFlexibleLesson(createdFlexLesson._id, { linkMeet: link });
      return res.created(httpResponses.LESSON_CREATED_SUCCESSFULLY);
    }
    const state = {
      tutorId: tutorFound._id,
      lessonId: createdFlexLesson._id,
    };
    const authUrl = await googleHelper.generateAuthUrl(state);
    const data = { authUrl };
    return res.ok(httpResponses.SUCCESS, data);
  } catch (err) {
    logger.error(`[createFlexibleLesson] error -> ${err.message}`);
    res.internalServer(err.message);
  }
};
//#endregion createFlexibleLesson

//#region getAllFlexibleLessons
/**
 * Get all flexible lessons for role admin
 * @param {*} req
 * @param {*} res
 * @returns
 */
const getAllFlexibleLessons = async (req, res) => {
  try {
    const { _page, _limit, _textSearch, status, finish, isActive, type } = req.query;
    logger.info(`[getAllFlexibleLessons]: req.query -> ${JSON.stringify(req.query)}`);

    const pagination = {
      _page: +_page || constants.PAGINATION_DEFAULT_PAGE,
      _limit: +_limit || constants.PAGINATION_DEFAULT_LIMIT,
    };
    logger.info(`[getAllFlexibleLessons]: pagination -> ${JSON.stringify(pagination)}`);

    const _filter = {};
    _filter.status = status;
    _filter.finish = finish;
    _filter.isActive = isActive;
    _filter.type = type;
    logger.info(`[getAllFlexibleLessons]: filter -> ${JSON.stringify(_filter)}`);

    const flexibleLessons = await flexibleLessonService.getAllFlexibleLessonsForAdmin(
      {},
      { _textSearch, _filter, pagination, isActive }
    );
    logger.debug(`[getAllFlexibleLessons] getAllFlexibleLessonsForAdmin -> ${httpResponses.SUCCESS}`);

    const allLessons = await flexibleLessonService.getAllFlexibleLessons({});
    logger.debug(`[getAllFlexibleLessons]: getAllFlexibleLessons -> ${httpResponses.SUCCESS}`);

    const lessonsRes = [];
    for (let lesson of flexibleLessons.lessons) {
      const ratingAvg = await reviewService.getRatingAvgFlexibleLesson(lesson._id);

      lessonsRes.push({
        ...lesson,
        ratingAvg: ratingAvg,
      });
    }

    const dataResponse = {
      lessons: lessonsRes,
      _total: allLessons.length,
      pagination: {
        ...pagination,
        _total: flexibleLessons.total,
      },
    };

    return res.status(httpResponses.HTTP_STATUS_OK).json({
      success: true,
      data: dataResponse,
    });
  } catch (err) {
    logger.error(`[getAllFlexibleLessons] error -> ${err.message}`);
    res.internalServer(`${err.message}`);
  }
};
//#endregion getAllFlexibleLessons

//#region getAllFlexibleLessonsByStudent
/**
 * Get all flexible lessons for role student
 * @param {*} req
 * @param {*} res
 * @returns
 */
const getAllFlexibleLessonsByStudent = async (req, res) => {
  try {
    const { _page, _limit, ...query } = req.query;
    logger.info(`[getAllFlexibleLessonsByStudent]: query -> ${JSON.stringify(req.query)}`);
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

    let lessons;
    let _total;
    const result = await flexibleLessonService.getAllFlexibleLessonsForStudent(query, pagination);
    lessons = result.lessons;
    _total = result._total;
    logger.debug(`[getAllFlexibleLessonsByStudent]: getAllFlexibleLessonsForStudent -> ${httpResponses.SUCCESS}`);

    const dataResponse = {
      lessons,
      pagination: {
        ...pagination,
        _total,
      },
    };

    return res.status(httpResponses.HTTP_STATUS_OK).json({
      success: true,
      data: dataResponse,
    });
  } catch (err) {
    logger.error(`[getAllFlexibleLessons] error -> ${err.message}`);
    res.internalServer(`${err.message}`);
  }
};
//#endregion getAllFlexibleLessonsByStudent

//#region getDetailFlexibleLesson
/**
 * Get detail flexible lessons
 * @param {*} req
 * @param {*} res
 * @returns
 */
const getDetailFlexibleLesson = async (req, res) => {
  try {
    const { flexibleLessonId } = req.params;
    logger.info(`[getDetailFlexibleLesson]: flexibleLessonId -> ${flexibleLessonId}`);

    const lessons = await flexibleLessonService.getDetailFlexibleLessonForStudent(flexibleLessonId);
    if (!lessons[0]) {
      logger.info(`[getDetailFlexibleLesson]: getFlexibleLessonById -> ${httpResponses.LESSON_NOT_FOUND}`);
      return res.notFound(httpResponses.LESSON_NOT_FOUND);
    }

    return res.status(httpResponses.HTTP_STATUS_OK).json({
      success: true,
      data: {
        flexibleLesson: lessons[0],
      },
    });
  } catch (err) {
    logger.error(`[getAllFlexibleLessons] error -> ${err.message}`);
    res.internalServer(`${err.message}`);
  }
};

//#endregion getDetailFlexibleLesson

module.exports = {
  createFlexibleLesson,
  getAllFlexibleLessons,
  getAllFlexibleLessonsByStudent,
  getDetailFlexibleLesson,
};
