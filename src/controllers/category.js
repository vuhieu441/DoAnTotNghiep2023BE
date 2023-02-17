const logger = require('../utils/logger');
const httpResponses = require('../utils/httpResponses');

const categoryService = require('../services/category');
const FlexibleLessonService = require('../services/flexibleLesson');
const utilitys = require('../utils/utility');

//#region createCategory
/**
 * Create category
 * @param {*} req
 * @param {*} res
 * @returns
 */
const createCategory = async (req, res) => {
  try {
    const newModel = req.body;
    logger.info(`[createCategory] req -> ${JSON.stringify(req.body)}`);

    if (!newModel.name) {
      return res.status(httpResponses.HTTP_STATUS_BAD_REQUEST).json({
        success: false,
        message: `${httpResponses.CATEGORY_NAME_MISSING}`,
      });
    }

    const isExist = await categoryService.checkExist().byName(newModel.name);
    if (isExist) {
      logger.debug(`[createCategory]: getCategoryByName -> ${httpResponses.HTTP_STATUS_CONFLIC}`);
      return res.status(httpResponses.HTTP_STATUS_CONFLIC).json({
        success: false,
        message: `${httpResponses.CATEGORY_ALREADY_EXIST}`,
      });
    }

    await categoryService.createCategory(newModel);

    return res.status(httpResponses.HTTP_STATUS_CREATED).json({
      success: true,
      message: `${httpResponses.CATEGORY_CREATED_SUCCESSFULLY}`,
    });
  } catch (err) {
    logger.error(`[createCategory] error -> ${err.message}`);
    res.status(httpResponses.HTTP_STATUS_INTERNAL_ERROR).json({
      success: false,
      message: `${err.message}`,
    });
  }
};
//#endregion createCategory

//#region getAllCategory
/**
 * Get all category
 * @param {*} req
 * @param {*} res
 * @returns
 */
const getAllCategory = async (req, res) => {
  try {
    const categories = await categoryService.getAllCategory();

    return res.status(httpResponses.HTTP_STATUS_OK).json({
      success: true,
      message: `${httpResponses.SUCCESS}`,
      data: {
        categories,
      },
    });
  } catch (err) {
    logger.error(`[getAllCategory] error -> ${err.message}`);
    res.status(httpResponses.HTTP_STATUS_INTERNAL_ERROR).json({
      success: false,
      message: `${err.message}`,
    });
  }
};
//#endregion getAllCategory

//#region updateCategoryById
/**
 * Update all category
 * @param {*} req
 * @param {*} res
 * @returns
 */
const updateCategoryById = async (req, res) => {
  try {
    const { categoryId } = req.params;
    const newModel = req.body;
    logger.debug(`[updateCategoryById] categoryId -> ${categoryId}`);

    if (!newModel.name) {
      return res.status(httpResponses.HTTP_STATUS_BAD_REQUEST).json({
        success: false,
        message: `${httpResponses.CATEGORY_NAME_MISSING}`,
      });
    }

    const category = await categoryService.checkExist().byNameExpect(newModel.name, categoryId);
    if (category) {
      logger.debug(`[createCategory]: getCategoryByName -> ${httpResponses.HTTP_STATUS_CONFLIC}`);
      return res.status(httpResponses.HTTP_STATUS_CONFLIC).json({
        success: false,
        message: `${httpResponses.CATEGORY_ALREADY_EXIST}`,
      });
    }

    const isExist = await categoryService.checkExist().byId(categoryId);
    if (!isExist) {
      logger.debug(`[${functionName}]: getCategoryById -> ${httpResponses.HTTP_STATUS_NOT_FOUND}`);
      return res.status(httpResponses.HTTP_STATUS_NOT_FOUND).json({
        success: false,
        message: `${httpResponses.CATEGORY_NOT_FOUND}`,
      });
    }

    await categoryService.updateCategoryById(categoryId, newModel);

    return res.status(httpResponses.HTTP_STATUS_OK).json({
      success: true,
      message: `${httpResponses.CATEGORY_UPDATED_SUCCESSFULLY}`,
    });
  } catch (err) {
    logger.error(`[updateCategoryById] error -> ${err.message}`);
    res.status(httpResponses.HTTP_STATUS_INTERNAL_ERROR).json({
      success: false,
      message: `${err.message}`,
    });
  }
};
//#endregion updateCategoryById

//#region deleteCategoryById
/**
 * Get all category
 * @param {*} req
 * @param {*} res
 * @returns
 */
const deleteCategoryById = async (req, res) => {
  try {
    const { categoryId } = req.params;
    logger.debug(`[deleteCategoryById] categoryId -> ${categoryId}`);

    const isExist = await categoryService.checkExist().byId(categoryId);
    if (!isExist) {
      logger.debug(`deleteCategoryById ${httpResponses.HTTP_STATUS_NOT_FOUND}`);
      return res.status(httpResponses.HTTP_STATUS_NOT_FOUND).json({
        success: false,
        message: `${httpResponses.CATEGORY_NOT_FOUND}`,
      });
    }
    const flexiblesLessons = await FlexibleLessonService.getAllFilter({ category: categoryId });

    if (flexiblesLessons.length > 0) {
      logger.debug(`deleteCategoryById: ${httpResponses.CATEGORY_STILL_HAS_FLEXIBLE_LESSON}`);
      return res.badRequest(httpResponses.CATEGORY_STILL_HAS_FLEXIBLE_LESSON);
    }

    await categoryService.deleteCategoryById(categoryId);

    return res.status(httpResponses.HTTP_STATUS_OK).json({
      success: true,
      message: `${httpResponses.CATEGORY_DELETED_SUCCESSFULLY}`,
    });
  } catch (err) {
    logger.error(`[deleteCategoryById] error -> ${err.message}`);
    res.status(httpResponses.HTTP_STATUS_INTERNAL_ERROR).json({
      success: false,
      message: `${err.message}`,
    });
  }
};
//#endregion deleteCategoryById

module.exports = {
  createCategory,
  getAllCategory,
  updateCategoryById,
  deleteCategoryById,
};
