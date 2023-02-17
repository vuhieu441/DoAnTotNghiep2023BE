var winston = require('winston');
const { LoggingWinston } = require('@google-cloud/logging-winston');

var logger;

if (process.env.NODE_ENV === 'http') {
  const loggingWinston = new LoggingWinston();
  logger = winston.createLogger({
    transports: [new winston.transports.Console(), loggingWinston],
    level: process.env.WINSTON_LOGGER_LOG_LEVEL,
  });
} else if (process.env.NODE_ENV === 'debug' || process.env.NODE_ENV === 'stag') {
  logger = winston.createLogger({
    transports: [new winston.transports.Console()],
    level: process.env.WINSTON_LOGGER_LOG_LEVEL,
  });
} else {
  throw new Error(`Error: wrong NODE_ENV param. It's must be http OR debug`);
}

module.exports = logger;
