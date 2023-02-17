const logger = require('../utils/logger');
const EventType = require('./event-type');
const { RoomName, EventName } = require('../constants/enum');
const handlerConnect = require('./handler/connect');

module.exports.wssConnect = () => {
  const WebSocket = require('ws');
  const wssServer = WebSocket.Server;
  const wss = new wssServer({
    port: process.env.WSS_PORT,
  });
  logger.info(`[UDIC wss] wss is established successfully on port ${process.env.WSS_PORT}.`);
  let rooms = {};

  function heartbeat() {
    this.isAlive = true;
  }

  wss.on(EventType.EVENT_CONNECTION, async (socket, request) => {
    logger.info(`[UDIC wss] user connected from path: ${request.url}`);

    socket.isAlive = true;
    socket.on(EventType.EVENT_PONG, heartbeat);

    socket.on(EventType.EVENT_MESSAGE, (payload) => {
      const message = JSON.parse(payload);
      logger.info(`[UDIC wss] message with payload: ${payload}`);

      switch (message.type) {
        case EventName.CONNECT_LESSON:
          logger.info(`[UDIC wss] type: ${message.type}`);
          handlerConnect.connectLesson(socket, rooms, message);

          break;
        case EventName.PROMOTION:
          logger.info(`[UDIC wss] type: ${message.type}`);
          
          break;
        default:
          break;
      }
    });

    socket.on(EventType.EVENT_ERROR, (err) => {
      logger.info(`[UDIC wss] Error: ${err}`);
    });

    socket.on(EventType.EVENT_CLOSE, (e) => {
      logger.info(`[UDIC wss] wss close: ${e}`);
      // Object.keys(rooms).forEach((room) => leave(room));
    });
  });

  const interval = setInterval(function ping() {
    wss.clients.forEach(function each(ws) {
      if (ws.isAlive === false) return ws.terminate();

      ws.isAlive = false;
      ws.ping();
    });
  }, 30000);

  wss.on(EventType.EVENT_CLOSE, (connection) => {
    clearInterval(interval);
  });

  return rooms;
};
