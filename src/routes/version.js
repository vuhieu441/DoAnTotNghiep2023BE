const express = require('express');
const versionRouter = express.Router();
const packageInfo = require('../../package.json');
const httpResponses = require('../utils/httpResponses')

versionRouter.get('/', (req, res) => {
  return res.status(httpResponses.HTTP_STATUS_OK).json({
    success: true,
    message: `${httpResponses.SUCCESS}`,
    data: `Version: ${packageInfo.version}`
  });
});

module.exports = versionRouter;
