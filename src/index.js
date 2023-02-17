require('dotenv').config();
const logger = require('./utils/logger');
const app = require('./app');
const http = require('http');
const server = http.Server(app);
const wssServer = http.createServer(app);
const enums = require('./constants/enum');
const packageInfo = require('../package.json');
const indexRoute = require('./routes/index');
const { wssConnect } = require('./wss/wss');

const rooms = wssConnect();

/**
 * Naming Convention REST API
 * create:    POST   students/
 * update:    PUT    students/:id
 * get many:  GET    students/?
 * get id:    GET    students/:id
 * delete:    DELETE students/:id
 */
server.listen(process.env.SERVER_PORT_PROD, (error) => {
  if (error) {
    logger.error(`error: ${error}`);
    process.exit(1);
  }
  logger.debug(`[Udic Edu] Version: *** ${packageInfo.version} ***`);
  logger.debug(`[Udic Edu] Server is listening on port: ${process.env.SERVER_PORT_PROD}`);
});

const middlewareSetupRooms = (req, res, next) => {
  req.rooms = rooms;
  // logger.debug(`[Udic Edu][middlewareSetupRooms] rooms -> ${JSON.stringify(rooms)}`);
  next();
};
app.use('/api', middlewareSetupRooms, indexRoute);
