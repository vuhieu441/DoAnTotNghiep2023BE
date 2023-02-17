const logger = require('../utils/logger');
const httpResponses = require('../utils/httpResponses');

// Service
const promotionService = require('../services/promotion');
const notificationService = require('../services/notification');
const notifyUserService = require('../services/notifyUsers');
const userService = require('../services/user');

const helper = require('../helper/helperFunction');
const constants = require('../constants/constants');
const enums = require('../constants/enum');
const moment = require('moment');
/**
 * Create new promotion
 * @param {*} req
 * @param {*} res
 * @returns
 */
const createPromotion = async (req, res) => {
  try {
    const newModel = req.body;
    logger.info(`[createPromotion]: newModel -> ${JSON.stringify(newModel)}`);

    //#region Generate Code and Check Exist
    let existedPromotion;
    do {
      newModel.code = helper.generateCodeCourse(constants.PREFIX_CODE, 5);
      existedPromotion = await promotionService.getPromotionByCode(newModel.code);
    } while (existedPromotion);
    //#endregion Generate Code and Check Exist

    if (newModel.isPublic) {
      const totalPromotion = await promotionService.getPromotions({
        isPublic: true,
        expirationDate: { $gt: new Date() },
      });

      if (totalPromotion.length >= 4) {
        return res.badRequest(httpResponses.PROMOTION_MAX_ACTIVE);
      }
    }

    const promotion = await promotionService.createPromotion(newModel);

    if (promotion.isPublic) {
      const arrayNewModel = [];
      const newNoitication = await notificationService.createNotification({
        title: enums.TypeNotification.PROMOTION,
        titleId: promotion._id,
      });

      if (!newNoitication) {
        logger.debug(`[createPromotion] newNoitication -> ${httpResponses.CREATE_NOTIFICATION_ERROR}`);
        return logger.badRequest(httpResponses.CREATE_NOTIFICATION_ERROR);
      }

      const [userStudent] = await Promise.all([userService.getAllUserByFilter({ role: enums.UserRole.STUDENT })]);
      userStudent.forEach((u) => {
        arrayNewModel.push({ user: u._id, notification: newNoitication._id });
      });

      await notifyUserService.createManyNotifyUsers(arrayNewModel);
      logger.debug(`[createPromotion] notifyUserService -> ${httpResponses.SUCCESS}`);
    }

    logger.debug(`[createPromotion]: ${httpResponses.PROMOTION_CREATED_SUCCESSFULLY}`);
    return res.status(httpResponses.HTTP_STATUS_CREATED).json({
      success: true,
      message: `${httpResponses.PROMOTION_CREATED_SUCCESSFULLY}`,
    });
  } catch (err) {
    logger.error(`[createPromotion] error -> ${err.message}`);
    res.status(httpResponses.HTTP_STATUS_INTERNAL_ERROR).json({
      success: false,
      message: `${err.message}`,
    });
  }
};

//#region getAllPromotions
/**
 * Get all promotions
 * @param {*} req
 * @param {*} res
 * @returns
 */
const getAllPromotions = async (req, res) => {
  try {
    const { _textSearch, _page, _limit } = req.query;
    logger.info(`[getAllPromotions]: _textSearch -> ${_textSearch} _page -> ${_page} _limit -> ${_limit}`);
    const pagination = {
      _page: +_page || constants.PAGINATION_DEFAULT_PAGE,
      _limit: +_limit || constants.PAGINATION_DEFAULT_LIMIT,
    };
    const [{ promotions, count }, total] = await Promise.all([
      promotionService.getAllPromotions(_textSearch, pagination),
      promotionService.countPromotions({}),
    ]);
    logger.debug(`[getAllPromotions]: getAllPromotions -> ${httpResponses.SUCCESS}`);

    return res.status(httpResponses.HTTP_STATUS_OK).json({
      success: true,
      message: `${httpResponses.SUCCESS}`,
      data: {
        promotions: promotions,
        pagination: {
          ...pagination,
          _total: count,
        },
        total,
      },
    });
  } catch (err) {
    logger.error(`[getAllPromotions] error -> ${err.message}`);
    res.status(httpResponses.HTTP_STATUS_INTERNAL_ERROR).json({
      success: false,
      message: `${err.message}`,
    });
  }
};
//#endregion getAllPromotions

/**
 * Get promotion by id
 * @param {*} req
 * @param {*} res
 * @returns
 */
const getPromotionById = async (req, res) => {
  try {
    const { _id } = req.params;
    logger.info(`[getPromotionById]: _id: ${_id}`);

    const promotion = await promotionService.getPromotionById(_id);

    if (!promotion) {
      logger.debug(`[getPromotionById]: ${_id} _id -> ${httpResponses.PROMOTION_NOT_FOUND}`);
      return res.status(httpResponses.HTTP_STATUS_NOT_FOUND).json({
        success: false,
        message: `${httpResponses.PROMOTION_NOT_FOUND}`,
      });
    }

    return res.status(httpResponses.HTTP_STATUS_OK).json({
      success: true,
      message: `${httpResponses.SUCCESS}`,
      data: {
        promotion: promotion,
      },
    });
  } catch (err) {
    logger.error(`[getPromotionById] error -> ${err.message}`);
    res.status(httpResponses.HTTP_STATUS_INTERNAL_ERROR).json({
      success: false,
      message: `${err.message}`,
    });
  }
};

/**
 * Get all promotions for student
 * @param {*} req
 * @param {*} res
 * @returns
 */
const getAllPromotionsByStudent = async (req, res) => {
  try {
    logger.info(`[getAllPromotions]`);

    const promotions = await promotionService.getPromotions({
      isPublic: true,
      expirationDate: { $gt: new Date() },
    });

    return res.status(httpResponses.HTTP_STATUS_OK).json({
      success: true,
      message: `${httpResponses.SUCCESS}`,
      data: {
        promotions: promotions,
      },
    });
  } catch (err) {
    logger.error(`[getAllPromotions] error -> ${err.message}`);
    res.status(httpResponses.HTTP_STATUS_INTERNAL_ERROR).json({
      success: false,
      message: `${err.message}`,
    });
  }
};

/**
 * update promotion by id
 * @param {*} req
 * @param {*} res
 * @returns
 */
const updatePromotionById = async (req, res) => {
  try {
    const { _id } = req.params;
    const newModel = req.body;

    logger.info(`[updatePromotionById]: _id -> ${_id}, newModel -> ${JSON.stringify(req.body)} `);

    const promotion = await promotionService.getPromotionById(_id);
    if (!promotion) {
      logger.debug(`[updatePromotionById]: ${_id} _id -> ${httpResponses.PROMOTION_NOT_FOUND}`);
      return res.notFound(httpResponses.PROMOTION_NOT_FOUND);
    }

    if (promotion.isPublic) {
      logger.debug(`[updatePromotionById]: ${httpResponses.PROMOTION_ACTIVATED}`);
      return res.badRequest(httpResponses.PROMOTION_ACTIVATED);
    }

    if (newModel.isPublic) {
      const totalPromotion = await promotionService.getPromotions({
        isPublic: true,
        expirationDate: { $gt: new Date() },
      });

      if (totalPromotion.length >= 4) {
        logger.debug(`[updatePromotionById]: ${httpResponses.PROMOTION_MAX_ACTIVE}`);
        return res.badRequest(httpResponses.PROMOTION_MAX_ACTIVE);
      }
    }

    if (newModel.isPublic) {
      const arrayNewModel = [];
      const newNoitication = await notificationService.createNotification({
        title: enums.TypeNotification.PROMOTION,
        titleId: _id,
      });

      if (!newNoitication) {
        logger.debug(`[updatePromotionById] newNoitication -> ${httpResponses.CREATE_NOTIFICATION_ERROR}`);
        return logger.badRequest(httpResponses.CREATE_NOTIFICATION_ERROR);
      }

      const [userStudent] = await Promise.all([userService.getAllUserByFilter({ role: enums.UserRole.STUDENT })]);
      userStudent.forEach((u) => {
        arrayNewModel.push({ user: u._id, notification: newNoitication._id });
      });

      await notifyUserService.createManyNotifyUsers(arrayNewModel);
    }

    await promotionService.updatePromotionById(_id, newModel);
    logger.debug(`[updatePromotionById]: ${httpResponses.PROMOTION_UPDATED_SUCCESSFULLY}`);

    return res.status(httpResponses.HTTP_STATUS_OK).json({
      success: true,
      message: `${httpResponses.PROMOTION_UPDATED_SUCCESSFULLY}`,
    });
  } catch (err) {
    logger.error(`[updatePromotionById] error -> ${err.message}`);
    res.status(httpResponses.HTTP_STATUS_INTERNAL_ERROR).json({
      success: false,
      message: `${err.message}`,
    });
  }
};

/**
 * Delete promotion by id
 * @param {*} req
 * @param {*} res
 * @returns
 */
const deletePromotionById = async (req, res) => {
  try {
    const { _id } = req.params;
    logger.info(`[deletePromotionById]: _id: ${_id}`);

    const promotion = await promotionService.getPromotionById(_id);

    if (!promotion) {
      logger.debug(`[deletePromotionById]: ${_id} _id -> ${httpResponses.PROMOTION_NOT_FOUND}`);
      return res.status(httpResponses.HTTP_STATUS_NOT_FOUND).json({
        success: false,
        message: `${httpResponses.PROMOTION_NOT_FOUND}`,
      });
    }

    if (promotion.public) {
      logger.debug(`[deletePromotionById]: ${httpResponses.PROMOTION_CAN_NOT_DELETE}`);
      return res.status(httpResponses.HTTP_STATUS_BAD_REQUEST).json({
        success: false,
        message: `${httpResponses.PROMOTION_CAN_NOT_DELETE}`,
      });
    }

    await promotionService.deletePromotionById(_id);
    logger.debug(`[deletePromotionById]: ${httpResponses.PROMOTION_DELETED_SUCCESSFULLY}`);

    return res.status(httpResponses.HTTP_STATUS_OK).json({
      success: true,
      message: `${httpResponses.PROMOTION_DELETED_SUCCESSFULLY}`,
    });
  } catch (err) {
    logger.error(`[deletePromotionById] error -> ${err.message}`);
    res.status(httpResponses.HTTP_STATUS_INTERNAL_ERROR).json({
      success: false,
      message: `${err.message}`,
    });
  }
};

module.exports = {
  createPromotion,
  getAllPromotions,
  getPromotionById,
  getAllPromotionsByStudent,
  updatePromotionById,
  deletePromotionById,
};
