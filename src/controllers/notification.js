const logger = require('../utils/logger');
const httpResponses = require('../utils/httpResponses');

const constants = require('../constants/constants');
const enums = require('../constants/enum');

// Service
const notifyUserService = require('../services/notifyUsers');
const notificationService = require('../services/notification');

//#region getAllNotification
/**
 * Get All Notification
 * @param {*} req
 * @param {*} res
 * @returns
 */
const getAllNotification = async (req, res) => {
  try {
  } catch (err) {
    logger.error(`[getAllNotification] ${err.message}`);
    res.internalServer(err.message);
  }
};
//#endregion getAllNotification

//#region createNotification
/**
 * Create  Notification
 * @param {*} req
 * @param {*} res
 * @returns
 */
const createNotification = async (req, res) => {
  try {
  } catch (err) {
    logger.error(`[createNotification] ${err.message}`);
    res.internalServer(err.message);
  }
};
//#endregion createNotification

//#region getDetailNotification
/**
 * get detail  Notification
 * @param {*} req
 * @param {*} res
 * @returns
 */
const getDetailNotification = async (req, res) => {
  try {
  } catch (err) {
    logger.error(`[getDetailNotification] ${err.message}`);
    res.internalServer(err.message);
  }
};
//#endregion getDetailNotification

//#region updateIsSeen
/**
 * update is Seen
 * @param {*} req
 * @param {*} res
 * @returns
 */
const updateNotifyUser = async (req, res) => {
  try {
    const { _id } = req.params;

    const { user } = req.session;

    logger.info(`[updateNotifyUser] userId --> ${user._id}`);

    const newModel = req.body;
    newModel.isSeen = newModel.isSeen ? true : false;

    const [notification, notifyUsers] = await Promise.all([
      notificationService.getNotification({ _id: _id }),
      notifyUserService.getNotifyUser({ notification: _id, user: user._id }),
    ]);

    if (!notification || !notifyUsers) {
      logger.debug(`[updateNotifyUser] ${httpResponses.NOTIFICATION_NOT_FOUND}`);
      return res.notFound(httpResponses.NOTIFICATION_NOT_FOUND);
    }

    if (newModel.isSeen && notifyUsers.isSeen) {
      logger.debug(`[updateNotifyUser] ${httpResponses.NOTIFICATION_HAS_SEEN}`);
      return res.notFound(httpResponses.NOTIFICATION_HAS_SEEN);
    }

    await notifyUserService.updateNotifyUser({ _id: notifyUsers._id }, newModel);

    logger.debug(`[updateNotifyUser] ${httpResponses.UPDATE_NOTIFICATION_SUCCESS}`);
    return res.ok(httpResponses.UPDATE_NOTIFICATION_SUCCESS);
  } catch (err) {
    logger.error(`[updateNotifyUser] ${err.message}`);
    res.internalServer(err.message);
  }
};

const updateNotifyUserByActive = async (req, res) => {
  try {
    const { _id } = req.params;

    const { user } = req.session;

    logger.info(`[updateNotifyUserByActive] userId --> ${user._id}`);

    const newModel = req.body;
    newModel.isActive = newModel.isActive ? true : false;
    const [notification, notifyUsers] = await Promise.all([
      notificationService.getNotification({ _id: _id }),
      notifyUserService.getNotifyUser({ notification: _id, user: user._id }),
    ]);

    if (!notification || !notifyUsers) {
      logger.debug(`[updateNotifyUserByActive] ${httpResponses.NOTIFICATION_NOT_FOUND}`);
      return res.notFound(httpResponses.NOTIFICATION_NOT_FOUND);
    }

    if (newModel.isSeen && notifyUsers.isActive) {
      logger.debug(`[updateNotifyUserByActive] ${httpResponses.NOTIFICATION_HAS_ACTIVE}`);
      return res.notFound(httpResponses.NOTIFICATION_HAS_ACTIVE);
    }

    await notifyUserService.updateNotifyUser({ _id: notifyUsers._id }, newModel);

    await notifyUserService.updateManyNotifyUser({ notification: notification._id }, newModel);

    logger.debug(`[updateNotifyUserByActive] ${httpResponses.UPDATE_NOTIFICATION_SUCCESS}`);
    return res.ok(httpResponses.UPDATE_NOTIFICATION_SUCCESS);
  } catch (err) {
    logger.error(`[updateNotifyUserByActive] ${err.message}`);
    res.internalServer(err.message);
  }
};
//#endregion updateNotifyUser

//#region getNotificationsByUser
const getNotificationsByUser = async (req, res) => {
  try {
    const { user } = req.session;
    let { _limit, _page, isSeen, sortTime } = req.query;
    logger.info(`[getNotifications]: req.query -> ${JSON.stringify(req.query)}, userId -> ${user._id}`);
    const filter = {
      isSeen,
      sortTime,
      userId: user._id,
    };
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
    logger.info(`[getNotifications]: pagination -> ${JSON.stringify(pagination)}`);

    const { notifications, lastPage } = await notificationService.getAllNotificationsByUser(filter, pagination);
    const notificationsNotSeen = await notificationService.countNotificationsNotSeen(filter.userId);
    logger.debug(`[getNotifications]: ${httpResponses.SUCCESS}`);
    return res.ok(httpResponses.SUCCESS, {
      notifications,
      notificationsNotSeen,
      lastPage,
      currentPage: +_page,
      limit: _limit || +pagination._limit,
    });
  } catch (err) {
    logger.error(`[getAllNotification] ${err.message}`);
    res.internalServer(err.message);
  }
};
//#endregion getNotificationsByUser

//#region getNotificationsById
const getNotificationsById = async (req, res) => {
  try {
    const { user } = req.session;
    const { idNotification } = req.params;
    logger.info(`[getNotificationsById]: idNotification -> ${idNotification}`);

    const { notification } = await notificationService.getNotificationById(idNotification, user._id);
    logger.debug(`[getNotificationsById]: ${httpResponses.SUCCESS}`);
    return res.ok(httpResponses.SUCCESS, { notification });
  } catch (err) {
    logger.error(`[getNotificationsById]: ${err.message}`);
    res.internalServer(err.message);
  }
};
//#endregion getNotificationsById

module.exports = {
  getAllNotification,
  getDetailNotification,
  createNotification,
  updateNotifyUser,
  updateNotifyUserByActive,
  getNotificationsByUser,
  getNotificationsById,
};
