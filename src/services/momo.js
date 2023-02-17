const logger = require('../utils/logger');
const https = require('https');
const helper = require('../helper/helperFunction');
const constants = require('../constants/constants');

var partnerCode = constants.PARTNER_CODE;
var accessKey = constants.ACCESS_KEY;

var orderInfo = constants.ORDER_INFO_MOMO || 'pay with MoMo';
var ipnUrl = constants.REDIRECT_URL_MOMO;
var requestType = constants.REQUEST_TYPE_MOMO || 'captureWallet';
var extraData = ''; //pass empty value if your merchant does not have stores

const paymentMomo = async (amount, redirectUrl, requestId) => {
  try {
    const orderId = requestId;
    const url = await new Promise((resolve, reject) => {
      var rawSignature =
        'accessKey=' +
        accessKey +
        '&amount=' +
        amount +
        '&extraData=' +
        extraData +
        '&ipnUrl=' +
        ipnUrl +
        '&orderId=' +
        orderId +
        '&orderInfo=' +
        orderInfo +
        '&partnerCode=' +
        partnerCode +
        '&redirectUrl=' +
        redirectUrl +
        '&requestId=' +
        requestId +
        '&requestType=' +
        requestType;

      const signature = helper.createHash(rawSignature);
      logger.info(`[paymentMomo] signature: ${signature}`);

      const requestBody = JSON.stringify({
        partnerCode: partnerCode,
        accessKey: accessKey,
        requestId: requestId,
        amount: amount,
        orderId: orderId,
        orderInfo: orderInfo,
        redirectUrl: redirectUrl,
        ipnUrl: ipnUrl,
        extraData: extraData,
        requestType: requestType,
        signature: signature,
        lang: 'vi',
      });

      const options = {
        hostname: 'test-payment.momo.vn',
        port: 443,
        path: '/v2/gateway/api/create',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(requestBody),
        },
      };

      const req = https.request(options, (res) => {
        logger.info(`[paymentMomo] Status: ${res.statusCode}`);
        logger.info(`[paymentMomo]Headers: ${JSON.stringify(res.headers)}`);
        res.setEncoding('utf8');
        res.on('data', (body) => {
          return resolve(JSON.parse(body));
        });
        res.on('end', () => {
          logger.debug(`[paymentMomo] end.`);
        });
      });

      req.on('error', (e) => {
        logger.error(`[paymentMomo] problem with request: ${e.message}`);
        reject('');
      });
      req.write(requestBody);
      req.end();
    });
    logger.info(`[paymentMomo] url ->${url}`);
    return url;
  } catch (err) {
    logger.error(`[paymentMomo] error: ${err.message}`);
    return '';
  }
};

const getRateUsdVnd = async () => {
  const rate = await new Promise((resolve, reject) => {
    const url = constants.LINK_URL_RATE_USD_VND;

    const request = https.request(url, (response) => {
      let data = '';
      response.on('data', (chunk) => {
        data = data + chunk.toString();
      });
      response.on('end', () => {
        const body = JSON.parse(data);
        resolve(body);
      });
    });
    request.on('error', (error) => {
      reject(false);
    });

    request.end();
  });
  return rate;
};

module.exports = {
  paymentMomo,
  getRateUsdVnd,
};
