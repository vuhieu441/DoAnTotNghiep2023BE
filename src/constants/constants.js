module.exports.SALT_ROUND = 10;
module.exports.EXPIRES_IN = 365 * 24 * 60 * 60;
module.exports.EXPIRES_IN_1H = 60 * 60;

module.exports.EMAIL_VERIFY_CODE_LENGTH = 50;
module.exports.EMAIL_VERIFY_CODE_TYPE = 'url-safe';

module.exports.PHONE_VERIFY_CODE_LENGTH = 4;
module.exports.PHONE_VERIFY_CODE_TYPE = 'number';

module.exports.PREFIX_CODE = `PROMO`;

module.exports.MAILER = {
  SENDGRID_API_KEY: process.env.SENDGRID_API_KEY,
};

// GCP
module.exports.GCP = {
  GCS_BUCKET_NAME: process.env.GCS_BUCKET_NAME,
  GCP_SECRET_KEY: process.env.GCP_SECRET_KEY_FILE,
  GCP_STORAGE_URL: process.env.GCP_STORAGE_URL,
};

// Google API
module.exports.GOOGLE_API = {
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET_KEY: process.env.GOOGLE_CLIENT_SECRET_KEY,
};

// Vonage Api
module.exports.VONAGE = {
  API_KEY: process.env.VONAGE_API_KEY,
  API_SECRET_KEY: process.env.VONAGE_API_SECRET_KEY,
  SEND_MESSAGE_FROM: process.env.VONAGE_SEND_MESSAGE_FROM,
};

module.exports.FILE_MAX_SIZE = 10 * 1024 * 1024;
module.exports.ERR_CODE = {
  LIMIT_FILE_SIZE: 'LIMIT_FILE_SIZE',
};

//#region Pagination
module.exports.PAGINATION_DEFAULT_PAGE = 1;
module.exports.PAGINATION_DEFAULT_LIMIT = 10;
//#endregion Pagination

//#region Character Special
module.exports.CHAR_COMMA = ',';
//#endregion Character Special

//#region Time
module.exports.DAY_OF_WEEKS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
module.exports.DATE_TIME_FORMAT = 'yyyy-MM-DD HH:mm';
module.exports.DATE_FORMAT = 'yyyy-MM-DD';
module.exports.DATE_FORMAT_AGGREGATE = '%Y-%m-%d';
module.exports.DATE_TIME_FORMAT_AGGREGATE = '%Y-%m-%d %H:%m';

//#endregion Time

//#region Calendar
module.exports.CALENDAR = {
  CLIENT_ID: process.env.CALENDAR_CLIENT_ID,
  CLIENT_SECRET: process.env.CALENDAR_CLIENT_SECRET,
  REDIRECT_URL: process.env.CALENDAR_REDIRECT_URL,
};
//#endregion Calendar

module.exports.FRONT_END_URL = process.env.FRONT_END_URL;

// Filter price
module.exports.PRICE_FILTER = {
  LT10: { salaryPerHour: { $lt: 10 } },
  GTE10_LTE25: {
    $and: [{ salaryPerHour: { $gte: 10 } }, { salaryPerHour: { $lte: 25 } }],
  },
  GT25: { salaryPerHour: { $gt: 25 } },
};

module.exports.TIME_FILTER = [
  {
    startHour: { $gte: 6 },
    endHour: { $lt: 9 },
  },
  {
    startHour: { $gte: 9 },
    endHour: { $lt: 12 },
  },
  {
    startHour: { $gte: 12 },
    endHour: { $lt: 15 },
  },
  {
    startHour: { $gte: 15 },
    endHour: { $lt: 18 },
  },
  {
    startHour: { $gte: 18 },
    endHour: { $lt: 22 },
  },
];

module.exports.TIME_FILTER_EXPR = [
  {
    $and: [
      {
        $gte: ['$startHour', 6],
      },
      {
        $lt: ['$endHour', 9],
      },
    ],
  },
  {
    $and: [
      {
        $gte: ['$startHour', 9],
      },
      {
        $lt: ['$endHour', 12],
      },
    ],
  },
  {
    $and: [
      {
        $gte: ['$startHour', 12],
      },
      {
        $lt: ['$endHour', 15],
      },
    ],
  },
  {
    $and: [
      {
        $gte: ['$startHour', 15],
      },
      {
        $lt: ['$endHour', 18],
      },
    ],
  },
  {
    $and: [
      {
        $gte: ['$startHour', 18],
      },
      {
        $lt: ['$endHour', 22],
      },
    ],
  },
];

module.exports.LINK_LOGIN = 'https://vietlesson4u.com/auth/login';

module.exports.NAME_MONTH = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

module.exports.REGEX_VALID_GMAIL =
  /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+")).{3}@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

module.exports.EXPIRES_AFTER_SECONDS = 3600;

module.exports.SUBJECT_MAIL = `VietLesson account`;

module.exports.AUTHENTICATION_REDIRECT_URL = `${process.env.API_END_URL}/users/confirm`;

module.exports.SECRET_KEY_MOMO = process.env.SECRET_KEY_MOMO;

module.exports.ORDER_INFO_MOMO = 'pay with MoMo';

module.exports.REQUEST_TYPE_MOMO = 'captureWallet';

module.exports.REDIRECT_URL_MOMO = `${process.env.API_END_URL}/payments/by-momo`;

module.exports.PARTNER_CODE = process.env.PARTNER_CODE;

module.exports.ACCESS_KEY = process.env.ACCESS_KEY;

module.exports.LINK_URL_RATE_USD_VND = `https://free.currconv.com/api/v7/convert?q=USD_VND&compact=ultra&apiKey=9d16f7c5cda57b2ef3a5`;

module.exports.MIN_AMOUNT_MOMO = 1000;

module.exports.MAX_AMOUNT_MOMO = 2000000;

module.exports.RATE_USD_VNU = 23000;

module.exports.FORGOT_PASSWORD = 'Quên mật khẩu';

module.exports.DEFAULT_MIMUTE = 15;
