const mongoose = require('mongoose');
const constants = require('../constants/constants');
const moment = require('moment');
var generator = require('generate-password');
const crypto = require('crypto');

const jsonToObject = (json) => {
  try {
    return JSON.parse(json);
  } catch (err) {
    return null;
  }
};

const nextDay = (day) => {
  const nextDay = new Date(day);
  nextDay.setDate(day.getDate() + 1);
  return nextDay;
};

const stringToDate = (stringDate) => {
  return new Date(stringDate); // string Date Format: yyyy-MM-dd HH:mm
};

const dateToStringLocal = (time, format) => {
  return moment(time).local().format(format);
};

const dateToStringUTC = (time, format) => {
  return moment(time).utc().format(format);
};

//#region getTimetableFixedLesson
const getTimetableFixedLesson = (openDay, numberLessons, timetableCourses) => {
  const timetableFixedLessons = [];
  let startDateObj = new Date(openDay);
  while (timetableFixedLessons.length < numberLessons) {
    const startDateStr = dateToStringLocal(startDateObj, constants.DATE_FORMAT);
    const dowStartLesson = startDateObj.getDay() + 1; // dow: day of week
    const timetableLesson = timetableCourses.find((x) => x.dayOfWeek === dowStartLesson);
    if (timetableLesson) {
      const startTime = stringToDate(
        `${startDateStr}T${convertTimeToString(timetableLesson.start.hour)}:${convertTimeToString(
          timetableLesson.start.minute
        )}${timetableLesson.timeZone}`
      );
      const endTime = stringToDate(
        `${startDateStr}T${convertTimeToString(timetableLesson.end.hour)}:${convertTimeToString(
          timetableLesson.end.minute
        )}${timetableLesson.timeZone}`
      );
      timetableFixedLessons.push({ startTime, endTime });
    }
    startDateObj = nextDay(startDateObj);
  }
  return timetableFixedLessons;
};
//#endregion getTimetableFixedLesson

//#region getTimetableFixedLesson
const convertTimeToString = (numberTime) => {
  if (numberTime < 10) {
    return `0${numberTime}`;
  }
  return numberTime < 10 ? `0${numberTime}` : numberTime;
};
//#endregion getTimetableFixedLesson

//#region generateCodeCourse
const generateCodeCourse = (prefix, length) => {
  let result = '';
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const charactersLength = characters.length;
  for (var i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return `${prefix}_${result.toUpperCase()}_${timeStampNow()}`;
};
//#endregion generateCodeCourse5

//#region timeStampNow
const timeStampNow = () => {
  return new Date().getTime();
};
//#endregion timeStampNow

//#region calculateHourBetweenTime
const calculateHour = (startTime, endTime) => {
  const timeStart = new Date(startTime);
  const timeEnd = new Date(endTime);
  const hours = (timeEnd - timeStart) / (3600 * 1000);
  return hours;
};
//#endregion calculateHourBetweenTime

const convertDateMongoDbToStringLocal = (date) => {
  const time = new Date(date).toISOString().split('T');
  const hour = time[1].split(':');
  const fullTime = `${time[0]} ${hour[0]}:${hour[1]}`;
  return fullTime;
};

const convertQueryToArray = (query) => {
  if (query && !Array.isArray(query)) return [query];
  return query;
};

const removeIdInArrayObject = (array) => {
  return array.map((a) => {
    const { _id, ...rest } = a;
    return rest;
  });
};

//#region convertMoneyToExpirationDate
const convertMoneyToExpirationDate = (money, expirationDate) => {
  const days = money / 1;
  const expirationDateNow = new Date(expirationDate);
  expirationDateNow.setDate(expirationDateNow.getDate() + days);
  return dateToStringLocal(expirationDateNow, constants.DATE_FORMAT);
};
//#endregion convertMoneyToExpirationDate

const isObjectEmpty = (value) => {
  return Object.keys(value).length === 0 && value.constructor === Object;
};

const generatePassword = () => {
  return generator.generate({
    length: 8,
    numbers: true,
  });
};

const createHash = (data) => {
  const hash = crypto.createHmac('sha256', constants.SECRET_KEY_MOMO).update(data).digest('hex');
  return hash;
};

const convertTimezone = (timezone) => {
  if (typeof timezone !== 'string' || !timezone) return '+00:00';
  const _timezone = timezone.trim();
  return _timezone[0] !== '-' ? `+${_timezone}` : _timezone;
};
/**
 * will match one and only one of the string 'true','1' rerardless
 * of capitalization and regardless off surrounding white-space.
 * @param {*} str
 * @returns
 */
const strToBool = (str) => {
  if (typeof str !== 'string') return null;
  regex = /^\s*(true|1)\s*$/i;
  return regex.test(str);
};
//get last page
const getLastPage = (total, limit) => {
  return Math.floor(total / limit) + 1;
};

module.exports = {
  jsonToObject,
  nextDay,
  getTimetableFixedLesson,
  stringToDate,
  dateToStringLocal,
  generateCodeCourse,
  timeStampNow,
  convertDateMongoDbToStringLocal,
  calculateHour,
  convertQueryToArray,
  removeIdInArrayObject,
  convertMoneyToExpirationDate,
  isObjectEmpty,
  dateToStringUTC,
  generatePassword,
  createHash,
  convertTimezone,
  strToBool,
  getLastPage,
};
