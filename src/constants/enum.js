const UserRole = {
  ADMIN: 'ADMIN',
  STUDENT: 'STUDENT',
  TUTOR: 'TUTOR',
  CUSTOMER_SERVICE: 'CUSTOMER_SERVICE',
};

const Rate = {
  ONE: 'ONE',
  TWO: 'TWO',
  THREE: 'THREE',
  FOUR: 'FOUR',
  FIVE: 'FIVE',
};

const LessonType = {
  FIXED: 'FIXED',
  FLEXIBLE: 'FLEXIBLE',
};

const LanguageCode = {
  VIETNAMESE: 1,
  JAPANESE: 2,
  ENGLISH: 3,
};

const Gender = {
  MALE: 'MALE',
  FEMALE: 'FEMALE',
};

const Nationality = {
  VN: 'VN',
  JP: 'JP',
};

const Language = {
  VI: 'vi',
  JA: 'ja',
};

const StatusFlexibleLesson = {
  OPEN: 'OPEN',
  REGISTERED: 'REGISTERED',
  INPROGRESS: 'INPROGRESS',
  CANCEL: 'CANCEL',
  MISS: 'MISS',
  FINISH: 'FINISH',
};

const FilterCourse = {
  UPCOMING: 'upcoming',
  INPROGRESS: 'inprogress',
  FINISHED: 'finished',
};

const Filter = {
  NAME: 'NAME',
  CREATED_AT: 'CREATED_AT',
};

const FilterPrice = {
  LT10: 'LT10',
  GTE10_LTE25: 'GTE10_LTE25',
  GT25: 'GT25',
  LT100: 'LT100',
  GTE100_LTE400: 'GTE100_LTE400',
  GT400: 'GT400',
};

const FilterTime = {
  GTE6_LTE9: 0,
  GTE9_LTE12: 1,
  GTE12_LTE15: 2,
  GTE15_LTE18: 3,
  GTE18_LTE22: 4,
};

const MethodPayment = {
  PAYPAL: 'PAYPAL',
  MOMO: 'MOMO',
};

const Currency = {
  USD: 'USD',
};

const MailType = {
  SUPPORT: 'SUPPORT',
  RESPONSE: 'RESPONSE',
  OTHER: 'OTHER',
};

const StatusPayment = {
  SUCCESS: 'SUCCESS',
  FAIL: 'FAIL',
  REQUEST: 'REQUEST',
  EXECUTED: 'EXECUTED',
};

const StatusTutorRegister = {
  REQUEST: 'REQUEST',
  CONFIRM: 'CONFIRM',
};

const StatusFilterTutor = {
  ACTIVE: 'ACTIVE',
  BLOCK: 'BLOCK',
  NOT_ACTIVE: 'NOT_ACTIVE',
};

const KeysIcon = {
  TOTAL_TIME: 'TOTAL_TIME',
  TOTAL_PRICE: 'TOTAL_PRICE',
  TOTAL_STUDENTS: 'TOTAL_STUDENTS',
  TOTAL_TUTOR: 'TOTAL_TUTOR',
  TOTAL_FLEXIBLE_LESSON: 'TOTAL_FLEXIBLE_LESSON',
  TOTAL_COURSES: 'TOTAL_COURSES',
  TOTAL_FIXED_LESSON: 'TOTAL_FIXED_LESSON',
};

const ActionSocket = {
  CONNECTION: 'connection',
  DISCONNECT: 'disconnect',
  LEAVE_NOTICE: 'leave_notice',
  REGISTERED: 'registered',
};

const TypeLeaveNotice = {
  STUDENT_CANCEL: 'STUDENT_CANCEL',
  TUTOR_CANCEL: 'TUTOR_CANCEL',
};

const TypeNotification = {
  LEAVE_NOTICE: 'LEAVE_NOTICE',
  REGISTER_FLEXIBLELESSON: 'REGISTER_FLEXIBLELESSON',
  PROMOTION: 'PROMOTION',
};

// WebSocket
const RoomName = {
  LESSON: 'LESSON',
  PROMOTION: 'PROMOTION',
};

const EventName = {
  CONNECT_LESSON: 'CONNECT_LESSON',
  NOTIFICATION: 'NOTIFICATION',
  PROMOTION: 'PROMOTION',
};

module.exports = {
  UserRole,
  Rate,
  LessonType,
  LanguageCode,
  Gender,
  Nationality,
  Language,
  StatusFlexibleLesson,
  FilterCourse,
  Filter,
  FilterPrice,
  FilterTime,
  MethodPayment,
  Currency,
  MailType,
  StatusPayment,
  StatusFilterTutor,
  KeysIcon,
  StatusTutorRegister,
  ActionSocket,
  TypeLeaveNotice,
  RoomName,
  EventName,
  TypeNotification
};
