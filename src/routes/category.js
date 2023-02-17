const express = require('express');
const categoryRoute = express.Router();

const categoryController = require('../controllers/category');

categoryRoute.post('/', categoryController.createCategory);

categoryRoute.get('/', categoryController.getAllCategory);

categoryRoute.put('/:categoryId', categoryController.updateCategoryById);

categoryRoute.delete('/:categoryId', categoryController.deleteCategoryById);

module.exports = categoryRoute;
