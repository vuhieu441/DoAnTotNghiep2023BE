require('dotenv').config();
const logger = require('../utils/logger');
const httpResponses = require('../utils/httpResponses');
const paypal = require('paypal-node-sdk');

const enums = require('../constants/enum');
const paymentService = require('../services/payment');
const walletService = require('../services/wallet');
const studentService = require('../services/student');
const authService = require('../services/auth');
const momoService = require('../services/momo');
const promotionService = require('../services/promotion');

const helper = require('../helper/helperFunction');
const constants = require('../constants/constants');

paypal.configure({
  mode: process.env.PAYPAL_CLIENT_MODE, //sandbox or live
  client_id: process.env.PAYPAL_CLIENT_ID,
  client_secret: process.env.PAYPAL_CLIENT_SECRET,
});

//#region createPaymentByPaypal
/**
 * Create Payment By Paypal
 * @param {*} req
 * @param {*} res
 */
const createPaymentByPaypal = async (req, res) => {
  try {
    const { paypalModel, paymentModel } = req.body;
    const { student } = req.session;
    const newPaypal = {
      intent: 'SALE',
      payer: {
        payment_method: enums.MethodPayment.PAYPAL,
      },
      redirect_urls: {
        return_url: paypalModel.returnUrl,
        cancel_url: paypalModel.cancelUrl,
      },
      transactions: [
        {
          amount: {
            currency: enums.Currency.USD,
            total: paymentModel.amount,
          },
          description: paypalModel.description,
        },
      ],
    };
    return new Promise((resolve, reject) => {
      paypal.payment.create(newPaypal, async (error, paypalCreated) => {
        if (error) {
          reject(error);
          return res.badRequest(`Error While Create Payment: ${error}`);
        }
        try {
          paymentModel.student = student._id;
          paymentModel.transactionId = paypalCreated.id;
          const paymentCreated = await paymentService.createPayment(paymentModel);
          if (!paymentCreated) {
            logger.debug(`[executePaymentByPaypal]: createPayment -> ${httpResponses.FAIL}`);
            return res.badRequest(httpResponses.FAIL);
          }
        } catch (err) {
          logger.error(`[createPaymentByPaypal]: error -> ${err.message}`);
          return res.internalServer(err.message);
        }
        resolve(paypalCreated);
        return res.ok(httpResponses.SUCCESS, paypalCreated);
      });
    });
  } catch (err) {
    logger.error(`[createPaymentByPaypal]: error -> ${err.message}`);
    return res.internalServer(err.message);
  }
};
//#endregion createPaymentByPaypal

//#region createPaymentSuccess
/**
 * Create Payment By Paypal
 * @param {*} req
 * @param {*} res
 */
const executePaymentByPaypal = async (req, res) => {
  try {
    const { student } = req.session;
    const payerId = req.query.PayerID;
    const paymentId = req.query.paymentId;
    logger.info(`[executePaymentByPaypal]: studentId -> ${student._id}`);

    const studentFounded = await studentService.getStudent({ _id: student._id });
    if (!studentFounded) {
      logger.debug(`[executePaymentByPaypal]: getStudent -> ${httpResponses.STUDENT_NOT_FOUND}`);
      return res.notFound(httpResponses.STUDENT_NOT_FOUND);
    }
    const paymentFounded = await paymentService.getPaymentByTransaction(paymentId);
    if (
      (paymentFounded && paymentFounded.status === enums.StatusPayment.EXECUTED) ||
      paymentFounded.status === enums.StatusPayment.SUCCESS
    ) {
      logger.debug(`[executePaymentByPaypal]: getPaymentByTransaction -> ${httpResponses.SUCCESS}`);
      return res.badRequest(httpResponses.PAID_FAILED);
    }

    const paymentUpdate = {
      status: enums.StatusPayment.REQUEST,
    };

    //#region Execute Payment
    const payment = await paypal.payment.get(paymentId);
    const transactionId = payment.id;
    const execute_payment_json = {
      payer_id: payerId,
      transactions: payment.transactions,
    };
    const paymentExecuted = await paypal.payment.execute(paymentId, execute_payment_json);
    if (!paymentExecuted) {
      logger.debug(`[executePaymentByPaypal]: execute -> ${httpResponses.FAIL}`);
      paymentUpdate.status = enums.StatusPayment.FAIL;
      await paymentService.updatePaymentByTransaction(transactionId, paymentUpdate);
      return res.badRequest(httpResponses.FAIL);
    }
    paymentUpdate.status = enums.StatusPayment.EXECUTED;
    await paymentService.updatePaymentByTransaction(transactionId, paymentUpdate);
    //#endregion Execute Payment

    //#region Update Wallet
    const walletFounded = await walletService.getWalletByStudent(student._id);
    if (!walletFounded) {
      logger.debug(`[executePaymentByPaypal]: getWalletByStudent -> ${httpResponses.WALLET_NOT_FOUND}`);
      return res.notFound(httpResponses.WALLET_NOT_FOUND);
    }
    const expirationDate = walletFounded.expirationDate ?? helper.dateToStringLocal(new Date(), constants.DATE_FORMAT);
    const expirationDateUpdated = helper.convertMoneyToExpirationDate(paymentFounded.amount, expirationDate);
    const newWallet = {
      point: walletFounded.point + paymentFounded.point,
      expirationDate: expirationDateUpdated,
    };
    const walletUpdated = await walletService.updateWalletByStudent(student._id, newWallet);
    if (!walletUpdated) {
      logger.debug(`[executePaymentByPaypal]: updateWallet -> ${httpResponses.FAIL}`);
      return res.badRequest(httpResponses.FAIL);
    }
    //#endregion Update Wallet

    //#region Update Payments
    paymentUpdate.status = enums.StatusPayment.SUCCESS;
    const paymentUpdated = await paymentService.updatePaymentByTransaction(transactionId, paymentUpdate);
    if (!paymentUpdated) {
      logger.debug(`[executePaymentByPaypal]: updateStatusPayment -> ${httpResponses.FAIL}`);
      return res.badRequest(httpResponses.FAIL);
    }
    //#endregion Update Payments

    return res.ok(httpResponses.SUCCESS);
  } catch (err) {
    logger.error(`[executePaymentByPaypal]: error -> ${err.message}`);
    return res.internalServer(err.message);
  }
};
//#endregion createPaymentSuccess

//#region cancelPaymentByPaypal
/**
 * Create Payment By Paypal
 * @param {*} req
 * @param {*} res
 */
const cancelPaymentByPaypal = async (req, res) => {
  try {
    return res.ok('CANCEL');
  } catch (err) {
    logger.error(`[createPaymentByPaypal]: error -> ${err.message}`);
    return res.internalServer(err.message);
  }
};

//#endregion cancelPaymentByPaypal

//#region createPayment
/**
 * Create Payment After Payment Success
 * @param {*} req
 * @param {*} res
 * @returns
 */
const createPayment = async (req, res) => {
  try {
    const { student } = req.session;
    const newModel = req.body;
    newModel.student = student._id;
    logger.debug(`[createPayment]: newModel -> ${JSON.stringify(newModel)}`);

    const payment = await paymentService.createPayment(newModel);
    if (!payment) {
      logger.debug(`[createPayment]: create -> ${httpResponses.FAIL}`);
      return res.badRequest(httpResponses.FAIL);
    }
    logger.debug(`[createPayment]: create -> ${httpResponses.SUCCESS}`);
    return res.created(httpResponses.SUCCESS);
  } catch (err) {
    logger.error(`[createPayment]: error -> ${err.message}`);
    res.internalServer(err.message);
  }
};
//#endregion createPayment

//#region getAllPaymentByStudent
/**
 * Get All Payment By Student
 * @param {*} req
 * @param {*} res
 * @returns
 */
const getAllPaymentByStudent = async (req, res) => {
  try {
    const { student } = req.session;
    const { _page, _limit } = req.query;
    logger.info(`[getAllPayment]: studentId -> ${student._id}`);

    const pagination = {
      _page: +_page || constants.PAGINATION_DEFAULT_PAGE,
      _limit: +_limit || constants.PAGINATION_DEFAULT_LIMIT,
    };

    const { payments, total } = await paymentService.getAllPaymentByStudent(student._id, pagination);

    return res.ok(httpResponses.SUCCESS, {
      historyPayments: payments,
      total: total,
      pagination: {
        ...pagination,
        _total: total,
      },
    });
  } catch (err) {
    logger.error(`[getAllPayment]: error -> ${err.message}`);
    res.internalServer(httpResponses.HTTP_STATUS_INTERNAL_ERROR);
  }
};
//#endregion getAllPaymentByStudent

//#region createPaymentByMomo
/**
 * createPaymentByMomo By Student
 * @param {*} req
 * @param {*} res
 * @returns
 */
const createPaymentByMomo = async (req, res) => {
  try {
    const { student } = req.session;

    logger.info(`[createPaymentByMomo] student._id =${student._id}`);
    let { amount, point, promotion } = req.body;
    const requestId = constants.PARTNER_CODE + new Date().getTime();
    const redirect = `${constants.REDIRECT_URL_MOMO}`;

    amount = +amount || 0;

    logger.info(`[createPaymentByMomo] amount -> ${amount}`);

    const rateUsdVnd = await momoService.getRateUsdVnd();

    const amountMomo = !rateUsdVnd ? amount * constants.RATE_USD_VNU : amount * +rateUsdVnd.USD_VND;
    if (!amountMomo || amountMomo < constants.MIN_AMOUNT_MOMO || amountMomo > constants.MAX_AMOUNT_MOMO) {
      logger.debug(`[createPaymentByMomo] amountMomo -> ${httpResponses.PAYMENT_MOMO_AMOUNT_INVALID}`);
      return res.badRequest(`Monny invalid`);
    }
    const newPayment = {
      student: student._id,
      point: point,
      amount: amount,
      method: enums.MethodPayment.MOMO,
      status: enums.StatusPayment.REQUEST,
      transactionId: requestId,
    };

    if (promotion) {
      const promotionExists = await promotionService.getOnePromotionAvailble(promotion);

      if (!promotionExists) {
        logger.debug(`[createPaymentByMomo] ${httpResponses.PROMOTION_NOT_FOUND}`);
        return res.badRequest(httpResponses.PROMOTION_NOT_FOUND);
      }
      newPayment.promotion = promotion;
    }

    await paymentService.createPayment(newPayment);

    const body = await momoService.paymentMomo(amountMomo, redirect, requestId);

    if (!body || !body.payUrl) {
      logger.debug(`[createPaymentByMomo]  ${httpResponses.CREATE_PAYMENT_MOMO_ERROR}`);
      return res.badRequest(httpResponses.CREATE_PAYMENT_MOMO_ERROR);
    }

    logger.debug(`[createPaymentByMomo] urlMomo  -> ${body.payUrl}`);
    return res.status(httpResponses.STAFF_CREATED_SUCCESSFULLY).redirect(body.payUrl);
  } catch (err) {
    logger.error(`[createPaymentByMomo]: error -> ${err.message}`);
    res.internalServer(httpResponses.HTTP_STATUS_INTERNAL_ERROR);
  }
};
//#endregion getAllPaymentByStudent

//#endregion getAllPaymentByStudent

//#region createPaymentByMomo
/**
 * createPaymentByMomo By Student
 * @param {*} req
 * @param {*} res
 * @returns
 */
const returnPaymentByMomo = async (req, res) => {
  try {
    const { requestId } = req.query;
    logger.debug(`[returnPaymentByMomo] requestId -> ${requestId}`);
    const payment = await paymentService.getOnePaymentNotDone(requestId);
    if (!payment) {
      logger.debug(`[returnPaymentByMomo] ${httpResponses.PAYMENT_NOT_FOUND}`);
      return res.badRequest(httpResponses.PAYMENT_NOT_FOUND);
    }
    await paymentService.updatePaymentById(payment._id, { status: enums.StatusPayment.EXECUTED });

    const wallet = await walletService.getWalletByStudent(payment.student);

    if (!wallet) {
      logger.debug(`[returnPaymentByMomo] ${httpResponses.WALLET_NOT_FOUND}`);
      return res.badRequest(httpResponses.WALLET_NOT_FOUND);
    }
    const expirationDate = wallet.expirationDate ?? helper.dateToStringLocal(new Date(), constants.DATE_FORMAT);

    const expirationDateUpdated = helper.convertMoneyToExpirationDate(payment.amount, expirationDate);
    const newWallet = {
      point: wallet.point + payment.point,
      expirationDate: expirationDateUpdated,
    };

    await paymentService.updatePaymentById(payment._id, { status: enums.StatusPayment.EXECUTED });

    const updateWallet = await walletService.updateWalletByStudent(payment.student, newWallet);
    if (!updateWallet) {
      logger.debug(`[returnPaymentMomo ] ${httpResponses.UPDATE_WALLET_ERROR}`);
      return res.badRequest(httpResponses.UPDATE_WALLET_ERROR);
    }

    await paymentService.updatePaymentById(payment._id, {
      status: enums.StatusPayment.SUCCESS,
    });

    logger.debug(`[returnPaymentMomo ] ${httpResponses.SUCCESS}`);
    return res.ok(httpResponses.SUCCESS);
  } catch (err) {
    logger.error(`[getAllPayment]: error -> ${err.message}`);
    res.internalServer(httpResponses.HTTP_STATUS_INTERNAL_ERROR);
  }
};
//#endregion getAllPaymentByStudent
module.exports = {
  createPaymentByPaypal,
  executePaymentByPaypal,
  cancelPaymentByPaypal,
  createPayment,
  getAllPaymentByStudent,
  createPaymentByMomo,
  returnPaymentByMomo,
};
