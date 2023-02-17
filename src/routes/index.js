const express = require('express');
const indexRoute = express.Router();

const userRoute = require('./user');
const promotionRoute = require('./promotion');
const lessonRoute = require('./lesson');
const courseRoute = require('./course');
const reviewRoute = require('./review');
const studentRoute = require('./student');
const tutorRoute = require('./tutor');
const categoryRoute = require('./category');
const staffRoute = require('./staff');
const googleMeetRoute = require('./googleMeet');
const leaveNoticeRoute = require('./leaveNotice');
const paymentRouter = require('./payment');
const fileRouter = require('./file');
const scheduleRouter = require('./schedule');
const versionRouter = require('./version');
const notificationRouter = require('./notification');
const flexibleLessonRoute = require('./flexibleLesson');
module.exports = indexRoute;

indexRoute.use('/users', userRoute);

indexRoute.use('/promotions', promotionRoute);

indexRoute.use('/lessons', lessonRoute);

indexRoute.use('/courses', courseRoute);

indexRoute.use('/reviews', reviewRoute);

indexRoute.use('/students', studentRoute);

indexRoute.use('/tutors', tutorRoute);

indexRoute.use('/categories', categoryRoute);

indexRoute.use('/staffs', staffRoute);

indexRoute.use('/google-meet', googleMeetRoute);

indexRoute.use('/leave-notices', leaveNoticeRoute);

indexRoute.use('/payments', paymentRouter);

indexRoute.use('/files', fileRouter);

indexRoute.use('/notifications', notificationRouter);

indexRoute.use('/versions', versionRouter);

indexRoute.use('/schedules', scheduleRouter);

indexRoute.use('/flexible-lessons', flexibleLessonRoute);
