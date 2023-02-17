const logger = require('../utils/logger');
const httpResponses = require('../utils/httpResponses');

const sendGridMail = require('@sendgrid/mail');
const { MAILER } = require('../constants/constants');

const sendGmail = async (mail) => {
  try {
    sendGridMail.setApiKey(MAILER.SENDGRID_API_KEY);
    logger.info(`[mailer] SENDGRID_API_KEY -> ${MAILER.SENDGRID_API_KEY}`);

    const response = await sendGridMail.send(mail);
    logger.info(`[mailer] sendMail -> ${JSON.stringify(response)}`);
    return {
      success: true,
      message: `${httpResponses.SUCCESS}`,
    };
  } catch (error) {
    logger.error(`[mailer] send mail error -> ${JSON.stringify(error.response.body.errors[0].message)}`);
    return {
      success: false,
      message: `${error.response.body.errors[0].message || httpResponses.SEND_MAIL_ERROR}`,
    };
  }
};

module.exports = { sendGmail };
