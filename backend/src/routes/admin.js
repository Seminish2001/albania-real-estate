import express from 'express';
import { body, validationResult, query } from 'express-validator';
import { authenticate, authorize } from '../middleware/auth.js';
import { Property } from '../models/Property.js';
import pool from '../config/database.js';

const router = express.Router();

// Admin statistics
router.get('/stats', authenticate, authorize('admin'), async (req, res) => {
  try {
    const stats = await getPlatformStats();
    res.json({ 
      success: true, 
      data: stats 
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch statistics' 
    });
  }
});

// Property verification
router.post('/properties/:id/verify', 
  authenticate, 
  authorize('admin'), 
  async (req, res) => {
    try {
      const { id } = req.params;
      
      await Property.verify(id);
      
      res.json({ 
        success: true, 
        message: 'Property verified successfully' 
      });
    } catch (error) {
      console.error('Verify property error:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Verification failed' 
      });
    }
  }
);

// Property rejection
router.post('/properties/:id/reject', 
  authenticate, 
  authorize('admin'),
  [
    body('reason').notEmpty()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { id } = req.params;
      const { reason } = req.body;
      
      await Property.reject(id, reason);
      
      res.json({ 
        success: true, 
        message: 'Property rejected' 
      });
    } catch (error) {
      console.error('Reject property error:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Rejection failed' 
      });
    }
  }
);

// Get users with pagination and filters
router.get('/users', 
  authenticate, 
  authorize('admin'),
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('role').optional().isIn(['user', 'agent', 'admin']),
    query('verified').optional().isBoolean()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { page = 1, limit = 20, role, verified } = req.query;
      const users = await getUsersWithStats({ page, limit, role, verified });

      res.json({ 
        success: true, 
        data: users 
      });
    } catch (error) {
      console.error('Get users error:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to fetch users' 
      });
    }
  }
);

// Update user role
router.put('/users/:id/role', 
  authenticate, 
  authorize('admin'),
  [
    body('role').isIn(['user', 'agent', 'admin'])
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { id } = req.params;
      const { role } = req.body;

      await updateUserRole(id, role);
      
      res.json({ 
        success: true, 
        message: `User role updated to ${role}` 
      });
    } catch (error) {
      console.error('Update user role error:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to update user role' 
      });
    }
  }
);

// Get pending properties for verification
router.get('/properties/pending', 
  authenticate, 
  authorize('admin'),
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 50 })
  ],
  async (req, res) => {
    try {
      const { page = 1, limit = 20 } = req.query;
      const properties = await getPendingProperties(page, limit);

      res.json({ 
        success: true, 
        data: properties 
      });
    } catch (error) {
      console.error('Get pending properties error:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to fetch pending properties' 
      });
    }
  }
);

// Platform analytics
router.get('/analytics', 
  authenticate, 
  authorize('admin'), 
  async (req, res) => {
    try {
      const analytics = await getPlatformAnalytics();
      res.json({ 
        success: true, 
        data: analytics 
      });
    } catch (error) {
      console.error('Get analytics error:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to fetch analytics' 
      });
    }
  }
);

// Helper functions
async function getPlatformStats() {
  // Total users count
  const usersCount = await pool.query('SELECT COUNT(*) FROM users');
  const agentsCount = await pool.query('SELECT COUNT(*) FROM agents');
  const propertiesCount = await pool.query('SELECT COUNT(*) FROM properties WHERE status = $1', ['active']);
  const pendingVerification = await pool.query('SELECT COUNT(*) FROM properties WHERE is_verified = FALSE');
  
  // Recent activity
  const newUsers = await pool.query(
    'SELECT COUNT(*) FROM users WHERE created_at >= CURRENT_DATE - INTERVAL \'7 days\''
  );
  const newProperties = await pool.query(
    'SELECT COUNT(*) FROM properties WHERE created_at >= CURRENT_DATE - INTERVAL \'7 days\''
  );

  // Revenue stats (from Stripe)
  const premiumAgents = await pool.query('SELECT COUNT(*) FROM agents WHERE is_premium = TRUE');

  return {
    users: {
      total: parseInt(usersCount.rows[0].count),
      agents: parseInt(agentsCount.rows[0].count),
      newThisWeek: parseInt(newUsers.rows[0].count)
    },
    properties: {
      total: parseInt(propertiesCount.rows[0].count),
      pendingVerification: parseInt(pendingVerification.rows[0].count),
      newThisWeek: parseInt(newProperties.rows[0].count)
    },
    revenue: {
      premiumAgents: parseInt(premiumAgents.rows[0].count),
      estimatedMRR: parseInt(premiumAgents.rows[0].count) * 29.99 // Monthly revenue
    }
  };
}

async function getUsersWithStats({ page, limit, role, verified }) {
  const offset = (page - 1) * limit;
  let whereConditions = ['1=1'];
  let params = [];
  let paramCount = 0;

  if (role) {
    paramCount++;
    whereConditions.push(`role = $${paramCount}`);
    params.push(role);
  }

  if (verified !== undefined) {
    paramCount++;
    whereConditions.push(`email_verified = $${paramCount}`);
    params.push(verified);
  }

  const whereClause = whereConditions.join(' AND ');

  // Count query
  const countQuery = `SELECT COUNT(*) FROM users WHERE ${whereClause}`;
  const countResult = await pool.query(countQuery, params);
  const total = parseInt(countResult.rows[0].count);

  // Data query
  paramCount++;
  params.push(limit);
  paramCount++;
  params.push(offset);

  const dataQuery = `
    SELECT 
      id, email, name, role, avatar, phone, email_verified, 
      created_at, last_login
    FROM users 
    WHERE ${whereClause}
    ORDER BY created_at DESC
    LIMIT $${paramCount - 1} OFFSET $${paramCount}
  `;

  const dataResult = await pool.query(dataQuery, params);

  return {
    users: dataResult.rows,
    total,
    page: parseInt(page),
    totalPages: Math.ceil(total / limit)
  };
}

async function getPendingProperties(page, limit) {
  const offset = (page - 1) * limit;

  const countQuery = `
    SELECT COUNT(*) 
    FROM properties 
    WHERE is_verified = FALSE AND status = 'active'
  `;
  const countResult = await pool.query(countQuery);
  const total = parseInt(countResult.rows[0].count);

  const dataQuery = `
    SELECT 
      p.*,
      u.name as agent_name,
      u.email as agent_email,
      a.agency as agent_agency
    FROM properties p
    JOIN agents a ON p.agent_id = a.id
    JOIN users u ON a.user_id = u.id
    WHERE p.is_verified = FALSE AND p.status = 'active'
    ORDER BY p.created_at DESC
    LIMIT $1 OFFSET $2
  `;

  const dataResult = await pool.query(dataQuery, [limit, offset]);

  return {
    properties: dataResult.rows,
    total,
    page: parseInt(page),
    totalPages: Math.ceil(total / limit)
  };
}

async function getPlatformAnalytics() {
  // User growth over time
  const userGrowth = await pool.query(`
    SELECT 
      DATE(created_at) as date,
      COUNT(*) as count,
      SUM(COUNT(*)) OVER (ORDER BY DATE(created_at)) as cumulative
    FROM users 
    WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
    GROUP BY DATE(created_at)
    ORDER BY date
  `);

  // Property growth
  const propertyGrowth = await pool.query(`
    SELECT 
      DATE(created_at) as date,
      COUNT(*) as count,
      SUM(COUNT(*)) OVER (ORDER BY DATE(created_at)) as cumulative
    FROM properties 
    WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
    GROUP BY DATE(created_at)
    ORDER BY date
  `);

  // Popular cities
  const popularCities = await pool.query(`
    SELECT 
      city,
      COUNT(*) as property_count
    FROM properties 
    WHERE status = 'active'
    GROUP BY city 
    ORDER BY property_count DESC 
    LIMIT 10
  `);

  return {
    userGrowth: userGrowth.rows,
    propertyGrowth: propertyGrowth.rows,
    popularCities: popularCities.rows
  };
}

async function updateUserRole(userId, newRole) {
  const query = 'UPDATE users SET role = $1 WHERE id = $2';
  await pool.query(query, [newRole, userId]);

  // If changing to/from agent, update agents table
  if (newRole === 'agent') {
    // Check if agent record exists
    const existingAgent = await pool.query('SELECT 1 FROM agents WHERE user_id = $1', [userId]);
    if (existingAgent.rows.length === 0) {
      await pool.query(`
        INSERT INTO agents (user_id, experience, specialization, rating, review_count, properties_listed)
        VALUES ($1, 0, '{}', 0, 0, 0)
      `, [userId]);
    }
  }
}

export default router;
