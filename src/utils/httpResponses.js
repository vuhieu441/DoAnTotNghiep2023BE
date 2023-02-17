// Success code
module.exports.HTTP_STATUS_CREATED = 201;
module.exports.HTTP_STATUS_OK = 200;

// Error code
module.exports.HTTP_STATUS_BAD_REQUEST = 400;
module.exports.HTTP_STATUS_UNAUTHORIZED = 401;
module.exports.HTTP_STATUS_NOT_ALLOWED = 403;
module.exports.HTTP_STATUS_NOT_FOUND = 404;
module.exports.HTTP_STATUS_UNSUPPORT_REQUEST = 419;
module.exports.HTTP_STATUS_INTERNAL_ERROR = 500;
module.exports.HTTP_STATUS_CONFLIC = 409;

//#region Error Enum Value
module.exports.ROLE_NOT_FOUND = 'Role not found';
module.exports.GENDER_NOT_FOUND = 'Gender not found';
module.exports.NATIONALITY_NOT_FOUND = 'Nationality not found';
//#endregion Error Enum Value

//#region Access
module.exports.CAN_GET_ACCESS = 'Can get access';
module.exports.PERMISSION_DENIED = 'Permission denied';
module.exports.UNAUTHORIZED = 'Unauthorized';
//#endregion Access

//#region Message when response is success
module.exports.SUCCESS = 'Success';
module.exports.FAIL = 'Fail';
module.exports.LOGIN_SUCCESSFULLY = 'Login successfully';
module.exports.USER_CREATED_SUCCESSFULLY = 'User created successfully';
module.exports.ERROR_PASSWORD_INCORRECT = 'Password incorrect';
module.exports.ERROR_NOT_NEW_PASSWORD = 'New password is undefined';
module.exports.CODE_NOT_FOUND = 'Code not found';
module.exports.LINK_EXPIRE = 'Link expired';
//#endregion Message when response is success

//#region Promotion
module.exports.PROMOTION_NOT_FOUND = 'Promotion not found';
module.exports.PROMOTION_EXISTED = 'Promotion existed';
module.exports.PROMOTION_CREATED_SUCCESSFULLY = 'Promotion created successfully';
module.exports.PROMOTION_UPDATED_SUCCESSFULLY = 'Promotion updated successfully';
module.exports.PROMOTION_DELETED_SUCCESSFULLY = 'Promotion deleted successfully';
module.exports.PROMOTION_CAN_NOT_UPDATE = 'Can not update promotion';
module.exports.PROMOTION_CAN_NOT_DELETE = 'Can not delete promotion';
module.exports.PROMOTION_ACTIVATED = 'Promotion is activated';
module.exports.PROMOTION_MAX_ACTIVE = 'Promotion max active';
//#endregion Promotion

//#region Course
module.exports.COURSE_EXISTED = 'Course existed';
module.exports.COURSE_NOT_FOUND = 'Course not found';
module.exports.COURSE_CREATED_SUCCESSFULLY = 'Course created successfully';
module.exports.COURSE_UPDATED_SUCCESSFULLY = 'Course updated successfully';
module.exports.COURSE_DELETED_SUCCESSFULLY = 'Course deleted successfully';
module.exports.COURSE_MISSING_CODE = 'Missing course code';
module.exports.COURSE_MISSING_TUTOR = 'Missing tutor';
module.exports.COURSE_CREATED_FAIL = 'Course created fail';
module.exports.COURSE_UPDATED_FAIL = 'Course updated fail';
module.exports.COURSE_DELETED_FAIL = 'Course updated fail';
module.exports.CODE_EXISTED = 'Code existed';
module.exports.COURSE_ACTIVED = 'Course actived';
module.exports.COURSE_ACTIVED_SUCCESS = 'Course actived success';
module.exports.COURSE_FULL_SLOT = 'Course full slot';
module.exports.TIMETABLE_MISSING = 'Timetable Missing';
module.exports.COURSE_CONTENT_MISSING = 'CourseContent Missing';
module.exports.TUTOR_MISSING = 'Tutor Missing';
module.exports.COURSE_NOT_ACTIVE = 'Course not active';
module.exports.FIXED_NOT_FOUND = 'Course not found';
module.exports.COURSE_REGISTERED = 'Course Registered';
module.exports.EXPORT_PDF_ERROR = 'PDF export error';
module.exports.FIXED_CALENDAR_DUPLICATE = 'Fixed calendar duplicate';
module.exports.SAME_TIME_SCHEDULE = 'Same Time Schedule';
//#endregion Course

//#region Lesson
module.exports.LESSON_EXISTED = 'Lesson existed';
module.exports.LESSON_REGISTERED = 'Lesson registered';
module.exports.LESSON_NOT_FOUND = 'Lesson not found';
module.exports.LESSON_CREATED_SUCCESSFULLY = 'Lesson created successfully';
module.exports.LESSON_MISSING_CODE = 'Missing lesson code.';
module.exports.LESSON_FLEXIBLE_NOT_HAVE_THIS_STATUS = 'This status of flexibleLesson does not exist';
module.exports.LESSON_FLEXIBLE_NOT_FOUND = 'Flexible lesson not found';
module.exports.LESSON_FLEXIBLE_EXISTED = 'Flexible lesson existed';
module.exports.LESSON_GET_BY_STATUS_SUCCESSFULLY = 'Lesson get by status successfully';
module.exports.LESSON_TIME_NOT_EQUAL_1H = 'Lesson time nnot equal 1 hour';
module.exports.LESSON_TIME_NOT_EQUAL_15M = 'Lesson time not equal 15 min';
module.exports.FLEX_CALENDAR_DUPLICATE = 'Flex calendar duplicate';
module.exports.LESSON_HAVE_TIME_EXISTED = 'Lesson have time existed';
module.exports.LESSON_NOT_SAME_MONTH = 'Lesson not same month';
module.exports.STUDENT_NOT_ENOUGH_MONEY = 'Student not enough money';
//#endregion Lesson

//#region Review
module.exports.REVIEW_EXISTED = 'Review existed';
module.exports.REVIEW_NOT_FOUND = 'Review not found';
module.exports.REVIEW_CREATED_SUCCESSFULLY = 'Review created successfully';
module.exports.STUDENT_HAVE_ONLY_REVIEW = 'Student have only review';
module.exports.CLASS_NOT_START = 'Class has not started yet';

//#endregion Review

//#region User
module.exports.USER_EXISTED = 'User existed';
module.exports.USER_NOT_REAL = 'User not real';
module.exports.TOKEN_INVALID = 'Token invalid';
module.exports.USER_NOT_FOUND = 'User not found';
module.exports.PASSWORD_INCORRECT = 'Password incorrect';
module.exports.USER_CREATED_SUCCESSFULLY = 'User created successfully';
module.exports.PASSWORD_INVALID = 'Current password is invalid';
module.exports.EMAIL_INVALID = 'Current email is invalid';
module.exports.EXISTED_USERS_HAVE_THIS_EMAIL = 'Exist user have this email';
module.exports.USER_NOT_CONFIRM = 'User not confirm';
module.exports.LINK_CONFIRM_DEAD = 'Link is dead';
module.exports.USER_BLOCKED = 'User is blocked';
//#endregion User

//#region Tutor
module.exports.TUTOR_EXISTED = 'Tutor existed';
module.exports.TUTOR_NOT_FOUND = 'Tutor not found';
module.exports.TUTOR_CREATED_SUCCESSFULLY = 'Tutor created successfully';
module.exports.TUTOR_UPDATED_SUCCESSFULLY = 'Tutor updated successfully';
module.exports.TUTOR_DELETED_SUCCESSFULLY = 'Tutor deleted successfully';
module.exports.TUTOR_BLOCKED_SUCCESSFULLY = 'Tutor blocked successfully';
module.exports.TUTOR_CREATED_ERROR = 'Tutor created error';

module.exports.TUTOR_NOT_GOOGLE = 'Tutor not google';
module.exports.CREATE_LINK_MEET_FAIL = 'Create link meet for tutor fail';

//#endregion Tutor

//#region Student
module.exports.STUDENT_EXISTED = 'Student existed';
module.exports.STUDENT_NOT_FOUND = 'Student not found';
module.exports.STUDENT_CREATED_SUCCESSFULLY = 'Student created successfully';
module.exports.STUDENT_UPDATED_SUCCESSFULLY = 'Student updated successfully';
module.exports.STUDENT_BLOCKED_SUCCESSFULLY = 'Student blocked successfully';
module.exports.STUDENT_REGISTER_COURSE_SUCCESS = 'Register course successfully';
module.exports.STUDENT_REGISTER_LESSON_SUCCESS = 'Register lesson successfully';
module.exports.STUDENT_REGISTER_COURSE_FAIL = 'Register course fail';
module.exports.STUDENT_REGISTER_LESSON_FAIL = 'Register lesson fail';
module.exports.STUDENT_GET_DETAIL_SUCCESSFULLY = 'Get student detail successfully';
module.exports.STUDENT_REGISTER_NOT_ENOUGH_POINT = 'Not enough point';
module.exports.CONFIRM_URL_CREATE_NOT_FOUND = 'ComfirmUrl not found';
module.exports.CONFIRM_OK = 'Comfirm ok';
module.exports.REDIRECT_URL_CREATE_NOT_FOUND = 'RedirectUrl not found';
module.exports.STUDENT_REGISTER_NOT_ENOUGH_POINT = 'Not enough point';

//#endregion Student

//#region Category Message
module.exports.CATEGORY_NOT_FOUND = 'Category not found';
module.exports.CATEGORY_CREATED_SUCCESSFULLY = 'Category created successfully';
module.exports.CATEGORY_UPDATED_SUCCESSFULLY = 'Category updated successfully';
module.exports.CATEGORY_DELETED_SUCCESSFULLY = 'Category deleted successfully';
module.exports.CATEGORY_NAME_MISSING = 'Category name missing';
module.exports.CATEGORY_ALREADY_EXIST = 'Category already exist';
module.exports.CATEGORY_STILL_HAS_FLEXIBLE_LESSON = 'Category still exists flexible lesson';
//#endregion Category Message

//#region Staff
module.exports.STAFF_EXISTED = 'Staff existed';
module.exports.STAFF_NOT_FOUND = 'Staff not found';
module.exports.STAFF_CREATED_SUCCESSFULLY = 'Staff created successfully';
module.exports.STAFF_UPDATED_SUCCESSFULLY = 'Staff updated successfully';
module.exports.STAFF_DELETE_SUCCESSFULLY = 'Staff deleted successfully';

//#endregion Staff

//#region Parse Object Fail Messages
module.exports.PARSE_TIMETABLE_FAIL = 'Parse timetable to object fail';
module.exports.PARSE_COURSE_CONTENT_FAIL = 'Parse courseContent to object fail';
module.exports.PARSE_DESCRIPTION_FAIL = 'Parse description to object fail';
//#endregion Parse Object Fail Messages

//#query
module.exports.QUERY_NEGATIVE = 'Argument to $skip or $limit cannot be negative';
module.exports.QUERY_ERROR = 'Query error';

//#region Send Mail
module.exports.SEND_MAIL_SUCCESS = 'Send mail successfully';
module.exports.SEND_MAIL_ERROR = 'Send mail error';
module.exports.SEND_REFUSE = 'refuse';

//#endregion Send Mail

//#region Leave Notice
module.exports.CREATE_LEAVE_NOTICE_SUCCESSFULLY = 'Create leave notice successfully';
module.exports.ERROR_NOT_LESSON = 'Error not lesson';
module.exports.ERROR_TWO_TYPE_LESSON = 'Error two type lesson';
module.exports.LEAVE_NOTION_NOT_FOUND = 'Leave notion not found';
module.exports.LEAVE_NOTION_EXISTED = 'Leave notion existed';

//#endregion Leave Notice

//#region Profile
module.exports.PROFILE_UPDATED_SUCCESS = 'Update profile successfully';
//#endregion Profile

//#region Wallet
module.exports.WALLET_CREATED_SUCCESS = 'Wallet created successfully';
module.exports.WALLET_NOT_FOUND = 'Wallet not found';
//#endregion Wallet

//#region File
module.exports.UPLOAD_FILE_SUCCESSFULLY = 'Upload file successfully';
//#endregion File

//#region Tutor Register
module.exports.TUTOR_REGISTER_FAIL = 'Register fail';
module.exports.TUTOR_REGISTER_SUCCESSFULLY = 'Register successfully';
//#endregion Tutor Register

//#region Tutor Available Schedule
module.exports.CREATE_TUTOR_AVAILABLE_SCHEDULE_SUCCESS = 'Create tutor available schedule success';
module.exports.SCHEDULE_ALREADY_EXIST = 'Schedule already exist';
module.exports.SCHEDULE_NOT_FOUND = 'Schedule not found';
module.exports.AVAILABLE_TIME_NOT_FOUND = 'Available time not found';
module.exports.SCHEDULE_NOT_CONTINUE = 'Schedule not continue';
module.exports.SAME_SCHEDULE_AVAILABLE = 'Same schedule available';

//#endregion Tutor Available Schedule

//#region Verify Code
module.exports.CREATE_VERIFY_CODE_SUCCESS = 'Create verify code successfully';
module.exports.CREATE_VERIFY_CODE_FAIL = 'Create verify code fail';
//#endregion Verify Code

//#region Payment Momo
module.exports.PAYMENT_MOMO_ERROR = 'Payment momo error';
module.exports.CREATE_PAYMENT_MOMO_ERROR = 'Create payment momo error';
module.exports.PAYMENT_MOMO_SUCCESS = 'Payment momo success';
module.exports.CREATE_PAYMENT_MOMO_SUCCESS = 'Create payment momo success';
module.exports.PAYMENT_MOMO_AMOUNT_INVALID = 'Create payment amount invalid';
module.exports.PAYMENT_MOMO_POINT_INVALID = 'Create payment point invalid';
module.exports.PAYMENT_NOT_FOUND = 'Payment not found';
module.exports.UPDATE_WALLET_ERROR = 'Update wallet error';
//#endregion Payment Momo

//#region Payment
module.exports.PAID_SUCCESS = 'Paid successfully';
module.exports.PAID_FAILED = 'Paid failed';
//#endregion Payment

//#region CreateMeeting
module.exports.CREATE_CALENDER_ERROR = 'Create calender error';
module.exports.CREATE_CALENDER_SUCCESS = 'Create calender success';

//#endregion CreateMeeting

//#region Notification
module.exports.CREATE_NOTIFICATION_SUCCESS = 'Create notification success';
module.exports.UPDATE_NOTIFICATION_SUCCESS = 'Update notification success';
module.exports.CREATE_NOTIFICATION_ERROR = 'Create notification error';
module.exports.NOTIFICATION_NOT_FOUND = 'Notification not found';
module.exports.NOTIFICATION_EXISTED = 'Notification existed';
module.exports.NOTIFICATION_HAS_SEEN = 'Notification has seen';
module.exports.NOTIFICATION_HAS_ACTIVE = 'Notification has active';

//#endregion Notification

//#region FlexibleLesson
module.exports.CREATE_FLEXIBLE_SUCCESS = 'Create flexible lesson success';
module.exports.FLEXIBLE_LESSON_ALREADY_EXIST = 'flexible lesson already exist';
module.exports.CREATE_LINK_MEEET_SUCCESS = 'Create link meet success';
module.exports.CREATE_LINK_MEEET_ERROR = 'Create link meet error';

//#endregion FlexibleLesson

//#region RefreshToken
module.exports.REFRESH_TOKEN_FAIL = 'Cannot Get Refresh Token';
module.exports.ACCESS_TOKEN_FAIL = 'Cannot Get Access Token';

//#endregion RefreshToken
