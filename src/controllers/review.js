const logger = require('../utils/logger');
const httpResponses = require('../utils/httpResponses');

// Service
const reviewService = require('../services/review');
const tutorService = require('../services/tutor');
const flexibleService = require('../services/flexibleLesson');
const fixedService = require('../services/fixedLesson');

const helper = require('../helper/helperFunction');
const enums = require('../constants/enum');
const constants = require('../constants/constants');
const mongoose = require('mongoose');
const ObjectId = mongoose.Types.ObjectId;

/**
 * Create review
 * @param {*} req
 * @param {*} res
 * @returns
 */
const createReview = async (req, res) => {
  try {
    const newModel = req.body;
    const { student } = req.session;
    newModel.student = student._id;
    logger.info(`[createReview] req.body -> ${JSON.stringify(newModel)} - studentId -> ${JSON.stringify(student._id)}`);

    const now = helper.dateToStringLocal(Date.now(), constants.DATE_TIME_FORMAT);
    logger.info(`[createReview] dateNow -> ${now}`);

    let existReview;
    let existFixed;
    let existFlex;
    if (newModel.fixedLesson) {
      [existReview, existFixed] = await Promise.all([
        reviewService.getReviewByFilter({
          fixedLesson: newModel.fixedLesson,
          student: newModel.student,
        }),
        fixedService.getFixedLesson({ _id: newModel.fixedLesson }),
      ]);
    } else {
      [existReview, existFlex] = await Promise.all([
        reviewService.getReviewByFilter({
          flexibleLesson: newModel.flexibleLesson,
          student: newModel.student,
        }),
        flexibleService.getFlexibleLesson({ _id: newModel.flexibleLesson }),
      ]);
    }

    if (existFixed) {
      if (now < helper.convertDateMongoDbToStringLocal(existFixed.startTime)) {
        logger.debug(`[createReview]: ${httpResponses.CLASS_NOT_START}`);
        return res.badRequest(httpResponses.CLASS_NOT_START);
      }
    }
    if (existFlex) {
      if (now < helper.convertDateMongoDbToStringLocal(existFlex.startTime)) {
        logger.debug(`[createReview]: ${httpResponses.CLASS_NOT_START}`);
        return res.badRequest(httpResponses.CLASS_NOT_START);
      }
    }
    if (existReview) {
      logger.debug(`[createReview]: ${httpResponses.STUDENT_HAVE_ONLY_REVIEW}`);
      return res.badRequest(httpResponses.STUDENT_HAVE_ONLY_REVIEW);
    }
    if (!existFixed && !existFlex) {
      logger.debug(`[createReview]: ${httpResponses.COURSE_NOT_FOUND}`);
      return res.notFound(httpResponses.COURSE_NOT_FOUND);
    }

    // const existTutor = await tutorService.getTutorById(newModel.tutor);
    // if (!existTutor) {
    //   logger.debug(`[createReview]: ${httpResponses.TUTOR_NOT_FOUND}`);
    //   return res.notFound(httpResponses.TUTOR_NOT_FOUND);
    // }

    await reviewService.createReview(newModel);
    logger.debug(`[createReview]: ${httpResponses.REVIEW_CREATED_SUCCESSFULLY}`);
    return res.status(httpResponses.HTTP_STATUS_CREATED).json({
      success: true,
      message: `${httpResponses.REVIEW_CREATED_SUCCESSFULLY}`,
    });
  } catch (err) {
    logger.error(`[createReview] error -> ${err.message}`);
    res.status(httpResponses.HTTP_STATUS_INTERNAL_ERROR).json({
      success: false,
      message: `${err.message}`,
    });
  }
};

/**
 * Get all reviews
 * @param {*} req
 * @param {*} res
 * @returns
 */
const getAllReviews = async (req, res) => {
  try {
    const { type, ...filter } = req.query;
    logger.info(`[getAllReviews]: filter -> ${JSON.stringify(filter)}`);

    const pagination = {
      _limit: +filter._limit || constants.PAGINATION_DEFAULT_LIMIT,
      _page: +filter._page || constants.PAGINATION_DEFAULT_PAGE,
    };

    let reviews = [];
    switch (type) {
      case enums.UserRole.STUDENT:
        reviews = await reviewService.getReviewsByFilter({ student: ObjectId(filter.idStudent) }, pagination);
        break;
      case enums.UserRole.TUTOR:
        reviews = await reviewService.getReviewByTutor(filter.idTutor, pagination);
        break;
      case enums.LessonType.FIXED:
        const fixedLessons = await fixedService.getFixedLessons({ course: filter.idCourse });
        let idFixedLessons = [];
        fixedLessons.forEach((fixed) => {
          idFixedLessons.push(fixed._id);
        });
        reviews = await reviewService.getReviewByFixedLessons(idFixedLessons, pagination);
        break;
      default:
        break;
    }

    return res.status(httpResponses.HTTP_STATUS_OK).json({
      success: true,
      message: `${httpResponses.SUCCESS}`,
      data: {
        reviews,
      },
    });
  } catch (err) {
    logger.error(`[getAllReviews] error -> ${err.message}`);
    res.status(httpResponses.HTTP_STATUS_INTERNAL_ERROR).json({
      success: false,
      message: `${err.message}`,
    });
  }
};

module.exports = {
  createReview,
  getAllReviews,
};
