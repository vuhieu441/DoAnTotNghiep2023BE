const { google } = require('googleapis');
const constants = require('../constants/constants');
const SCOPES = ['https://www.googleapis.com/auth/calendar', 'https://www.googleapis.com/auth/calendar.events'];

const logger = require('../utils/logger');

const oAuth2Client = new google.auth.OAuth2(
  constants.CALENDAR.CLIENT_ID,
  constants.CALENDAR.CLIENT_SECRET,
  constants.CALENDAR.REDIRECT_URL
);

const authorize = async (code) => {
  return await getAccessToken(oAuth2Client, code);
};

module.exports.generateAuthUrl = async (state) => {
  const url = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    state: JSON.stringify(state),
  });
  return url;
};

module.exports.getAccessToken = async (code) => {
  const token = await oAuth2Client.getToken(code);
  return {
    accessToken: token.tokens.access_token,
    refreshToken: token.tokens.refresh_token,
    exp: token.tokens.expiry_date,
  };
};

module.exports.createMeeting = async (event, refreshToken) => {
  try {
    const auth = new google.auth.OAuth2(constants.CALENDAR.CLIENT_ID, constants.CALENDAR.CLIENT_SECRET);
    auth.setCredentials({
      refresh_token: refreshToken,
    });

    const calendar = google.calendar({ version: 'v3', auth: auth });

    const _event = {
      summary: event.summary,
      location: event.location,
      description: event.description,
      colorId: 1,
      conferenceData: {
        createRequest: {
          requestId: 'zzz',
          conferenceSolutionKey: {
            type: 'hangoutsMeet',
          },
        },
      },
      start: {
        dateTime: event.startTime,
        timeZone: 'Asia/Ho_Chi_Minh',
      },
      end: {
        dateTime: event.endTime,
        timeZone: 'Asia/Ho_Chi_Minh',
      },
      // attendees: [
      //   { 'email': 'vuluongbangbka@gmail.com' },
      // ],
    };

    let link = await calendar.events.insert({
      calendarId: 'primary',
      conferenceDataVersion: '1',
      resource: _event,
    });

    return link.data.hangoutLink;
  } catch (e) {
    logger.debug(`[createMeeting] ${e.message}`);
    return false;
  }
};
