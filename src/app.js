const express = require('express');
const app = express();
const cors = require('cors');
const passport = require('passport');
const indexRoute = require('./routes/index');
const { initDbConnection } = require('./modules/db');
const logger = require('./utils/logger');
const session = require('express-session');
const keys = require('./constants/keys');
const httpResponses = require('./utils/httpResponses');
const packageInfo = require('../package.json');
require('./helper/passport');

initDbConnection().catch(() => {
  logger.error(`error db connection`);
  process.exit(1);
});

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header(
    'Access-Control-Allow-Headers',
    'Authorization, X-API-KEY, Origin, X-Requested-With, Content-Type, Accept, Access-Control-Allow-Request-Method'
  );
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
  res.header('Allow', 'GET, POST, OPTIONS, PUT, DELETE');
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.set('trust proxy', 1); // trust first proxy
app.use(
  session({
    secret: keys.SESSION_SECRET_KEY,
    resave: false,
    saveUninitialized: true,
    cookie: { secure: true },
  })
);

app.use(passport.initialize());
app.use(passport.session());

app.use(cors());
app.use((req, res, next) => {
  res.badRequest = (message) => {
    return res.status(httpResponses.HTTP_STATUS_BAD_REQUEST).json({
      success: false,
      message: message,
    });
  };
  res.notFound = (message) => {
    return res.status(httpResponses.HTTP_STATUS_NOT_FOUND).json({
      success: false,
      message: message,
    });
  };
  res.internalServer = (message) => {
    return res.status(httpResponses.HTTP_STATUS_INTERNAL_ERROR).json({
      success: false,
      message: message,
    });
  };
  res.ok = (message, data) => {
    const responseObj = {
      success: true,
    };
    message && (responseObj.message = message);
    data && (responseObj.data = data);
    return res.status(httpResponses.HTTP_STATUS_OK).json(responseObj);
  };
  res.created = (message, data) => {
    const responseObj = {
      success: true,
      message: message,
    };
    data && (responseObj.data = data);
    return res.status(httpResponses.HTTP_STATUS_CREATED).json(responseObj);
  };
  res.response = (statusCode, success, message, data) => {
    const responseObj = {
      success: success,
      message: message,
    };
    data && (responseObj.data = data);
    return res.status(statusCode).json(responseObj);
  };
  next();
});

app.get('/', function (req, res) {
  logger.debug('/');
  res.send('Udic - Edu - Backend');
});

module.exports = app;
