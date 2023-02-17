const express = require('express');
const fileRoute = express.Router();
const gcpBucket = require('../helper/gcpBucket');
const fileController = require('../controllers/file');

fileRoute.post('/upload-multi', gcpBucket.multer.array('files'), fileController.uploadMultiFile);

fileRoute.post('/upload', gcpBucket.multer.single('file'), gcpBucket.sendUploadToGCS, fileController.upload);

module.exports = fileRoute;






