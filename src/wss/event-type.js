const EventType = {
  EVENT_MESSAGE: 'message',
  EVENT_OPEN: 'open',
  EVENT_CLOSE: 'close',
  EVENT_CONNECTION: 'connection',
  EVENT_HEADERS: 'headers',
  EVENT_PONG: 'pong',
  EVENT_ERROR: 'error',
};

Object.freeze(EventType);
module.exports = EventType;
