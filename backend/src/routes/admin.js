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
      
      // Use the Property model method
      const property = await Property.verify(id);
      
      if (!property) {
        return res.status(404).json({
          success: false,
          error: 'Property not found'
        });
      }
      
      res.json({ 
        success: true, 
        data: { property },
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
    body('reason').notEmpty().withMessage('Rejection reason is required')
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
      
      // Use the Property model method
      const property = await Property.reject(id, reason);
      
      if (!property) {
        return res.status(404).json({
          success: false,
          error: 'Property not found'
        });
      }
      
      res.json({ 
        success: true, 
        data: { property },
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
    body('role').isIn(['user', 'agent', 'admin']).withMessage('Invalid role')
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

      const updatedUser = await updateUserRole(id, role);
      
      if (!updatedUser) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }
      
      res.json({ 
        success: true, 
        data: { user: updatedUser },
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
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array()
        });
      }

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

// Suspend user account
router.post('/users/:id/suspend',
  authenticate,
  authorize('admin'),
  [
    body('reason').optional().isString(),
    body('duration').optional().isInt({ min: 1, max: 365 }) // days
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
      const { reason, duration = 7 } = req.body;

      const suspendedUser = await suspendUser(id, reason, duration);
      if (!suspendedUser) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }
      
      res.json({
        success: true,
        data: { user: suspendedUser },
        message: `User suspended for ${duration} days`
      });
    } catch (error) {
      console.error('Suspend user error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to suspend user'
      });
    }
  }
);

// Unsuspend user account
router.post('/users/:id/unsuspend',
  authenticate,
  authorize('admin'),
  async (req, res) => {
    try {
      const { id } = req.params;
      const unsuspendedUser = await unsuspendUser(id);
      if (!unsuspendedUser) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }
      
      res.json({
        success: true,
        data: { user: unsuspendedUser },
        message: 'User account unsuspended'
      });
    } catch (error) {
      console.error('Unsuspend user error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to unsuspend user'
      });
    }
  }
);

// Get system logs
router.get('/logs',
  authenticate,
  authorize('admin'),
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('type').optional().isIn(['error', 'warning', 'info', 'security']),
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601()
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

      const { page = 1, limit = 50, type, startDate, endDate } = req.query;
      const logs = await getSystemLogs({ page, limit, type, startDate, endDate });

      res.json({
        success: true,
        data: logs
      });
    } catch (error) {
      console.error('Get logs error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch system logs'
      });
    }
  }
);

// Helper functions
async function getPlatformStats() {
  try {
    // Total users count
    const usersCount = await pool.query('SELECT COUNT(*) FROM users');
    const agentsCount = await pool.query('SELECT COUNT(*) FROM agents');
    const propertiesCount = await pool.query('SELECT COUNT(*) FROM properties WHERE status = $1', ['active']);
    const pendingVerification = await pool.query('SELECT COUNT(*) FROM properties WHERE is_verified = FALSE AND status = $1', ['active']);
    
    // Recent activity
    const newUsers = await pool.query(
      "SELECT COUNT(*) FROM users WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'"
    );
    const newProperties = await pool.query(
      "SELECT COUNT(*) FROM properties WHERE created_at >= CURRENT_DATE - INTERVAL '7 days' AND status = $1", ['active']
    );

    // Revenue stats
    const premiumAgents = await pool.query('SELECT COUNT(*) FROM agents WHERE is_premium = TRUE');
    
    // Suspended users
    const suspendedUsers = await pool.query('SELECT COUNT(*) FROM users WHERE suspended_until > CURRENT_TIMESTAMP');

    return {
      users: {
        total: parseInt(usersCount.rows[0].count),
        agents: parseInt(agentsCount.rows[0].count),
        newThisWeek: parseInt(newUsers.rows[0].count),
        suspended: parseInt(suspendedUsers.rows[0].count)
      },
      properties: {
        total: parseInt(propertiesCount.rows[0].count),
        pendingVerification: parseInt(pendingVerification.rows[0].count),
        newThisWeek: parseInt(newProperties.rows[0].count)
      },
      revenue: {
        premiumAgents: parseInt(premiumAgents.rows[0].count),
        estimatedMRR: parseInt(premiumAgents.rows[0].count) * 29.99
      },
      platform: {
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        nodeVersion: process.version
      }
    };
  } catch (error) {
    console.error('Error getting platform stats:', error);
    throw error;
  }
}

async function getUsersWithStats({ page, limit, role, verified }) {
  const pageNumber = Number(page) || 1;
  const limitNumber = Number(limit) || 20;
  const verifiedFilter =
    typeof verified === 'string' ? verified.toLowerCase() === 'true' : verified;

  const offset = (pageNumber - 1) * limitNumber;
  let whereConditions = ['1=1'];
  let params = [];
  let paramCount = 0;

  if (role) {
    paramCount++;
    whereConditions.push(`role = $${paramCount}`);
    params.push(role);
  }

  if (verifiedFilter !== undefined) {
    paramCount++;
    whereConditions.push(`email_verified = $${paramCount}`);
    params.push(verifiedFilter);
  }

  const whereClause = whereConditions.join(' AND ');

  // Count query
  const countQuery = `SELECT COUNT(*) FROM users WHERE ${whereClause}`;
  const countResult = await pool.query(countQuery, params);
  const total = parseInt(countResult.rows[0].count);

  // Data query
  paramCount++;
  params.push(limitNumber);
  paramCount++;
  params.push(offset);

  const dataQuery = `
    SELECT 
      id, email, name, role, avatar, phone, email_verified, 
      created_at, last_login, suspended_until,
      (suspended_until > CURRENT_TIMESTAMP) as is_suspended
    FROM users 
    WHERE ${whereClause}
    ORDER BY created_at DESC
    LIMIT $${paramCount - 1} OFFSET $${paramCount}
  `;

  const dataResult = await pool.query(dataQuery, params);

  return {
    users: dataResult.rows,
    total,
    page: pageNumber,
    totalPages: Math.ceil(total / limitNumber)
  };
}

async function getPendingProperties(page, limit) {
  const pageNumber = Number(page) || 1;
  const limitNumber = Number(limit) || 20;
  const offset = (pageNumber - 1) * limitNumber;

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
      u.phone as agent_phone,
      a.agency as agent_agency,
      a.license_number as agent_license
    FROM properties p
    JOIN agents a ON p.agent_id = a.id
    JOIN users u ON a.user_id = u.id
    WHERE p.is_verified = FALSE AND p.status = 'active'
    ORDER BY p.created_at DESC
    LIMIT $1 OFFSET $2
  `;

  const dataResult = await pool.query(dataQuery, [limitNumber, offset]);

  return {
    properties: dataResult.rows,
    total,
    page: pageNumber,
    totalPages: Math.ceil(total / limitNumber)
  };
}

async function getPlatformAnalytics() {
  // User growth over time (last 30 days)
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
    AND status = 'active'
    GROUP BY DATE(created_at)
    ORDER BY date
  `);

  // Popular cities
  const popularCities = await pool.query(`
    SELECT 
      city,
      COUNT(*) as property_count,
      ROUND(AVG(price)) as avg_price
    FROM properties 
    WHERE status = 'active'
    GROUP BY city 
    ORDER BY property_count DESC 
    LIMIT 10
  `);

  // Property type distribution
  const propertyTypes = await pool.query(`
    SELECT 
      type,
      category,
      COUNT(*) as count,
      ROUND((COUNT(*) * 100.0 / (SELECT COUNT(*) FROM properties WHERE status = 'active')), 2) as percentage
    FROM properties 
    WHERE status = 'active'
    GROUP BY type, category
    ORDER BY count DESC
  `);

  return {
    userGrowth: userGrowth.rows,
    propertyGrowth: propertyGrowth.rows,
    popularCities: popularCities.rows,
    propertyTypes: propertyTypes.rows
  };
}

async function updateUserRole(userId, newRole) {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    const existingUserQuery = 'SELECT role FROM users WHERE id = $1 FOR UPDATE';
    const existingUserResult = await client.query(existingUserQuery, [userId]);

    if (existingUserResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return null;
    }

    const previousRole = existingUserResult.rows[0].role;

    // Update user role
    const userQuery = 'UPDATE users SET role = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *';
    const userResult = await client.query(userQuery, [newRole, userId]);
    const user = userResult.rows[0];

    // Handle agent role changes
    if (newRole === 'agent') {
      // Check if agent record exists
      const agentCheck = await client.query('SELECT 1 FROM agents WHERE user_id = $1', [userId]);
      if (agentCheck.rows.length === 0) {
        // Create agent record
        await client.query(`
          INSERT INTO agents (user_id, experience, specialization, rating, review_count, properties_listed)
          VALUES ($1, 0, '{}', 0, 0, 0)
        `, [userId]);
      }
    } else if (previousRole === 'agent' && newRole !== 'agent') {
      // Remove agent record if changing from agent to non-agent
      await client.query('DELETE FROM agents WHERE user_id = $1', [userId]);
    }

    await client.query('COMMIT');
    return user;

  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function suspendUser(userId, reason, duration) {
  const suspendUntil = new Date();
  suspendUntil.setDate(suspendUntil.getDate() + duration);

  const query = `
    UPDATE users 
    SET suspended_until = $1, suspension_reason = $2, updated_at = CURRENT_TIMESTAMP
    WHERE id = $3
    RETURNING *
  `;

  const result = await pool.query(query, [suspendUntil, reason, userId]);
  return result.rows[0] || null;
}

async function unsuspendUser(userId) {
  const query = `
    UPDATE users 
    SET suspended_until = NULL, suspension_reason = NULL, updated_at = CURRENT_TIMESTAMP
    WHERE id = $1
    RETURNING *
  `;

  const result = await pool.query(query, [userId]);
  return result.rows[0] || null;
}

async function getSystemLogs({ page, limit, type, startDate, endDate }) {
  const pageNumber = Number(page) || 1;
  const limitNumber = Number(limit) || 50;
  const offset = (pageNumber - 1) * limitNumber;
  let whereConditions = ['1=1'];
  let params = [];
  let paramCount = 0;

  if (type) {
    paramCount++;
    whereConditions.push(`type = $${paramCount}`);
    params.push(type);
  }

  if (startDate) {
    paramCount++;
    whereConditions.push(`created_at >= $${paramCount}`);
    params.push(startDate);
  }

  if (endDate) {
    paramCount++;
    whereConditions.push(`created_at <= $${paramCount}`);
    params.push(endDate);
  }

  const whereClause = whereConditions.join(' AND ');

  // Count query
  const countQuery = `SELECT COUNT(*) FROM system_logs WHERE ${whereClause}`;
  const countResult = await pool.query(countQuery, params);
  const total = parseInt(countResult.rows[0].count);

  // Data query
  paramCount++;
  params.push(limitNumber);
  paramCount++;
  params.push(offset);

  const dataQuery = `
    SELECT * FROM system_logs 
    WHERE ${whereClause}
    ORDER BY created_at DESC
    LIMIT $${paramCount - 1} OFFSET $${paramCount}
  `;

  const dataResult = await pool.query(dataQuery, params);

  return {
    logs: dataResult.rows,
    total,
    page: pageNumber,
    totalPages: Math.ceil(total / limitNumber)
  };
}

export default router;
