import express from 'express';
import { body, validationResult, query } from 'express-validator';
import { Property } from '../models/Property.js';
import { Agent } from '../models/Agent.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { uploadToCloudinary } from '../utils/cloudinary.js';

const router = express.Router();

// Get all properties with search and filters
router.get('/', [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('type').optional().isIn(['sale', 'rent']),
  query('category').optional().isIn(['residential', 'commercial', 'land']),
  query('city').optional().isString(),
  query('minPrice').optional().isFloat({ min: 0 }),
  query('maxPrice').optional().isFloat({ min: 0 }),
  query('minBedrooms').optional().isInt({ min: 0 }),
  query('maxBedrooms').optional().isInt({ min: 0 }),
  query('minArea').optional().isFloat({ min: 0 }),
  query('maxArea').optional().isFloat({ min: 0 }),
  query('features').optional().isString(),
  query('q').optional().isString()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

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

  } catch (error) {
    console.error('Get properties error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Get featured properties
router.get('/featured', async (req, res) => {
  try {
    const featuredProperties = await Property.getFeatured();

    res.json({
      success: true,
      data: { properties: featuredProperties }
    });

  } catch (error) {
    console.error('Get featured properties error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Get properties by agent
router.get('/agent/:agentId', async (req, res) => {
  try {
    const { agentId } = req.params;
    const { page = 1, limit = 12 } = req.query;

    const properties = await Property.getByAgent(agentId, parseInt(page, 10), parseInt(limit, 10));

    res.json({
      success: true,
      data: properties
    });

  } catch (error) {
    console.error('Get agent properties error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Get user favorites
router.get('/favorites/mine', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 12 } = req.query;

    const favorites = await Property.getFavorites(userId, parseInt(page, 10), parseInt(limit, 10));

    res.json({
      success: true,
      data: favorites
    });

  } catch (error) {
    console.error('Get favorites error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Get single property
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const property = await Property.findById(id);
    if (!property) {
      return res.status(404).json({
        success: false,
        error: 'Property not found'
      });
    }

    await Property.incrementViews(id);

    res.json({
      success: true,
      data: { property }
    });

  } catch (error) {
    console.error('Get property error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Create property validation
const createPropertyValidation = [
  body('title').notEmpty().isLength({ max: 500 }),
  body('description').notEmpty(),
  body('type').isIn(['sale', 'rent']),
  body('category').isIn(['residential', 'commercial', 'land']),
  body('price').isFloat({ min: 0 }),
  body('currency').optional().isIn(['ALL', 'EUR']),
  body('city').notEmpty(),
  body('municipality').notEmpty(),
  body('address').notEmpty(),
  body('latitude').isFloat({ min: -90, max: 90 }),
  body('longitude').isFloat({ min: -180, max: 180 }),
  body('bedrooms').optional().isInt({ min: 0 }),
  body('bathrooms').optional().isInt({ min: 0 }),
  body('area').isFloat({ min: 0 }),
  body('floor').optional().isInt({ min: 0 }),
  body('totalFloors').optional().isInt({ min: 0 }),
  body('yearBuilt').optional().isInt({ min: 1800, max: new Date().getFullYear() }),
  body('features').optional().isArray()
];

// Create property
router.post('/', authenticate, authorize('agent', 'admin'), createPropertyValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const agent = await Agent.findByUserId(req.user.id);
    if (!agent) {
      return res.status(403).json({
        success: false,
        error: 'Agent profile not found'
      });
    }

    const propertyData = {
      ...req.body,
      agentId: agent.id,
      images: req.body.images || []
    };

    const property = await Property.create(propertyData);

    await Agent.incrementPropertiesListed(agent.id);

    res.status(201).json({
      success: true,
      data: { property },
      message: 'Property created successfully'
    });

  } catch (error) {
    console.error('Create property error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Update property
router.put('/:id', authenticate, authorize('agent', 'admin'), async (req, res) => {
  try {
    const { id } = req.params;

    const property = await Property.findById(id);
    if (!property) {
      return res.status(404).json({
        success: false,
        error: 'Property not found'
      });
    }

    const agent = await Agent.findByUserId(req.user.id);
    if (!agent && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Agent profile not found'
      });
    }

    if (req.user.role !== 'admin' && property.agentId !== agent.id) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to update this property'
      });
    }

    const updatedProperty = await Property.update(id, req.body);

    res.json({
      success: true,
      data: { property: updatedProperty },
      message: 'Property updated successfully'
    });

  } catch (error) {
    console.error('Update property error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Delete property
router.delete('/:id', authenticate, authorize('agent', 'admin'), async (req, res) => {
  try {
    const { id } = req.params;

    const property = await Property.findById(id);
    if (!property) {
      return res.status(404).json({
        success: false,
        error: 'Property not found'
      });
    }

    const agent = await Agent.findByUserId(req.user.id);
    if (!agent && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Agent profile not found'
      });
    }

    if (req.user.role !== 'admin' && property.agentId !== agent.id) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to delete this property'
      });
    }

    await Property.delete(id);

    res.json({
      success: true,
      message: 'Property deleted successfully'
    });

  } catch (error) {
    console.error('Delete property error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Upload property images
router.post('/:id/images', authenticate, authorize('agent', 'admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { images } = req.body;

    if (!images || !Array.isArray(images)) {
      return res.status(400).json({
        success: false,
        error: 'Images array is required'
      });
    }

    const property = await Property.findById(id);
    if (!property) {
      return res.status(404).json({
        success: false,
        error: 'Property not found'
      });
    }

    const agent = await Agent.findByUserId(req.user.id);
    if (!agent && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Agent profile not found'
      });
    }

    if (req.user.role !== 'admin' && property.agentId !== agent.id) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to update this property'
      });
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

    res.json({
      success: true,
      data: { property: updatedProperty },
      message: 'Images uploaded successfully'
    });

  } catch (error) {
    console.error('Upload images error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Toggle property favorite
router.post('/:id/favorite', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const isFavorited = await Property.toggleFavorite(userId, id);

    res.json({
      success: true,
      data: { isFavorited },
      message: isFavorited ? 'Property added to favorites' : 'Property removed from favorites'
    });

  } catch (error) {
    console.error('Toggle favorite error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

export default router;
