const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const constants = require('../constants/constants');

passport.use(
  new GoogleStrategy({
    clientID: constants.CALENDAR.CLIENT_ID,
    clientSecret: constants.CALENDAR.CLIENT_SECRET,
    callbackURL: constants.CALENDAR.REDIRECT_URL,
    proxy: true
  },
    async (accessToken, refreshToken, profile, done) => {
      done(null, profile);
    })
);