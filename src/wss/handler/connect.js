const logger = require('../../utils/logger');

// Services
const userService = require('../../services/user');
const { RoomName } = require('../../constants/enum');
const { USER_NOT_FOUND } = require('../../utils/httpResponses');

const connectLesson = (socket, rooms, payload) => {
  logger.info(`[WSS][connectLesson] payload -> ${JSON.stringify(payload)}`);
  const existedUser = userService.getUserById(payload.idUser);
  if (!existedUser) {
    logger.info(`[WSS][connectLesson] error -> ${USER_NOT_FOUND}`);
    return;
  }
  if (!rooms[RoomName.LESSON]) {
    rooms[RoomName.LESSON] = {};
  }
  rooms[RoomName.LESSON][payload.idUser] = socket;
};

module.exports = {
  connectLesson,
};
