import { Category, Product, AuditLog } from '../models/index.js';
import { AppError } from '../middleware/errorHandler.js';

export const getCategories = async (req, res, next) => {
  try {
    const categories = await Category.find({ isActive: true }).sort({ displayOrder: 1, name: 1 });

    // Aggregate active product counts per category
    const counts = await Product.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$categoryId', count: { $sum: 1 } } },
    ]);

    const countMap = counts.reduce((acc, curr) => {
      acc[curr._id.toString()] = curr.count;
      return acc;
    }, {});

    const enrichedCategories = categories.map((cat) => ({
      _id: cat._id,
      name: cat.name,
      slug: cat.slug,
      description: cat.description,
      icon: cat.icon,
      imageUrl: cat.imageUrl,
      displayOrder: cat.displayOrder,
      productCount: countMap[cat._id.toString()] || 0,
    }));

    res.status(200).json({
      success: true,
      categories: enrichedCategories,
    });
  } catch (error) {
    next(error);
  }
};

export const getCategoryBySlug = async (req, res, next) => {
  try {
    const { slug } = req.params;
    const category = await Category.findOne({ slug, isActive: true });
    if (!category) {
      return next(new AppError('Category not found.', 404));
    }

    const productCount = await Product.countDocuments({ categoryId: category._id, isActive: true });

    res.status(200).json({
      success: true,
      category: {
        ...category.toObject(),
        productCount,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const createCategory = async (req, res, next) => {
  try {
    const { name, description, icon, imageUrl, displayOrder } = req.body;

    const baseSlug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');

    const existing = await Category.findOne({ slug: baseSlug });
    if (existing) {
      return next(new AppError('A category with this name already exists.', 409));
    }

    const category = await Category.create({
      name,
      slug: baseSlug,
      description,
      icon: icon || 'Layers',
      imageUrl: imageUrl || '',
      displayOrder: displayOrder || 0,
    });

    await AuditLog.create({
      actorId: req.user._id,
      actorEmail: req.user.email,
      actorRole: req.user.role,
      action: 'ADMIN_CREATED_CATEGORY',
      targetResource: {
        resourceType: 'Category',
        resourceId: category._id.toString(),
      },
      details: { name: category.name, slug: category.slug },
    });

    res.status(201).json({
      success: true,
      message: 'Category created successfully.',
      category,
    });
  } catch (error) {
    next(error);
  }
};

export const updateCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, description, icon, imageUrl, displayOrder, isActive } = req.body;

    const category = await Category.findById(id);
    if (!category) {
      return next(new AppError('Category not found.', 404));
    }

    if (name) category.name = name;
    if (description !== undefined) category.description = description;
    if (icon) category.icon = icon;
    if (imageUrl !== undefined) category.imageUrl = imageUrl;
    if (displayOrder !== undefined) category.displayOrder = displayOrder;
    if (isActive !== undefined) category.isActive = isActive;

    await category.save();

    res.status(200).json({
      success: true,
      message: 'Category updated successfully.',
      category,
    });
  } catch (error) {
    next(error);
  }
};
