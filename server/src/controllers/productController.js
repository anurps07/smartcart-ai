import { Product, Category, Vendor, AuditLog } from '../models/index.js';
import { AppError } from '../middleware/errorHandler.js';
import { getFileUrl } from '../services/storageService.js';

export const getProducts = async (req, res, next) => {
  try {
    const {
      search,
      category,
      vendor,
      minPrice,
      maxPrice,
      rating,
      inStock,
      sort = 'newest',
      page = 1,
      limit = 12,
    } = req.query;

    const query = { isActive: true };

    // Text search or keyword match
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } },
      ];
    }

    // Category filter by ID or slug
    if (category) {
      if (category.match(/^[0-9a-fA-F]{24}$/)) {
        query.categoryId = category;
      } else {
        const catDoc = await Category.findOne({ slug: category });
        if (catDoc) query.categoryId = catDoc._id;
      }
    }

    // Vendor filter by ID or slug
    if (vendor) {
      if (vendor.match(/^[0-9a-fA-F]{24}$/)) {
        query.vendorId = vendor;
      } else {
        const vendorDoc = await Vendor.findOne({ slug: vendor });
        if (vendorDoc) query.vendorId = vendorDoc._id;
      }
    }

    // Price range filters (stored safely in integer paise)
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = parseInt(minPrice, 10);
      if (maxPrice) query.price.$lte = parseInt(maxPrice, 10);
    }

    // Rating filter
    if (rating) {
      query.averageRating = { $gte: parseFloat(rating) };
    }

    // Stock availability filter
    if (inStock === 'true' || inStock === true) {
      query.stock = { $gt: 0 };
    }

    // Sorting strategies
    let sortOption = { createdAt: -1 };
    if (sort === 'price-asc') sortOption = { price: 1 };
    else if (sort === 'price-desc') sortOption = { price: -1 };
    else if (sort === 'rating') sortOption = { averageRating: -1, totalReviews: -1 };
    else if (sort === 'popular') sortOption = { totalReviews: -1, averageRating: -1 };

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    const total = await Product.countDocuments(query);
    const products = await Product.find(query)
      .populate('categoryId', 'name slug icon')
      .populate('vendorId', 'storeName slug logoUrl')
      .sort(sortOption)
      .skip(skip)
      .limit(limitNum);

    res.status(200).json({
      success: true,
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum),
      count: products.length,
      products,
    });
  } catch (error) {
    next(error);
  }
};

export const getProductBySlug = async (req, res, next) => {
  try {
    const { slug } = req.params;
    const product = await Product.findOne({ slug, isActive: true })
      .populate('categoryId', 'name slug icon')
      .populate('vendorId', 'storeName slug description logoUrl bannerUrl');

    if (!product) {
      return next(new AppError('Product not found or is currently unavailable.', 404));
    }

    // Find related products in same category
    const relatedProducts = await Product.find({
      categoryId: product.categoryId._id,
      _id: { $ne: product._id },
      isActive: true,
    })
      .select('name slug price originalPrice images averageRating totalReviews')
      .limit(4);

    res.status(200).json({
      success: true,
      product,
      relatedProducts,
    });
  } catch (error) {
    next(error);
  }
};

export const createProduct = async (req, res, next) => {
  try {
    const {
      name,
      categoryId,
      description,
      price,
      originalPrice,
      stock,
      images,
      specifications,
      tags,
      isFeatured,
    } = req.body;

    const vendorId = req.vendor._id;

    // Verify category exists
    const category = await Category.findById(categoryId);
    if (!category) {
      return next(new AppError('Category not found.', 404));
    }

    // Generate unique slug
    const baseSlug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');
    const slug = `${baseSlug}-${Date.now().toString().slice(-5)}`;

    const product = await Product.create({
      vendorId,
      categoryId,
      name,
      slug,
      description,
      price,
      originalPrice: originalPrice || null,
      stock,
      images,
      specifications: specifications || [],
      tags: tags || [],
      isFeatured: isFeatured || false,
      isActive: true,
    });

    await AuditLog.create({
      actorId: req.user._id,
      actorEmail: req.user.email,
      actorRole: req.user.role,
      action: 'VENDOR_CREATED_PRODUCT',
      targetResource: {
        resourceType: 'Product',
        resourceId: product._id.toString(),
      },
      details: { name: product.name, price: product.price, stock: product.stock },
    });

    res.status(201).json({
      success: true,
      message: 'Product created successfully.',
      product,
    });
  } catch (error) {
    next(error);
  }
};

export const updateProduct = async (req, res, next) => {
  try {
    const { id } = req.params;
    const product = await Product.findById(id);

    if (!product) {
      return next(new AppError('Product not found.', 404));
    }

    // Strict resource ownership check: only owning vendor (or admin) can update!
    if (!product.vendorId.equals(req.vendor._id) && req.user.role !== 'admin') {
      return next(new AppError('Access forbidden: You do not own this product.', 403));
    }

    const {
      name,
      categoryId,
      description,
      price,
      originalPrice,
      stock,
      images,
      specifications,
      tags,
      isActive,
      isFeatured,
    } = req.body;

    if (name) product.name = name;
    if (categoryId) product.categoryId = categoryId;
    if (description) product.description = description;
    if (price !== undefined) product.price = price;
    if (originalPrice !== undefined) product.originalPrice = originalPrice;
    if (stock !== undefined) product.stock = stock;
    if (images) product.images = images;
    if (specifications) product.specifications = specifications;
    if (tags) product.tags = tags;
    if (isActive !== undefined) product.isActive = isActive;
    if (isFeatured !== undefined) product.isFeatured = isFeatured;

    await product.save();

    res.status(200).json({
      success: true,
      message: 'Product updated successfully.',
      product,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteProduct = async (req, res, next) => {
  try {
    const { id } = req.params;
    const product = await Product.findById(id);

    if (!product) {
      return next(new AppError('Product not found.', 404));
    }

    // Strict resource ownership check
    if (!product.vendorId.equals(req.vendor._id) && req.user.role !== 'admin') {
      return next(new AppError('Access forbidden: You do not own this product.', 403));
    }

    // Soft delete: deactivate product
    product.isActive = false;
    await product.save();

    res.status(200).json({
      success: true,
      message: 'Product deactivated successfully.',
    });
  } catch (error) {
    next(error);
  }
};

export const getMyProducts = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search } = req.query;
    const query = { vendorId: req.vendor._id };

    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const total = await Product.countDocuments(query);
    const products = await Product.find(query)
      .populate('categoryId', 'name slug')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit, 10));

    res.status(200).json({
      success: true,
      total,
      page: parseInt(page, 10),
      pages: Math.ceil(total / parseInt(limit, 10)),
      products,
    });
  } catch (error) {
    next(error);
  }
};

export const uploadProductImage = (req, res, next) => {
  try {
    if (!req.file) {
      return next(new AppError('Please select an image file to upload.', 400));
    }

    const fileUrl = getFileUrl(req, req.file.filename);

    res.status(200).json({
      success: true,
      message: 'Image uploaded successfully.',
      url: fileUrl,
      filename: req.file.filename,
    });
  } catch (error) {
    next(error);
  }
};
