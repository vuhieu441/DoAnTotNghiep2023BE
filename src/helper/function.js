const moment = require('moment');

//#region getStartDayEndDayInMonth
/**
 *
 * @param {*} date is string
 * default is now
 */
const getFirstDayLastDayInMonth = (dateString) => {
  const date = dateString ? new Date(dateString) : new Date();
  const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
  const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  return { firstDay, lastDay };
};
//#endDate getStartDayEndDayInMonth

//#region formatDate
/**
 *
 * @param {*} date is string
 * default is now
 */
const formatDate = (format, stringDate) => {
  if (!stringDate) {
    return moment().format(format);
  }
  return moment(stringDate).format(format);
};
//#endDate formatDate

module.exports = {
  getFirstDayLastDayInMonth,
  formatDate,
};
