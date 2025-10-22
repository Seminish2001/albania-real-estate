import express from 'express';
import { query } from 'express-validator';
import { Property } from '../models/Property.js';
import { Agent } from '../models/Agent.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { uploadToCloudinary } from '../utils/cloudinary.js';
import { cacheMiddleware, invalidateCache, CACHE_PATTERNS } from '../middleware/cache.js';
import { redisCache } from '../config/redis.js';
import {
  catchAsync,
  AuthorizationError,
  NotFoundError,
  ValidationError
} from '../middleware/errorHandler.js';
import {
  validatePagination,
  validatePropertyCreation,
  validateRequest,
  validateCoordinates,
  validateObjectId
} from '../utils/validation.js';

const router = express.Router();

const propertyQueryValidation = [
  ...validatePagination,
  query('type').optional().isIn(['sale', 'rent']).withMessage('Type must be sale or rent'),
  query('category')
    .optional()
    .isIn(['residential', 'commercial', 'land'])
    .withMessage('Category must be residential, commercial, or land'),
  query('city').optional().isString().trim().isLength({ max: 100 }),
  query('minPrice').optional().isFloat({ min: 0 }).withMessage('Minimum price must be positive'),
  query('maxPrice').optional().isFloat({ min: 0 }).withMessage('Maximum price must be positive'),
  query('minBedrooms').optional().isInt({ min: 0 }).withMessage('Minimum bedrooms must be positive'),
  query('maxBedrooms').optional().isInt({ min: 0 }).withMessage('Maximum bedrooms must be positive'),
  query('minArea').optional().isFloat({ min: 0 }).withMessage('Minimum area must be positive'),
  query('maxArea').optional().isFloat({ min: 0 }).withMessage('Maximum area must be positive'),
  query('features').optional().isString(),
  query('q').optional().isString()
];

// Get all properties with search and filters (Cached)
router.get(
  '/',
  cacheMiddleware(600),
  ...propertyQueryValidation,
  validateRequest,
  catchAsync(async (req, res) => {
    const {
      page = 1,
      limit = 12,
      type,
      category,
      city,
      minPrice,
      maxPrice,
      minBedrooms,
      maxBedrooms,
      minArea,
      maxArea,
      features,
      q
    } = req.query;

    const filters = {
      type,
      category,
      city,
      minPrice: minPrice !== undefined ? parseFloat(minPrice) : undefined,
      maxPrice: maxPrice !== undefined ? parseFloat(maxPrice) : undefined,
      minBedrooms: minBedrooms !== undefined ? parseInt(minBedrooms, 10) : undefined,
      maxBedrooms: maxBedrooms !== undefined ? parseInt(maxBedrooms, 10) : undefined,
      minArea: minArea !== undefined ? parseFloat(minArea) : undefined,
      maxArea: maxArea !== undefined ? parseFloat(maxArea) : undefined,
      features: features ? features.split(',') : undefined,
      search: q ? q.trim() : undefined
    };

    const result = await Property.search(filters, parseInt(page, 10), parseInt(limit, 10));

    res.json({
      success: true,
      data: result
    });
  })
);

// Get featured properties (Cached)
router.get(
  '/featured',
  cacheMiddleware(900),
  catchAsync(async (req, res) => {
    const featuredProperties = await Property.getFeatured();

    res.json({
      success: true,
      data: { properties: featuredProperties }
    });
  })
);

// Get properties by agent
router.get(
  '/agent/:agentId',
  validateObjectId('agentId'),
  ...validatePagination,
  validateRequest,
  catchAsync(async (req, res) => {
    const { agentId } = req.params;
    const { page = 1, limit = 12 } = req.query;

    const properties = await Property.getByAgent(agentId, parseInt(page, 10), parseInt(limit, 10));

    res.json({
      success: true,
      data: properties
    });
  })
);

// Get user favorites
router.get(
  '/favorites/mine',
  authenticate,
  ...validatePagination,
  validateRequest,
  catchAsync(async (req, res) => {
    const userId = req.user.id;
    const { page = 1, limit = 12 } = req.query;

    const favorites = await Property.getFavorites(userId, parseInt(page, 10), parseInt(limit, 10));

    res.json({
      success: true,
      data: favorites
    });
  })
);

// Get single property with caching and view tracking
router.get(
  '/:id',
  validateObjectId(),
  validateRequest,
  catchAsync(async (req, res) => {
    const { id } = req.params;
    const cacheKey = `cache:/api/properties/${id}`;
    const cacheEnabled = redisCache.isEnabled();

    if (cacheEnabled) {
      const cached = await redisCache.get(cacheKey);
      if (cached) {
        await Property.incrementViews(id);

        const cachedProperty = cached?.data?.property;
        if (cachedProperty) {
          const updatedProperty = {
            ...cachedProperty,
            views: (cachedProperty.views ?? 0) + 1
          };

          const updatedResponse = {
            ...cached,
            data: {
              ...cached.data,
              property: updatedProperty
            }
          };

          await redisCache.set(cacheKey, updatedResponse, 300);
          return res.json(updatedResponse);
        }

        return res.json(cached);
      }
    }

    const property = await Property.findById(id);
    if (!property) {
      throw new NotFoundError('Property');
    }

    await Property.incrementViews(id);

    const responsePayload = {
      success: true,
      data: {
        property: {
          ...property,
          views: (property.views ?? 0) + 1
        }
      }
    };

    if (cacheEnabled) {
      await redisCache.set(cacheKey, responsePayload, 300);
    }

    res.json(responsePayload);
  })
);

// Create property
router.post(
  '/',
  authenticate,
  authorize('agent', 'admin'),
  ...validatePropertyCreation,
  validateRequest,
  catchAsync(async (req, res) => {
    const agent = await Agent.findByUserId(req.user.id);
    if (!agent) {
      throw new AuthorizationError('Agent profile not found');
    }

    validateCoordinates(req.body.latitude, req.body.longitude);

    const propertyData = {
      ...req.body,
      agentId: agent.id,
      images: req.body.images || []
    };

    const property = await Property.create(propertyData);

    await Agent.incrementPropertiesListed(agent.id);

    await invalidateCache([
      CACHE_PATTERNS.PROPERTIES,
      CACHE_PATTERNS.FEATURED,
      `cache:/api/agents/${agent.id}/properties*`
    ]);

    res.status(201).json({
      success: true,
      data: { property },
      message: 'Property created successfully'
    });
  })
);

// Update property
router.put(
  '/:id',
  authenticate,
  authorize('agent', 'admin'),
  validateObjectId(),
  validateRequest,
  catchAsync(async (req, res) => {
    const { id } = req.params;

    const property = await Property.findById(id);
    if (!property) {
      throw new NotFoundError('Property');
    }

    const agent = await Agent.findByUserId(req.user.id);
    if (!agent && req.user.role !== 'admin') {
      throw new AuthorizationError('Agent profile not found');
    }

    if (req.user.role !== 'admin' && property.agentId !== agent.id) {
      throw new AuthorizationError('Not authorized to update this property');
    }

    if ((req.body.latitude !== undefined) !== (req.body.longitude !== undefined)) {
      throw new ValidationError('Latitude and longitude must be provided together');
    }

    if (req.body.latitude !== undefined && req.body.longitude !== undefined) {
      validateCoordinates(Number(req.body.latitude), Number(req.body.longitude));
    }

    const updatedProperty = await Property.update(id, req.body);

    await invalidateCache([
      CACHE_PATTERNS.PROPERTIES,
      CACHE_PATTERNS.PROPERTY_DETAILS,
      CACHE_PATTERNS.FEATURED,
      `cache:/api/properties/${id}`,
      `cache:/api/agents/${property.agentId || agent?.id}/properties*`
    ]);

    res.json({
      success: true,
      data: { property: updatedProperty },
      message: 'Property updated successfully'
    });
  })
);

// Delete property
router.delete(
  '/:id',
  authenticate,
  authorize('agent', 'admin'),
  validateObjectId(),
  validateRequest,
  catchAsync(async (req, res) => {
    const { id } = req.params;

    const property = await Property.findById(id);
    if (!property) {
      throw new NotFoundError('Property');
    }

    const agent = await Agent.findByUserId(req.user.id);
    if (!agent && req.user.role !== 'admin') {
      throw new AuthorizationError('Agent profile not found');
    }

    if (req.user.role !== 'admin' && property.agentId !== agent.id) {
      throw new AuthorizationError('Not authorized to delete this property');
    }

    await Property.delete(id);

    await invalidateCache([
      CACHE_PATTERNS.PROPERTIES,
      CACHE_PATTERNS.PROPERTY_DETAILS,
      CACHE_PATTERNS.FEATURED,
      `cache:/api/properties/${id}`,
      `cache:/api/agents/${property.agentId || agent?.id}/properties*`
    ]);

    res.json({
      success: true,
      message: 'Property deleted successfully'
    });
  })
);

// Upload property images
router.post(
  '/:id/images',
  authenticate,
  authorize('agent', 'admin'),
  validateObjectId(),
  validateRequest,
  catchAsync(async (req, res) => {
    const { id } = req.params;
    const { images } = req.body;

    if (!images || !Array.isArray(images)) {
      throw new ValidationError('Images array is required');
    }

    const property = await Property.findById(id);
    if (!property) {
      throw new NotFoundError('Property');
    }

    const agent = await Agent.findByUserId(req.user.id);
    if (!agent && req.user.role !== 'admin') {
      throw new AuthorizationError('Agent profile not found');
    }

    if (req.user.role !== 'admin' && property.agentId !== agent.id) {
      throw new AuthorizationError('Not authorized to update this property');
    }

    const uploadedImages = [];
    for (const image of images) {
      if (typeof image === 'string' && image.startsWith('data:')) {
        const uploadResult = await uploadToCloudinary(image);
        uploadedImages.push(uploadResult.secure_url);
      } else {
        uploadedImages.push(image);
      }
    }

    const updatedProperty = await Property.update(id, {
      images: [...(property.images || []), ...uploadedImages]
    });

    await invalidateCache([
      CACHE_PATTERNS.PROPERTY_DETAILS,
      CACHE_PATTERNS.PROPERTIES,
      `cache:/api/properties/${id}`
    ]);

    res.json({
      success: true,
      data: { property: updatedProperty },
      message: 'Images uploaded successfully'
    });
  })
);

// Toggle property favorite
router.post(
  '/:id/favorite',
  authenticate,
  validateObjectId(),
  validateRequest,
  catchAsync(async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;

    const isFavorited = await Property.toggleFavorite(userId, id);

    res.json({
      success: true,
      data: { isFavorited },
      message: isFavorited ? 'Property added to favorites' : 'Property removed from favorites'
    });
  })
);

export default router;
