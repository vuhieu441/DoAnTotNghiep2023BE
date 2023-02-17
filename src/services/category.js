const Category = require('../models/category');
const mongoose = require('mongoose');

const createCategory = async (category) => {
	const newCategory = new Category(category);
	return await newCategory.save();
};

const getAllCategory = async () => {
	return await Category.find({}, 'name');
};

const checkExist = () => {
	return {
		async byName(name) {
			const category = await Category.findOne({ name });
			return category ? true : false;
		},
		async byId(categoryId) {
			const category = await Category.findById(categoryId);
			return category ? true : false;
		},
		async byNameExpect(name, categoryId) {
			const category = await Category.findOne({
				_id: { $ne: mongoose.Types.ObjectId(categoryId) },
				name
			});
			return category ? true : false;
		},
	}
};

const updateCategoryById = async (categoryId, newCategory) => {
	return await Category.findByIdAndUpdate(categoryId, newCategory);
};

const deleteCategoryById = async (categoryId) => {
	return await Category.findByIdAndDelete(categoryId);
};

module.exports = {
	createCategory,
	getAllCategory,
	updateCategoryById,
	deleteCategoryById,
	checkExist,
};