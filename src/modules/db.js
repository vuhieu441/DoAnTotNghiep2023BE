require('dotenv').config();
const mongoose = require('mongoose');
const logger = require('../utils/logger');

module.exports.initDbConnection = async () => {
  mongoose
    .connect(process.env.DB_URL, {
      useCreateIndex: true,
      useFindAndModify: false,
      useNewUrlParser: true,
      useUnifiedTopology: true,
    })
    .then(() => {
      logger.debug('[Udic Edu] Database connect successfully.');
    })
    .catch((err) => {
      logger.error(`Error connecting: ${err.message}`);
    });
};
