const express = require('express');
const { requireLogin } = require('../middleware/permission');
const googleMeetRoute = express.Router();
const googleMeetController = require('../controllers/googleMeet');

googleMeetRoute.get('/request', requireLogin, googleMeetController.googleMeetRequest);

googleMeetRoute.get('/callback', googleMeetController.saveGoogleMeetCallback);

googleMeetRoute.get('/link', requireLogin, googleMeetController.generateGoogleMeetUrl);

module.exports = googleMeetRoute;
