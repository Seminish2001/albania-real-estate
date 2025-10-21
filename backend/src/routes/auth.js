import express from 'express';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import { User } from '../models/User.js';
import { Agent } from '../models/Agent.js';
import { authenticate } from '../middleware/auth.js';
import { sendVerificationEmail, sendPasswordResetEmail } from '../utils/emailService.js';

const router = express.Router();

const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

const formatDate = (value) => {
  if (!value) return null;
  return value instanceof Date ? value.toISOString() : value;
};

const mapUserResponse = (user) => {
  if (!user) return null;

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    avatar: user.avatar,
    phone: user.phone,
    isVerified: Boolean(user.is_verified || user.email_verified),
    createdAt: formatDate(user.created_at),
    updatedAt: formatDate(user.updated_at),
    lastLogin: formatDate(user.last_login)
  };
};

const mapAgentResponse = (agent) => {
  if (!agent) return null;

  return {
    id: agent.id,
    userId: agent.user_id,
    agency: agent.agency,
    licenseNumber: agent.license_number,
    experience: agent.experience,
    specialization: agent.specialization || [],
    rating: agent.rating,
    reviewCount: agent.review_count,
    propertiesListed: agent.properties_listed,
    isPremium: agent.is_premium,
    subscriptionEnds: formatDate(agent.subscription_ends),
    createdAt: formatDate(agent.created_at),
    updatedAt: formatDate(agent.updated_at)
  };
};

const registerValidation = [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('name').notEmpty().trim(),
  body('phone').optional().isMobilePhone(),
  body('role').optional().isIn(['user', 'agent'])
];

router.post('/register', registerValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { email, password, name, phone, role = 'user' } = req.body;

    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: 'User already exists with this email'
      });
    }

    const verificationToken = jwt.sign({ email }, process.env.JWT_SECRET, { expiresIn: '1d' });

    const user = await User.create({
      email,
      password,
      name,
      phone,
      role,
      verificationToken
    });

    if (role === 'agent') {
      await Agent.create({
        userId: user.id,
        experience: 0,
        specialization: [],
        rating: 0,
        reviewCount: 0,
        propertiesListed: 0,
        isPremium: false
      });
    }

    const token = generateToken(user.id);
    await sendVerificationEmail(email, verificationToken);

    res.status(201).json({
      success: true,
      data: {
        token,
        user: mapUserResponse(user)
      },
      message: 'Registration successful. Please check your email for verification.'
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

const loginValidation = [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty()
];

router.post('/login', loginValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { email, password } = req.body;

    const user = await User.findByEmail(email);
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password'
      });
    }

    const isPasswordValid = await User.comparePassword(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password'
      });
    }

    if (!user.is_verified && !user.email_verified) {
      return res.status(403).json({
        success: false,
        error: 'Please verify your email before logging in'
      });
    }

    const token = generateToken(user.id);
    await User.updateLastLogin(user.id);

    res.json({
      success: true,
      data: {
        token,
        user: mapUserResponse(user)
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

router.get('/verify-email', async (req, res) => {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({
        success: false,
        error: 'Verification token is required'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findByEmail(decoded.email);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    if (user.is_verified || user.email_verified) {
      return res.status(400).json({
        success: false,
        error: 'Email already verified'
      });
    }

    await User.verifyEmail(user.id);

    res.json({
      success: true,
      message: 'Email verified successfully. You can now log in.'
    });
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(400).json({
        success: false,
        error: 'Verification token has expired'
      });
    }

    if (error.name === 'JsonWebTokenError') {
      return res.status(400).json({
        success: false,
        error: 'Invalid verification token'
      });
    }

    console.error('Email verification error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

router.post('/forgot-password', [
  body('email').isEmail().normalizeEmail()
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

    const { email } = req.body;
    const user = await User.findByEmail(email);

    if (user) {
      const resetToken = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '1h' });
      await User.setResetToken(user.id, resetToken);
      await sendPasswordResetEmail(email, resetToken);
    }

    res.json({
      success: true,
      message: 'If an account with that email exists, a password reset link has been sent.'
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

router.post('/reset-password', [
  body('token').notEmpty(),
  body('password').isLength({ min: 6 })
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

    const { token, password } = req.body;

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Invalid or expired reset token'
      });
    }

    await User.updatePassword(user.id, password);
    await User.clearResetToken(user.id);

    res.json({
      success: true,
      message: 'Password reset successfully. You can now log in with your new password.'
    });
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(400).json({
        success: false,
        error: 'Password reset token has expired'
      });
    }

    if (error.name === 'JsonWebTokenError') {
      return res.status(400).json({
        success: false,
        error: 'Invalid reset token'
      });
    }

    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

router.get('/me', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    let agentProfile = null;
    if (user.role === 'agent') {
      agentProfile = await Agent.findByUserId(user.id);
    }

    res.json({
      success: true,
      data: {
        user: {
          ...mapUserResponse(user),
          agentProfile: mapAgentResponse(agentProfile)
        }
      }
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

router.put('/profile', authenticate, [
  body('name').optional().notEmpty().trim(),
  body('phone').optional().isMobilePhone()
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

    const { name, phone, avatar } = req.body;
    const updateData = {};

    if (name) updateData.name = name;
    if (phone) updateData.phone = phone;
    if (avatar) updateData.avatar = avatar;

    const updatedUser = await User.updateProfile(req.user.id, updateData);

    res.json({
      success: true,
      data: {
        user: mapUserResponse(updatedUser)
      },
      message: 'Profile updated successfully'
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

router.post('/resend-verification', [
  body('email').isEmail().normalizeEmail()
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

    const { email } = req.body;
    const user = await User.findByEmail(email);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    if (user.is_verified || user.email_verified) {
      return res.status(400).json({
        success: false,
        error: 'Email already verified'
      });
    }

    const verificationToken = jwt.sign({ email }, process.env.JWT_SECRET, { expiresIn: '1d' });
    await User.updateVerificationToken(user.id, verificationToken);
    await sendVerificationEmail(email, verificationToken);

    res.json({
      success: true,
      message: 'Verification email sent successfully'
    });
  } catch (error) {
    console.error('Resend verification error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

export default router;
