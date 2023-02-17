const logger = require('../utils/logger');
const httpResponses = require('../utils/httpResponses');
const googleHelper = require('../helper/googleHelper');
const flexibleLessonService = require('../services/flexibleLesson');
const tutorService = require('../services/tutor');
const constants = require('../constants/constants')

//#region googleMeetRequest
/**
 * Request google meet.
 * @param {*} req 
 * @param {*} res 
 * @returns 
 */
const googleMeetRequest = async (req, res) => {
  try {
    const { user } = req.session;
    logger.debug(`googleMeetRequest: ${JSON.stringify(req.session)}`);

    const tutor = await tutorService.getTutor({ user: user._id });
    if (!tutor) {
      logger.debug(`generateGoogleMeetUrl: ${httpResponses.TUTOR_NOT_FOUND}`)
      res.badRequest(httpResponses.TUTOR_NOT_FOUND);
    }
    logger.debug(`generateGoogleMeetUrl: clientId -> ${constants.CALENDAR.CLIENT_ID}`);
    logger.debug(`generateGoogleMeetUrl: clientSecret -> ${constants.CALENDAR.CLIENT_SECRET}`);
    logger.debug(`generateGoogleMeetUrl: redirectUrl -> ${constants.CALENDAR.REDIRECT_URL}`);

    const state = {
      tutorId: tutor._id,
    }
    const authUrl = await googleHelper.generateAuthUrl(state);

    return res.status(httpResponses.HTTP_STATUS_OK).json({
      success: true,
      message: `${httpResponses.SUCCESS}`,
      data: {
        authUrl: authUrl
      }
    });
  } catch (err) {
    logger.error(`[googleMeetRequest] error -> ${err.message}`);
    res.status(httpResponses.HTTP_STATUS_INTERNAL_ERROR).json({
      success: false,
      message: `${err.message}`,
    });
  }
}
//#endregion googleMeetRequest

//#region saveGoogleMeetCallback
/**
 * Save Google Meeting Callback
 * @param {*} req
 * @param {*} res
 * @returns
 */
const saveGoogleMeetCallback = async (req, res) => {
  try {
    const { code, state, error } = req.query;
    logger.debug(`[saveGoogleMeetCallback]: ${JSON.stringify(req.query)}`);

    if (error) {
      return res.redirect(`${constants.FRONT_END_URL}/tutors/google-meet/fail`);
    }

    const { tutorId, lessonId } = JSON.parse(state);
    logger.debug(`[saveGoogleMeetCallback]: tutorId -> ${tutorId}`);

    const tokens = await googleHelper.getAccessToken(code);

    logger.debug(`[saveGoogleMeetCallback]: token -> ${JSON.stringify(tokens)}`)

    if (!tokens.accessToken) {
      logger.debug(`[saveGoogleMeetCallback]: accessToken -> ${httpResponses.ACCESS_TOKEN_FAIL}`)
      return res.badRequest(httpResponses.ACCESS_TOKEN_FAIL);
    }

    if (!tokens.refreshToken) {
      logger.debug(`[saveGoogleMeetCallback]: refreshToken -> ${httpResponses.REFRESH_TOKEN_FAIL}`)
      return res.badRequest(httpResponses.REFRESH_TOKEN_FAIL);
    }

    const tutorUpdate = await tutorService.updateTutor(tutorId, { googleCalendarTokens: { accessToken: tokens.accessToken, refreshToken: tokens.refreshToken }, isOAuthGoogle: true });
    if (!tutorUpdate) {
      logger.debug(`[saveGoogleMeetCallback]: ${httpResponses.TUTOR_NOT_FOUND}`)
      return res.badRequest(httpResponses.TUTOR_NOT_FOUND)
    }
    if (lessonId) {
      const lessonFound = await flexibleLessonService.getFlexibleLessonById(lessonId);
      if (!lessonFound) {
        logger.debug(`[saveGoogleMeetCallback]: ${httpResponses.LESSON_FLEXIBLE_NOT_FOUND}`)
        return res.badRequest(httpResponses.LESSON_FLEXIBLE_NOT_FOUND);
      }

      const event = {
        summary: lessonFound.name,
        description: lessonFound.description,
        startTime: lessonFound.startTime,
        endTime: lessonFound.endTime,
      }

      const link = await googleHelper.createMeeting(event, tokens.refreshToken);

      await flexibleLessonService.updateFlexibleLesson(lessonFound._id, { linkMeet: link });
    }

    return res.redirect(`${constants.FRONT_END_URL}/tutors/google-meet/success`);
  } catch (err) {
    logger.error(`[saveGoogleMeetCallback] error -> ${err.message}`);
    res.status(httpResponses.HTTP_STATUS_INTERNAL_ERROR).json({
      success: false,
      message: `${err.message}`,
    });
  }
};
//#endregion saveGoogleMeetCallback

//#region generateGoogleMeetUrl
/**
 * Generate Google Meet Url
 * @param {*} req 
 * @param {*} res 
 */
const generateGoogleMeetUrl = async (req, res) => {
  try {
    const { user } = req.session;

    const { lessonId } = req.query;
    logger.debug(`generateGoogleMeetUrl: ${JSON.stringify(req.query)}`);

    const tutor = await tutorService.getTutor({ user: user._id });
    if (!tutor) {
      logger.debug(`generateGoogleMeetUrl: ${httpResponses.TUTOR_NOT_FOUND}`)
      res.badRequest(httpResponses.TUTOR_NOT_FOUND);
    }

    const lesson = await flexibleLessonService.getFlexibleLessonById(lessonId);
    if (!lesson) {
      logger.debug(`generateGoogleMeetUrl: ${httpResponses.LESSON_FLEXIBLE_NOT_FOUND}`)
      res.badRequest(httpResponses.LESSON_FLEXIBLE_NOT_FOUND);
    }

    const event = {
      summary: lesson.name,
      description: lesson.description,
      startTime: lesson.startTime,
      endTime: lesson.endTime,
    }

    const link = await googleHelper.createMeeting(event, tutor.googleCalendarTokens.refreshToken);
    const data = { link };
    res.ok(httpResponses.SUCCESS, data);

  } catch (err) {
    logger.error(`[generateGoogleMeetUrl] error -> ${err.message}`);
    res.internalServer(httpResponses.HTTP_STATUS_INTERNAL_ERROR);
  }
}

module.exports = {
  saveGoogleMeetCallback,
  googleMeetRequest,
  generateGoogleMeetUrl,
}