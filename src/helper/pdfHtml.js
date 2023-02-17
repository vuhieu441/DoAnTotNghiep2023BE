var fs = require('fs');
// var pdf = require('html-pdf');
const path = require('path');
const logger = require('../utils/logger');

var html = fs.readFileSync(path.join(__dirname, '../public/tutor2.html'), 'utf8');
var options = {
  format: 'Letter',
  orientation: 'portrait',
  timeout: 10000,
  type: 'pdf',
};

const createPdfHtml = async () => {
  try {
    return await new Promise((resolve, reject) => {
      pdf.create(html, options).toBuffer(function (err, res) {
        if (err) {
          logger.debug(`[createPdf] error => ${err}`);
          return reject(err);
        }
        resolve(res);
      });
    });
  } catch (e) {
    return false;
  }
};

module.exports = { createPdfHtml };
