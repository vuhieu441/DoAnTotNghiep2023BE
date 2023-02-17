const logger = require('../utils/logger');
const httpResponses = require('../utils/httpResponses');
const gcpBucket = require('../helper/gcpBucket');

//#region uploadMultiFile
/**
 * Upload Multi File
 * @param {*} req
 * @param {*} res
 * @returns
 */
const uploadMultiFile = async (req, res) => {
  try {
    const files = req.files;
    logger.info(`[uploadMultiFile]: start`);

    const fileUploadeds = await fileHelpers.sendUploadMultiImgToGCS(files);

    return res.status(httpResponses.HTTP_STATUS_OK).json({
      success: true,
      message: httpResponses.UPLOAD_FILE_SUCCESSFULLY,
      data: {
        links: fileUploadeds,
      },
    });
  } catch (err) {
    logger.error(`[getAllTutors] error -> ${err.message}`);
    res.status(httpResponses.HTTP_STATUS_INTERNAL_ERROR).json({
      success: false,
      message: `${err.message}`,
    });
  }
};
//#endregion uploadMultiFile

//#region upload
/**
 * Upload Single File
 * @param {*} req
 * @param {*} res
 * @returns
 */
const upload = async (req, res) => {
  try {
    //TODO Handle
    return res.ok('Coming Soon');
  } catch (err) {
    logger.error(`[getAllTutors] error -> ${err.message}`);
    res.status(httpResponses.HTTP_STATUS_INTERNAL_ERROR).json({
      success: false,
      message: `${err.message}`,
    });
  }
};
//#endregion upload

module.exports = {
  uploadMultiFile,
  upload,
};
