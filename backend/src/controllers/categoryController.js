const Category = require('../models/Category');

const buildCategoryResponse = (category) => ({
  id: category._id,
  name: category.name,
  slug: category.slug,
  iconUrl: category.iconUrl,
  description: category.description,
  sortOrder: category.sortOrder,
  isActive: category.isActive,
  parent: category.parent,
  createdAt: category.createdAt,
  updatedAt: category.updatedAt,
});

exports.getCategories = async (req, res) => {
  try {
    const includeInactive = String(req.query.includeInactive || '').toLowerCase() === 'true';
    const search = (req.query.search || '').trim();

    const filter = {};
    if (!includeInactive) {
      filter.isActive = true;
    }

    if (search) {
      filter.name = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    }

    const categories = await Category.find(filter).sort({ sortOrder: 1, name: 1 });

    res.status(200).json({
      success: true,
      data: {
        categories: categories.map((category) => buildCategoryResponse(category)),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch categories.',
    });
  }
};
