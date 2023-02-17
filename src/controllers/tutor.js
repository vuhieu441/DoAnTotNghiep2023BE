const logger = require('../utils/logger');
const moment = require('moment');
const httpResponses = require('../utils/httpResponses');
const utility = require('../utils/utility');
const constants = require('../constants/constants');
const enums = require('../constants/enum');

// Service
const tutorService = require('../services/tutor');
const userService = require('../services/user');
const securityService = require('../services/security');
const reviewService = require('../services/review');
const tutorRegisterService = require('../services/tutorRegister');

// Helper
const mailerHelper = require('../helper/mailer');
const templateHelper = require('../helper/template');
const helper = require('../helper/helperFunction');
const helperGCP = require('../helper/gcpBucket');
const gcpBucket = require('../helper/gcpBucket');
const pdfPuppeteer = require('../helper/generatePdfPuppeteer');
const pdfHtml = require('../helper/pdfHtml');
const mongoose = require('mongoose');
const ObjectId = mongoose.Types.ObjectId;

//#region createTutor
/**
 * Create Tutor
 * @param {*} req
 * @param {*} res
 * @returns
 */
const createTutor = async (req, res) => {
  try {
    const newModel = req.body;
    const { cersUrl } = req.files;
    logger.info(`[createTutor] req -> ${JSON.stringify(req.body)}`);

    /** Validate */
    if (!utility.checkGender(newModel.gender)) {
      logger.debug(`[createTutor]: ${gender} gender -> ${httpResponses.GENDER_NOT_FOUND}`);
      return res.status(httpResponses.HTTP_STATUS_BAD_REQUEST).json({
        success: false,
        message: `${httpResponses.GENDER_NOT_FOUND}`,
      });
    }

    if (!utility.checkNationality(newModel.nationality)) {
      logger.debug(`[createTutor]: ${nationality} nationality -> ${httpResponses.NATIONALITY_NOT_FOUND}`);
      return res.status(httpResponses.HTTP_STATUS_BAD_REQUEST).json({
        success: false,
        message: `${httpResponses.NATIONALITY_NOT_FOUND}`,
      });
    }

    if (!newModel.email || !constants.REGEX_VALID_GMAIL.test(newModel.email)) {
      logger.debug(`[createTutor] ${newModel.email} email ->${httpResponses.EMAIL_INVALID}`);
      return res.badRequest(httpResponses.EMAIL_INVALID);
    }

    const existedUser = await userService.getUserByEmail(newModel.email);
    if (existedUser) {
      logger.debug(`[createTutor]: ${newModel.email} email -> ${httpResponses.USER_EXISTED}`);
      return res.status(httpResponses.HTTP_STATUS_BAD_REQUEST).json({
        success: false,
        message: `${httpResponses.USER_EXISTED}`,
      });
    }

    /** Parse the request to json */
    newModel.certificates && (newModel.certificates = helper.jsonToObject(newModel.certificates));
    newModel.languages && (newModel.languages = helper.jsonToObject(newModel.languages));
    newModel.phoneNumber && (newModel.phoneNumber = helper.jsonToObject(newModel.phoneNumber));
    logger.debug(`[createTutor] languages -> ${newModel.languages}`);

    if (newModel.isActive) {
      newModel.startDate = helper.dateToStringLocal(new Date(), constants.DATE_TIME);
    }

    /** Upload image */
    if (cersUrl) {
      const urlGCP = await gcpBucket.sendUploadMultiToGCS(cersUrl);
      logger.debug(`[createTutor]: upload documents -> ${httpResponses.SUCCESS}`);

      newModel.certificates = newModel.certificates.map((cer) => {
        return {
          ...cer,
          cerUrl: urlGCP.find((x) => x.includes(cer.fileName)),
        };
      });
    }

    /** Generate password */
    const password = helper.generatePassword();
    // logger.info(`[Create User]-> password: ${password}`);
    const hashPassword = await securityService.hashPassword(password);
    logger.debug(`[createTutor]: hashPassword -> ${httpResponses.SUCCESS}`);

    const newUser = {
      email: newModel.email,
      password: hashPassword,
      role: enums.UserRole.TUTOR,
    };

    const template = templateHelper.sendMailCreateForTutor(password, newModel.email, newModel.returnUrl);
    const mailSuccess = await mailerHelper.sendGmail(template);
    if (!mailSuccess.success) {
      return res.status(httpResponses.HTTP_STATUS_INTERNAL_ERROR).json({
        success: false,
        message: `${httpResponses.SEND_MAIL_ERROR}`,
        messageTitle: `${mailSuccess.message}`,
      });
    }
    logger.debug(`[sendMailForTutor]: -> ${httpResponses.SEND_MAIL_SUCCESS}`);

    const user = await userService.createUser(newUser);
    newModel.user = user._id;
    const newTutor = await tutorService.createTutor(newModel);

    if (!newTutor) {
      logger.debug(`[createTutor] sendMail ${httpResponses.TUTOR_CREATED_ERROR} `);
      return res.badRequest(httpResponses.TUTOR_CREATED_ERROR);
    }

    logger.debug(`[createTutor]: ${httpResponses.TUTOR_CREATED_SUCCESSFULLY}`);
    return res.created(httpResponses.TUTOR_CREATED_SUCCESSFULLY);
  } catch (err) {
    logger.error(`[createTutor] error -> ${err.message}`);
    res.status(httpResponses.HTTP_STATUS_INTERNAL_ERROR).json({
      success: false,
      message: `${err.message}`,
    });
  }
};
//#endregion createTutor

//#region getAllTutors
/**
 * Get all tutors
 * // @TODO -> get some field total student total hours for teaching
 * @param {*} req
 * @param {*} res
 * @returns
 */
const getAllTutors = async (req, res) => {
  try {
    const { user } = req.session;
    const { _textSearch, _page, _limit, _status } = req.query;
    logger.info(`[getAllTutors] query -> ${JSON.stringify(req.query)} user -> ${user._id}`);

    if (+_page === 0) {
      const tutors = await tutorService.getAllTutorsNoPagination();
      logger.debug(`[getAllTutors] getAllTutorsNoPagination -> ${httpResponses.SUCCESS}`);
      return res.ok(null, tutors);
    }

    const pagination = {
      _page: +_page || constants.PAGINATION_DEFAULT_PAGE,
      _limit: +_limit || constants.PAGINATION_DEFAULT_LIMIT,
    };

    const [{ tutors, count }, total] = await Promise.all([
      tutorService.getAllTutors(_textSearch, _status, pagination),
      tutorService.countTutors({}),
    ]);

    return res.status(httpResponses.HTTP_STATUS_OK).json({
      success: true,
      message: `${httpResponses.SUCCESS}`,
      data: {
        tutors,
        total,
        pagination: {
          ...pagination,
          _total: count,
        },
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
//#endregion getAllTutors

//#region getAllTutorsByStudent
/**
 * Get all tutors by students
 * @param {*} req
 * @param {*} res
 * @returns
 */
const getAllTutorsByStudent = async (req, res) => {
  try {
    const { _textSearch, _page, _limit, _dow, _time, _language, _price, _timezone, firstDay, lastDay } = req.query;
    logger.info(`[getAllTutorsByStudent]: query -> ${JSON.stringify(req.query)}`);

    const pagination = {
      _page: +_page || constants.PAGINATION_DEFAULT_PAGE,
      _limit: +_limit || constants.PAGINATION_DEFAULT_LIMIT,
    };
    logger.info(`[getAllTutorsByStudent]: pagination -> ${JSON.stringify(pagination)}`);

    let _dayArray, _timeArray, _languageArray;
    if (_time) {
      _timeArray = helper.jsonToObject(_time);
    }
    if (_dow) {
      _dayArray = helper.jsonToObject(_dow);
    }
    if (_language) {
      _languageArray = _language.split(constants.CHAR_COMMA);
      logger.info(`[getAllTutorsByStudent]: _languageArray -> ${JSON.stringify(_languageArray)}`);
    }
    logger.info(`[getAllTutorsByStudent]: filter -> ${httpResponses.SUCCESS}`);

    const [{ tutors, count }, total] = await Promise.all([
      tutorService.getAllTutorsByStudent(_textSearch, pagination, {
        _languageArray,
        _price,
        _dayArray,
        _timeArray,
        _timezone,
        firstDay,
        lastDay,
      }),
      tutorService.countTutors({}),
    ]);

    return res.status(httpResponses.HTTP_STATUS_OK).json({
      success: true,
      message: `${httpResponses.SUCCESS}`,
      data: {
        tutors,
        total,
        pagination: {
          ...pagination,
          _total: count,
        },
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
//#endregion getAllTutorsByStudent

/**
 * Get tutor
 * @todo -> get info for review, fixedCourse, flexibleCourse, ...
 * @param {*} req
 * @param {*} res
 * @returns
 */
const getTutorById = async (req, res) => {
  try {
    const { _id } = req.params;
    logger.info(`[getTutor] req.params -> ${_id}`);

    let { _limit, _page } = req.query;
    logger.info(`[getTutor] req.query -> ${JSON.stringify(req.query)}`);

    const tutor = await tutorService.getDetailTutor(_id);
    if (!tutor) {
      logger.debug(`[getTutor]: -> ${httpResponses.TUTOR_NOT_FOUND}`);
      return res.status(httpResponses.HTTP_STATUS_NOT_FOUND).json({
        success: false,
        message: `${httpResponses.TUTOR_NOT_FOUND}`,
      });
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

    const startTime = moment().startOf('month').format('YYYY-MM-DD');
    const endTime = moment().endOf('month').format('YYYY-MM-DD');

    const [tutorInformation, reviews, schedules, studentsAndTotalTime] = await Promise.all([
      tutorService.getTutorById(_id),
      reviewService.getReviewByTutor(_id, pagination),
      tutorService.getScheduleByTutor(_id, startTime, endTime),
      tutorService.getStudentTaughtAndTotalTimeByTutorId(_id),
    ]);
    logger.debug(`[getTutor]: ${httpResponses.SUCCESS}`);

    //add pagination to review
    if (reviews) {
      pagination._total = reviews.data.length;
      reviews.pagination = pagination;
    }

    return res.status(httpResponses.HTTP_STATUS_OK).json({
      success: true,
      message: `${httpResponses.SUCCESS}`,
      data: {
        tutor: tutorInformation || {},
        review: reviews,
        schedules,
        ...studentsAndTotalTime,
      },
    });
  } catch (err) {
    logger.error(`[getTutor] error -> ${err.message}`);
    res.status(httpResponses.HTTP_STATUS_INTERNAL_ERROR).json({
      success: false,
      message: `${err.message}`,
    });
  }
};

/**
 * Get tutor
 * // @TODO -> get Info for review, fixedCourse, flexibleCourse, ...
 * @param {*} req
 * @param {*} res
 * @returns
 */
const getTutorByIdByStudent = async (req, res) => {
  try {
    const { _id } = req.params;
    const { month, _limit, _page } = req.query;

    logger.info(`[getTutorByIdByStudent] [getTutor] req.params -> ${_id}, req.query -> ${req.query}`);

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

    const tutor = await tutorService.getDetailTutor(_id);
    if (!tutor) {
      logger.debug(`[getTutor]: -> ${httpResponses.TUTOR_NOT_FOUND}`);
      return res.status(httpResponses.HTTP_STATUS_NOT_FOUND).json({
        success: false,
        message: `${httpResponses.TUTOR_NOT_FOUND}`,
      });
    }

    const time = month ? new Date(month) : new Date();

    const startTime = moment(time).startOf('month').format('YYYY-MM-DD');
    const endTime = moment(time).endOf('month').format('YYYY-MM-DD');
    logger.info(`[getTutor] time -> ${time}, startTime -> ${startTime}, endTime -> ${endTime}`);

    const [tutorInformation, reviews, schedules] = await Promise.all([
      tutorService.getTutorById(_id),
      reviewService.getReviewByTutor(_id, pagination),
      tutorService.getScheduleAvailableByTutor(_id, startTime, endTime),
    ]);

    if (reviews) {
      pagination._total = reviews.data.length;
      reviews.pagination = pagination;
    }

    logger.debug(`[getTutor]: ${httpResponses.SUCCESS}`);
    return res.status(httpResponses.HTTP_STATUS_OK).json({
      success: true,
      message: `${httpResponses.SUCCESS}`,
      data: {
        tutor: tutorInformation,
        review: reviews,
        schedules,
      },
    });
  } catch (err) {
    logger.error(`[getTutor] error -> ${err.message}`);
    res.status(httpResponses.HTTP_STATUS_INTERNAL_ERROR).json({
      success: false,
      message: `${err.message}`,
    });
  }
};

/**
 * Get schedule by tutor id
 * // @TODO -> get Info schedules
 * @param {*} req
 * @param {*} res
 * @returns
 */
const getScheduleByTutorId = async (req, res) => {
  try {
    const { _id } = req.params;
    const { startTime, endTime } = req.query;

    logger.info(`[getScheduleByTutorId] req.params -> ${_id}`);
    logger.info(`[getScheduleByTutorId] req.query -> ${JSON.stringify(req.query)}`);

    const tutor = await tutorService.getDetailTutor(_id);
    if (!tutor) {
      logger.debug(`[getScheduleByTutorId]: -> ${httpResponses.TUTOR_NOT_FOUND}`);
      return res.status(httpResponses.HTTP_STATUS_NOT_FOUND).json({
        success: false,
        message: `${httpResponses.TUTOR_NOT_FOUND}`,
      });
    }

    const schedules = await tutorService.getScheduleByTutor(_id, startTime, endTime);

    logger.debug(`[getScheduleByTutorId]: ${httpResponses.SUCCESS}`);
    return res.status(httpResponses.HTTP_STATUS_OK).json({
      success: true,
      message: `${httpResponses.SUCCESS}`,
      data: {
        schedules,
      },
    });
  } catch (err) {
    logger.error(`[getScheduleByTutorId]: error -> ${err.message}`);
    res.status(httpResponses.HTTP_STATUS_INTERNAL_ERROR).json({
      success: false,
      message: `${err.message}`,
    });
  }
};

/**
 * Get schedule by tutor id
 * // @TODO -> get Info schedules
 * @param {*} req
 * @param {*} res
 * @returns
 */
const getScheduleByTutor = async (req, res) => {
  try {
    const { tutor } = req.session;
    let { startTime, endTime } = req.query;
    logger.info(`[getScheduleByTutor] req.query -> ${JSON.stringify(req.query)}`);

    startTime = startTime || moment().startOf('month').format('YYYY-MM-DD');
    endTime = endTime || moment().endOf('month').format('YYYY-MM-DD');

    const schedules = await tutorService.getScheduleByTutor(tutor._id, startTime, endTime);

    logger.debug(`[getScheduleByTutor]: ${httpResponses.SUCCESS}`);
    return res.status(httpResponses.HTTP_STATUS_OK).json({
      success: true,
      message: `${httpResponses.SUCCESS}`,
      data: {
        schedules,
      },
    });
  } catch (err) {
    logger.error(`[getScheduleByTutor]: error -> ${err.message}`);
    res.status(httpResponses.HTTP_STATUS_INTERNAL_ERROR).json({
      success: false,
      message: `${err.message}`,
    });
  }
};

/**
 * Update Tutor
 * // @TODO -> this is still in progress
 * @param {*} req
 * @param {*} res
 * @returns
 */
const updateTutor = async (req, res) => {
  try {
    const { _id } = req.params;
    const { avatarUrl } = req.files;
    const newModel = req.body;
    logger.info(`[updateTutor]: newModel -> ${JSON.stringify(newModel)}, avatarUrl -> ${avatarUrl}`);

    const tutorId = _id;
    logger.info(`[updateTutor]: tutorId -> ${tutorId}`);

    const existedTutor = await tutorService.getTutor({ _id: tutorId });
    if (!existedTutor) {
      logger.debug(`[updateTutor]: -> ${httpResponses.TUTOR_NOT_FOUND}`);
      return res.notFound(httpResponses.TUTOR_NOT_FOUND);
    }

    if (newModel.gender && !utility.checkGender(newModel.gender)) {
      logger.debug(`[updateTutor]: ${newModel.gender} gender -> ${httpResponses.GENDER_NOT_FOUND}`);
      return res.badRequest(httpResponses.GENDER_NOT_FOUND);
    }

    if (newModel.nationality && !utility.checkNationality(newModel.nationality)) {
      logger.debug(`[updateTutor]: ${newModel.nationality} nationality -> ${httpResponses.NATIONALITY_NOT_FOUND}`);
      return res.badRequest(httpResponses.NATIONALITY_NOT_FOUND);
    }

    newModel.languages && (newModel.languages = helper.jsonToObject(newModel.languages));
    newModel.phoneNumber && (newModel.phoneNumber = helper.jsonToObject(newModel.phoneNumber));

    if (newModel.isActive) {
      newModel.startDate = helper.dateToStringLocal(new Date(), constants.DATE_FORMAT);
    }

    if (avatarUrl) {
      const avatarGCP = await helper.sendUploadMultiToGCS([avatarUrl]);
      newModel.avatarUrl = avatarGCP[0];
    }

    await tutorService.updateTutor(tutorId, newModel);

    logger.debug(`[updateTutor]: ${httpResponses.TUTOR_UPDATED_SUCCESSFULLY}`);
    return res.created(httpResponses.TUTOR_UPDATED_SUCCESSFULLY);
  } catch (err) {
    logger.error(`[updateTutor] error -> ${err.message}`);
    res.status(httpResponses.HTTP_STATUS_INTERNAL_ERROR).json({
      success: false,
      message: `${err.message}`,
    });
  }
};

/**
 * Delete tutor
 * @param {*} req
 * @param {*} res
 * @returns
 */
const deleteTutor = async (req, res) => {
  try {
    const { _id } = req.params;
    logger.info(`[deleteTutor]: req.params -> ${_id}`);

    const existedTutor = await tutorService.getTutor({ _id: _id });
    if (!existedTutor) {
      logger.debug(`[deleteTutor]: -> ${httpResponses.TUTOR_NOT_FOUND}`);
      return res.status(httpResponses.HTTP_STATUS_NOT_FOUND).json({
        success: false,
        message: `${httpResponses.TUTOR_NOT_FOUND}`,
      });
    }

    await tutorService.deleteTutor(_id);
    await userService.deleteUser({ _id: existedTutor.user });
    logger.debug(`[deleteTutor]: ${httpResponses.TUTOR_DELETED_SUCCESSFULLY}`);

    return res.status(httpResponses.HTTP_STATUS_OK).json({
      success: true,
      message: `${httpResponses.TUTOR_DELETED_SUCCESSFULLY}`,
    });
  } catch (err) {
    logger.error(`[deleteTutor] error -> ${err.message}`);
    res.status(httpResponses.HTTP_STATUS_INTERNAL_ERROR).json({
      success: false,
      message: `${err.message}`,
    });
  }
};

/**
 * Block tutor
 * @param {*} req
 * @param {*} res
 * @returns
 */
const blockTutor = async (req, res) => {
  try {
    const { _id } = req.params;
    const newModel = req.body;
    logger.info(`[blockTutor]: req.params -> ${_id}`);

    const existedTutor = await tutorService.getTutor({ _id: _id });
    if (!existedTutor) {
      logger.debug(`[blockTutor]: -> ${httpResponses.TUTOR_NOT_FOUND}`);
      return res.status(httpResponses.HTTP_STATUS_NOT_FOUND).json({
        success: false,
        message: `${httpResponses.TUTOR_NOT_FOUND}`,
      });
    }

    await tutorService.updateTutor(_id, newModel);
    logger.debug(`[blockTutor]: ${httpResponses.TUTOR_BLOCKED_SUCCESSFULLY}`);

    return res.status(httpResponses.HTTP_STATUS_OK).json({
      success: true,
      message: `${httpResponses.TUTOR_BLOCKED_SUCCESSFULLY}`,
    });
  } catch (err) {
    logger.error(`[deleteTutor] error -> ${err.message}`);
    res.status(httpResponses.HTTP_STATUS_INTERNAL_ERROR).json({
      success: false,
      message: `${err.message}`,
    });
  }
};

/**
 * Send mail for tutor
 * @param {*} req
 * @param {*} res
 * @returns
 */
const sendMailForTutor = async (req, res) => {
  try {
    const { _id } = req.params;
    logger.info(`[sendMailForTutor]: req.params -> ${_id}`);

    const { subject, body } = req.body;

    const existedTutor = await tutorService.getDetailTutor({ _id: _id });
    if (!existedTutor) {
      logger.debug(`[sendMailForTutor]: -> ${httpResponses.TUTOR_NOT_FOUND}`);
      return res.status(httpResponses.HTTP_STATUS_NOT_FOUND).json({
        success: false,
        message: `${httpResponses.TUTOR_NOT_FOUND}`,
      });
    }

    const template = templateHelper.sendMailForTutor(subject, body, existedTutor.user.email);
    const mailSuccess = await mailerHelper.sendGmail(template);
    if (!mailSuccess.success) {
      return res.status(httpResponses.HTTP_STATUS_INTERNAL_ERROR).json({
        success: false,
        message: `${httpResponses.SEND_MAIL_ERROR}`,
        messageTitle: `${mailSuccess.message}`,
      });
    }

    logger.debug(`[sendMailForTutor]: -> ${httpResponses.SEND_MAIL_SUCCESS}`);

    return res.status(httpResponses.HTTP_STATUS_OK).json({
      success: true,
      message: `${httpResponses.SEND_MAIL_SUCCESS}`,
    });
  } catch (err) {
    logger.error(`[sendMailForTutor] error -> ${err.message}`);
    res.status(httpResponses.HTTP_STATUS_INTERNAL_ERROR).json({
      success: false,
      message: `${err.message}`,
    });
  }
};

/**
 * Send mail for tutor
 * @param {*} req
 * @param {*} res
 * @returns
 */
const getScheduleAvailableOfTutor = async (req, res) => {
  try {
    const { _id } = req.params;
    logger.info(`[getScheduleAvailableOfTutor]: tutorId -> ${_id}`);

    const tutor = await tutorService.getTutor({ _id: _id });
    if (!tutor) {
      logger.debug(`[getScheduleAvailableOfTutor] getTutor -> ${httpResponses.TUTOR_NOT_FOUND}`);
      return res.badRequest(httpResponses.TUTOR_NOT_FOUND);
    }
    const schedulesAvailable = await tutorService.getScheduleAvailableByTutor(_id);

    const dataResponse = {
      schedulesAvailable,
    };

    logger.debug(`[getScheduleAvailableOfTutor] getScheduleAvailableByTutor -> ${httpResponses.SUCCESS}`);
    return res.ok(httpResponses.SUCCESS, dataResponse);
  } catch (err) {
    logger.debug(`[getScheduleAvailableOfTutor] error -> ${err.message}`);
    return res.internalServer(err.message);
  }
};

/**
 * Get profile of tutor
 * @param {*} req
 * @param {*} res
 * @returns
 */
const getProfileTutor = async (req, res) => {
  try {
    const { tutor } = req.session;
    const tutorId = tutor._id;
    logger.info(`[getProfileTutor] tutorId -> ${tutorId}`);

    const tutorExisted = await tutorService.getTutorById(tutorId);

    return res.ok(httpResponses.SUCCESS, { tutor: tutorExisted });
  } catch (err) {
    logger.debug(`[getProfileTutor] error -> ${err.message}`);
    return res.internalServer(err.message);
  }
};

/**
 * Get student taught
 * @param {*} req
 * @param {*} res
 * @return
 */
const getStudentTaught = async (req, res) => {
  try {
    const { tutor } = req.session;
    const tutorId = tutor._id;
    let { _page, _limit, _textSearch } = req.query;

    const pagination = {
      _page: +_page || constants.PAGINATION_DEFAULT_PAGE,
      _limit: +_limit || constants.PAGINATION_DEFAULT_LIMIT,
    };

    logger.info(`[getStudentTaught]: tutorId -> ${tutorId}`);

    const data = await tutorService.getStudentTaught(tutorId, _textSearch, pagination);
    return res.ok(httpResponses.SUCCESS, {
      studentTaught: data.dataQuerys,
      total: data.total,
      pagination: {
        ...pagination,
        _total: data._total,
      },
    });
  } catch (error) {
    logger.debug(`[getStudentTaught]: error -> ${error.message}`);
    return res.internalServer(error.message);
  }
};

/**
 ** Get classes have been taught by tutor of tutor
 * @param {*} req
 * @param {*} res
 * @returns
 */
const getFixedTaughtByTutor = async (req, res) => {
  try {
    const { tutor } = req.session;
    const tutorId = tutor._id;
    let { _textSearch, _page, _limit } = req.query;
    logger.info(`[getFixedTaughtByTutor] tutorId -> ${tutorId}, query -> ${JSON.stringify(req.query)}`);

    let pagination = {
      _page: +_page || constants.PAGINATION_DEFAULT_PAGE,
      _limit: +_limit || constants.PAGINATION_DEFAULT_LIMIT,
    };
    logger.info(`[getFixedTaughtByTutor] pagination -> ${JSON.stringify(pagination)}`);

    const getAllScheduleFixed = await tutorService.getFixedTaughtByTutor(tutorId, _textSearch, pagination);
    pagination._total = getAllScheduleFixed.count;

    return res.ok(httpResponses.SUCCESS, {
      scheduleFixed: getAllScheduleFixed.scheduleFixed,
      pagination: pagination,
      total: getAllScheduleFixed.total,
    });
  } catch (err) {
    logger.debug(`[getFixedTaughtByTutor] error -> ${err.message}`);
    return res.internalServer(err.message);
  }
};

/**
 * Get lesson flex taught by tutor
 * @param {*} req
 * @param {*} res
 * @returns
 */
const getFlexTaughtByTutor = async (req, res) => {
  try {
    const { tutor } = req.session;
    const tutorId = tutor._id;
    logger.info(`[getFlexTaughtByTutor] tutorId -> ${tutorId}`);

    let { _textSearch, _page, _limit } = req.query;
    const pagination = {
      _page: +_page || constants.PAGINATION_DEFAULT_PAGE,
      _limit: +_limit || constants.PAGINATION_DEFAULT_LIMIT,
    };

    const schedulesFlexTaught = await tutorService.getFlexTaughtByTutor(tutorId, pagination, _textSearch);
    pagination._total = schedulesFlexTaught.count;

    return res.ok(httpResponses.SUCCESS, {
      flexTaught: schedulesFlexTaught.flexTaughts,
      pagination: pagination,
      total: schedulesFlexTaught.total,
    });
  } catch (err) {
    logger.debug(`[getFlexTaughtByTutor] error -> ${err.message}`);
    return res.internalServer(err.message);
  }
};

/**
 * Get info analytics for tutor
 * @param {*} req
 * @param {*} res
 * @returns
 */
const dashboardTutor = async (req, res) => {
  try {
    let { year } = req.query;
    logger.info(`[dashboardTutor]: query -> ${JSON.stringify(req.query)}`);

    year = +year || new Date().getFullYear();
    const { tutor } = req.session;

    logger.info(`[dashBoardTutor]: tutorId -> :${tutor._id} `);
    const now = helper.dateToStringLocal(new Date(), constants.DATE_FORMAT);

    const [dashboardTotalFlex, dashboardTotalFixed, dashboardYearFixed, dashboardYearFlex] = await Promise.all([
      tutorService.dashboardTutorTotalFlexByTime(tutor._id),
      tutorService.dashboardTutorTotalFixedByTime(tutor._id),
      tutorService.dashboardTutorTotalFixedByYear(tutor._id, year),
      tutorService.dashboardTutorTotalFlexByYear(tutor._id, year),
    ]);

    let dashBoardTutorTotal = {};
    if (!dashboardTotalFixed) {
      dashBoardTutorTotal = dashboardTotalFlex;
    } else {
      dashBoardTutorTotal.totalTime = dashboardTotalFlex.totalTime + dashboardTotalFixed.totalTime;
      dashBoardTutorTotal.totalPrice = dashboardTotalFlex.totalPrice + dashboardTotalFixed.totalPrice;
      dashBoardTutorTotal.sizeFlex = dashboardTotalFlex.sizeFlex;
      dashBoardTutorTotal.sizeCourse = dashboardTotalFixed.sizeCourse || 0;
      dashBoardTutorTotal.sizeFixed = dashboardTotalFixed.totalFixed || 0;
    }

    const dashboardTutorTotalByYear = [];

    for (let i = 0; i < 12; i++) {
      dashboardTutorTotalByYear[i] = {
        // totalTime: dashboardYearFixed[i].totalTime + dashboardYearFlex[i].totalTime,
        totalPrice: dashboardYearFixed[i].totalPrice + dashboardYearFlex[i].totalPrice,
        month: `Tháng ${i + 1}`,
        // sizeCourse: dashboardYearFixed[i].sizeCourse,
        // sizeFlex: dashboardYearFlex[i].sizeFlex,
      };
    }
    // let total = 0;
    // for (let i = 0; i < dashboardTutorTotalByYear.length; i++) {
    //   total += dashboardTutorTotalByYear[i].totalPrice;
    // }
    const result = [
      { totalTime: dashBoardTutorTotal.totalTime || 0, icon: enums.KeysIcon.TOTAL_TIME },
      {
        totalPrice: dashBoardTutorTotal.totalPrice || 0,
        icon: enums.KeysIcon.TOTAL_PRICE,
      },
      { sizeCourse: dashBoardTutorTotal.sizeCourse || 0, icon: enums.KeysIcon.TOTAL_COURSES },
      { sizeflex: dashBoardTutorTotal.sizeFlex || 0, icon: enums.KeysIcon.TOTAL_FLEXIBLE_LESSON },
      // { label: 'Lớp cố định ', value: dashBoardTutorTotal.sizeFixed || 0, icon: enums.KeysIcon.TOTAL_FIXED_LESSON },
    ];

    logger.debug(`[dashBoardTutor] success `);
    return res.ok(httpResponses.SUCCESS, { result, chart: dashboardTutorTotalByYear });
  } catch (err) {
    logger.error(`[dashBoardTutor] error-> ${err.message}`);
    return res.internalServer(err.message);
  }
};

/**
 * Export pdf for tutor
 * @param {*} req
 * @param {*} res
 * @returns
 */
const exportPdf = async (req, res) => {
  try {
    const { _id } = req.params;
    const tutor = await tutorService.getTutorById(_id);
    if (!tutor) {
      logger.debug(`[exportPdf]: getTutor -> ${httpResponses.TUTOR_NOT_FOUND}`);
      return res.badRequest(httpResponses.TUTOR_NOT_FOUND);
    }
    logger.info(`[exportPdf]: tutorId -> ${_id}`);

    const pagination = {
      _page: constants.PAGINATION_DEFAULT_PAGE,
      _limit: constants.PAGINATION_DEFAULT_LIMIT,
    };

    const [tutorInformation, dashboardTotalFlex, dashboardTotalFixed, totalStudents] = await Promise.all([
      tutorService.getDetailTutor(_id),
      tutorService.dashboardTutorTotalFlexByTime(_id),
      tutorService.dashboardTutorTotalFixedByTime(_id),
      tutorService.getStudentTaught(_id, undefined, pagination),
    ]);

    if (!dashboardTotalFixed) {
      tutorInformation.totalTime = Math.round(dashboardTotalFlex.totalTime);
      tutorInformation.totalPrice = dashboardTotalFlex.totalPrice;
      tutorInformation.sizeFlex = dashboardTotalFlex.sizeFlex;
      tutorInformation.sizeCourse = 0;
      tutorInformation.sizeFixed = 0;
    } else {
      tutorInformation.totalTime = Math.round(dashboardTotalFlex.totalTime + dashboardTotalFixed.totalTime);
      tutorInformation.totalPrice = dashboardTotalFlex.totalPrice + dashboardTotalFixed.totalPrice;
      tutorInformation.sizeFlex = dashboardTotalFlex.sizeFlex;
      tutorInformation.sizeCourse = dashboardTotalFixed.sizeCourse || 0;
      tutorInformation.sizeFixed = dashboardTotalFixed.totalFixed || 0;
    }
    tutorInformation.sizeStudents = totalStudents.total;

    logger.info(`[exportPdf]: startCreatePdf`);

    // const html = pdfPuppeteer.createHtml(tutorInformation);

    const pdf = await pdfHtml.createPdfHtml();

    if (!pdf) {
      logger.debug(`[exportPdf] ${httpResponses.EXPORT_PDF_ERROR}`);
      return res.badRequest(httpResponses.EXPORT_PDF_ERROR);
    }
    logger.info(`[exportPdf]: createPdf -> ${httpResponses.SUCCESS}`);

    res.setHeader('Content-Length', pdf.length);
    res.setHeader('Content-Type', 'application/pdf');

    logger.debug(`[exportPdf]: status -> ${httpResponses.SUCCESS}`);
    return res.status(httpResponses.HTTP_STATUS_OK).send(pdf);
  } catch (err) {
    logger.error(`[exportPdf] error-> ${err.message}`);
    return res.internalServer(err.message);
  }
};

//#region register
/**
 * Create Register Tutor
 * @param {*} req
 * @param {*} res
 * @returns
 */
const register = async (req, res) => {
  try {
    const newModel = req.body;
    logger.info(`[register ] newModel -> ${newModel}`);
    newModel.status = enums.StatusTutorRegister.REQUEST;

    const tutorRegister = await tutorRegisterService.createTutorRegister(newModel);
    if (!tutorRegister) {
      logger.info(`[register ] createTutorRegister -> ${httpResponses.FAIL}`);
      return res.badRequest(httpResponses.TUTOR_REGISTER_FAIL);
    }
    logger.info(`[register ] createTutorRegister -> ${httpResponses.SUCCESS}`);
    return res.ok(httpResponses.TUTOR_REGISTER_SUCCESSFULLY);
  } catch (err) {
    logger.debug(`[register] error -> ${err.message}`);
    return res.internalServer(err.message);
  }
};
//#endregion register

//#region getAllRegister
/**
 * Get All Register Tutor
 * @param {*} req
 * @param {*} res
 * @returns
 */
const getAllRegister = async (req, res) => {
  try {
    const { user } = req.session;
    const { _status, _page, _limit, _textSearch } = req.query;
    logger.info(`[getAllRegister]: query -> ${JSON.stringify(req.query)} user -> ${user._id}`);

    const pagination = {
      _page: +_page || constants.PAGINATION_DEFAULT_PAGE,
      _limit: +_limit || constants.PAGINATION_DEFAULT_LIMIT,
    };

    const { tutorRegisters, count, total } = await tutorRegisterService.getAllTutorRegister(
      {},
      _status,
      _textSearch,
      pagination
    );

    if (!tutorRegisters) {
      logger.info(`[getAllRegister]: getAllTutorRegister -> ${httpResponses.FAIL}`);
      return res.badRequest(httpResponses.FAIL);
    }
    logger.debug(`[getAllRegister]: getAllTutorRegister -> ${httpResponses.SUCCESS}`);

    return res.ok(httpResponses.SUCCESS, {
      tutorRegisters,
      total,
      pagination: {
        ...pagination,
        _total: count,
      },
    });
  } catch (err) {
    logger.debug(`[getAllRegister]: error -> ${err.message}`);
    return res.internalServer(err.message);
  }
};
//#endregion getAllRegister

//#region updateRegister
/**
 * Update Register Tutor
 * @param {*} req
 * @param {*} res
 * @returns
 */
const updateTutorRegister = async (req, res) => {
  try {
    const newModel = req.body;
    const { tutorRegisterId } = req.params;
    logger.info(`[updateTutorRegister]: tutorRegisterId -> ${tutorRegisterId}`);

    const tutorRegisters = await tutorRegisterService.updateTutorRegisterById(tutorRegisterId, newModel);
    if (!tutorRegisters) {
      logger.info(`[updateTutorRegister]: updateTutorRegisterById -> ${httpResponses.FAIL}`);
      return res.badRequest(httpResponses.FAIL);
    }
    logger.info(`[updateTutorRegister]: updateTutorRegisterById -> ${httpResponses.SUCCESS}`);
    return res.ok(httpResponses.SUCCESS);
  } catch (err) {
    logger.debug(`[updateTutorRegister]: error -> ${err.message}`);
    return res.internalServer(err.message);
  }
};
//#endregion updateRegister

/**
 * Update Register Tutor
 * @param {*} req
 * @body
 * certificates {Array<Object>}
 * cerUrl {File}
 * @param {*} res
 * @returns
 */
const updateTutorCertificate = async (req, res) => {
  try {
    const newModel = req.body;
    const { cerUrls } = req.files;
    const { _id } = req.params;
    logger.info(`[updateTutorCertificate]: tutorId -> ${_id} body -> ${JSON.stringify(newModel)}`);

    // Validate
    const existedTutor = await tutorService.getTutor({ _id });
    if (!existedTutor) {
      logger.debug(`[updateTutorCertificate]: -> ${httpResponses.TUTOR_NOT_FOUND}`);
      return res.notFound(httpResponses.TUTOR_NOT_FOUND);
    }

    if (cerUrls) {
      const cerUrlsUpload = await helperGCP.sendUploadMultiToGCS(cerUrls);

      newModel.cerUrls = cerUrlsUpload;
      logger.debug(`[updateTutorCertificate]: -> upload cerUrls -> ${cerUrlsUpload}`);
    }

    // Update certificate
    const certificatesArr = helper.jsonToObject(newModel.certificates);
    const _certificates = certificatesArr.map((cer) => {
      cer._id = cer._id || new ObjectId();
      cer.cerUrl = cer.cerUrl || newModel.cerUrls?.shift();

      return cer;
    });

    await tutorService.updateTutor(_id, { certificates: _certificates });

    logger.info(`[updateTutorCertificate]: response ->  ${httpResponses.SUCCESS}`);
    return res.ok(httpResponses.SUCCESS);
  } catch (err) {
    logger.debug(`[updateTutorCertificate]: error -> ${err.message}`);
    return res.internalServer(err.message);
  }
};

/**
 * Crete certificate
 * @param {*} req
 * @param {*} res
 * @param {FormData} req.body
 *    cerUrl {File} image file certificate
 *    name, description {String}
 *    start, end {String} start date, expiry date certificate with format "yyyy-mm-dd"
 * @returns
 */
const createCertificate = async (req, res) => {
  try {
    const newModel = req.body;
    const cerUrl = req.file;
    const { tutor } = req.session;
    logger.info(
      `[createCertificate]: newModel -> ${JSON.stringify(newModel)} - cerUrl -> ${cerUrl.originalname} - tutorId -> ${
        tutor._id
      }`
    );

    if (cerUrl) {
      const cerUrlUpload = await helperGCP.sendUploadMultiToGCS([cerUrl]);
      newModel.cerUrl = cerUrlUpload[0];
      logger.debug(`[createCertificate]: -> upload cerUrl -> ${cerUrlUpload}`);
    }

    await tutorService.createCertificateByTutorId(tutor._id, newModel);
    logger.info(`[createCertificate]: createCertificateByTutorId ->  ${httpResponses.SUCCESS}`);

    return res.created(httpResponses.SUCCESS);
  } catch (err) {
    logger.error(`[createCertificate]: error -> ${err.message}`);
    return res.internalServer(err.message);
  }
};

/**
 * Update Certificate Tutor
 * @param {*} req
 * @body
 * certificates {Array<Object>}
 * cerUrl {File}
 * @param {*} res
 * @returns
 */
const updateCertificate = async (req, res) => {
  try {
    const newModel = req.body;
    const { cerUrl } = req.files;
    const { idCertificate } = req.params;
    logger.info(`[updateTutorCertificate]: idCertificate -> ${idCertificate} newModel -> ${JSON.stringify(newModel)}`);

    if (cerUrl) {
      const cerUrlUpload = await helperGCP.sendUploadMultiToGCS(cerUrl);
      newModel.cerUrl = cerUrlUpload[0];
      logger.debug(`[updateTutorCertificate]: -> upload cerUrl -> ${cerUrlUpload}`);
    }

    // Update certificate
    await tutorService.updateCertificate(idCertificate, newModel);

    logger.info(`[updateTutorCertificate]: updateCertificate ->  ${httpResponses.SUCCESS}`);
    return res.ok(httpResponses.SUCCESS);
  } catch (err) {
    logger.debug(`[updateTutorCertificate]: error -> ${err.message}`);
    return res.internalServer(err.message);
  }
};

/**
 * Update Register Tutor
 * @param {*} req
 * @body
 * certificates {Array<Object>}
 * cerUrl {File}
 * @param {*} res
 * @returns
 */
const deleteTutorCertificate = async (req, res) => {
  try {
    const { tutor } = req.session;
    const { _certificateId } = req.params;
    logger.info(`[deleteTutorCertificate]: tutorId ${tutor._id} certificateId -> ${_certificateId}`);

    // Validate
    const existedTutor = await tutorService.getTutor({ 'certificates._id': _certificateId });
    if (!existedTutor) {
      logger.debug(`[deleteTutorCertificate]: -> ${httpResponses.TUTOR_NOT_FOUND}`);
      return res.notFound(httpResponses.TUTOR_NOT_FOUND);
    }

    // Remove certificate out array
    const certificateUpdated = existedTutor.certificates.filter((cer) => {
      return cer._id.toString() !== _certificateId;
    });
    logger.info(`[deleteTutorCertificate]: -> ${JSON.stringify(certificateUpdated)}`);

    await tutorService.updateTutor(tutor._id, { certificates: certificateUpdated });

    logger.info(`[deleteTutorCertificate]: response ->  ${httpResponses.SUCCESS}`);
    return res.ok(httpResponses.SUCCESS);
  } catch (err) {
    logger.debug(`[deleteTutorCertificate]: error -> ${err.message}`);
    return res.internalServer(err.message);
  }
};

//#region createCertificateByAdmin
const createCertificateByAdmin = async (req, res) => {
  try {
    const newModel = req.body;
    const cerUrl = req.file;
    const { idTutor } = req.params;
    logger.info(
      `[createCertificate]: newModel -> ${JSON.stringify(newModel)} - cerUrl -> ${
        cerUrl.originalname
      } - tutorId -> ${idTutor}`
    );

    if (cerUrl) {
      const cerUrlUpload = await helperGCP.sendUploadMultiToGCS([cerUrl]);
      newModel.cerUrl = cerUrlUpload[0];
      logger.debug(`[createCertificate]: -> upload cerUrl -> ${cerUrlUpload}`);
    }

    await tutorService.createCertificateByTutorId(idTutor, newModel);
    logger.info(`[createCertificate]: createCertificateByTutorId ->  ${httpResponses.SUCCESS}`);

    return res.created(httpResponses.SUCCESS);
  } catch (err) {
    logger.error(`[createCertificate]: error -> ${err.message}`);
    return res.internalServer(err.message);
  }
};
//#endregion createCertificateByAdmin

//#region createCertificateByAdmin
const deleteCertificateByAdmin = async (req, res) => {
  try {
    const { idTutor, idCertificate } = req.params;
    logger.info(`[deleteCertificateByAdmin]: tutorId ${idTutor} certificateId -> ${idCertificate}`);

    const existedTutor = await tutorService.getTutor({ _id: idTutor });
    if (!existedTutor) {
      logger.debug(`[deleteCertificateByAdmin]: -> ${httpResponses.TUTOR_NOT_FOUND}`);
      return res.notFound(httpResponses.TUTOR_NOT_FOUND);
    }
    await tutorService.deleteCertificate(idTutor, idCertificate);

    logger.info(`[deleteCertificateByAdmin]: response ->  ${httpResponses.SUCCESS}`);
    return res.ok(httpResponses.SUCCESS);
  } catch (err) {
    logger.debug(`[deleteCertificateByAdmin]: error -> ${err.message}`);
    return res.internalServer(err.message);
  }
};
//#endregion createCertificateByAdmin

//#region getCertificateOfTutor
const getCertificateOfTutor = async (req, res) => {
  try {
    const { idTutor } = req.params;
    logger.info(`[getCertificateOfTutor]: tutorId ${idTutor}`);

    const existedTutor = await tutorService.getTutor({ _id: idTutor });
    if (!existedTutor) {
      logger.debug(`[getCertificateOfTutor]: -> ${httpResponses.TUTOR_NOT_FOUND}`);
      return res.notFound(httpResponses.TUTOR_NOT_FOUND);
    }
    const data = await tutorService.getCertificateOfTutor(idTutor);

    logger.info(`[getCertificateOfTutor]: response ->  ${httpResponses.SUCCESS}`);
    return res.ok(httpResponses.SUCCESS, { certificates: data.certificates });
  } catch (err) {
    logger.debug(`[getCertificateOfTutor]: error -> ${err.message}`);
    return res.internalServer(err.message);
  }
};
//#endregion getCertificateOfTutor

module.exports = {
  createTutor,
  getAllTutors,
  getTutorById,
  updateTutor,
  deleteTutor,
  blockTutor,
  sendMailForTutor,
  getScheduleByTutorId,
  getScheduleAvailableOfTutor,
  getAllTutorsByStudent,
  getTutorByIdByStudent,
  getProfileTutor,
  getStudentTaught,
  getFixedTaughtByTutor,
  getFlexTaughtByTutor,
  dashboardTutor,
  exportPdf,
  getScheduleByTutor,
  register,
  getAllRegister,
  updateTutorRegister,
  updateTutorCertificate,
  deleteTutorCertificate,
  createCertificate,
  updateCertificate,
  createCertificateByAdmin,
  deleteCertificateByAdmin,
  getCertificateOfTutor,
};
