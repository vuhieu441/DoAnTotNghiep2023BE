const options = require('./option');
const fs = require('fs');
const pdf = require('pdf-creator-node');
const path = require('path');
const logger = require('../utils/logger');

const createPdf = async (data, dashboard) => {
  try {
    const html = fs.readFileSync(path.join(__dirname, '../public/tutor2.html'), 'utf-8');
    const certificates = [];

    if (data.certificates) {
      data.certificates.forEach((cer) => {
        certificates.push({
          name: cer.name,
          start: cer.start,
          end: cer.end,
          cerUrl: cer.cerUrl,
          description: cer.description,
        });
      });
    }

    const document = {
      html: html,
      data: {
        name: data.lastName.concat(` ${data.firstName}`),
        avatarUrl: data.avatarUrl,
        gender: data.gender,
        description: data.description,
        phoneNumber: data.phoneNumber,
        email: data.email,
        dob: data.dob,
        certificates: certificates,
        nationality: data.nationality,
        // sizeCourse: dashboard.sizeCourse,
        // sizeFlex: dashboard.sizeFlex,
        // totalPrice: dashboard.totalPrice,
        // totalTime: dashboard.totalTime,
        // totalStudents: dashboard.sizeStudents ?? 0,
      },
      // path: './public/docs/' + filename,
      type: 'buffer',
    };
    const done = await new Promise((resolve, reject) => {
      pdf
        .create(document, options)
        .then((res) => {
          resolve(res);
        })
        .catch((error) => {
          reject(false);
        });
    });
    return done;
  } catch (err) {
    logger.error(`[exportPdf] error->: ${err.message}`);
    return false;
  }
};

module.exports = { createPdf };
