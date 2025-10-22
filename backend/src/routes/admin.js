import express from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import { Admin } from '../models/Admin.js';
import { Property } from '../models/Property.js';

const router = express.Router();

// Admin statistics
router.get('/stats', authenticate, authorize('admin'), async (req, res) => {
  try {
    const stats = await Admin.getPlatformStats();
    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('Failed to fetch admin stats:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch stats' });
  }
});

// Property verification
router.post('/properties/:id/verify', authenticate, authorize('admin'), async (req, res) => {
  try {
    await Property.verify(req.params.id, req.user.id);
    res.json({ success: true, message: 'Property verified' });
  } catch (error) {
    console.error('Property verification error:', error);
    res.status(500).json({ success: false, error: 'Verification failed' });
  }
});

// User management
router.get('/users', authenticate, authorize('admin'), async (req, res) => {
  try {
    const users = await Admin.getUsers(req.query);
    res.json({ success: true, data: users });
  } catch (error) {
    console.error('Fetch users error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch users' });
  }
});

export default router;
