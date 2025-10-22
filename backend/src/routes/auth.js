import express from 'express';
import jwt from 'jsonwebtoken';
import { body } from 'express-validator';
import { User } from '../models/User.js';
import { Agent } from '../models/Agent.js';
import { authenticate } from '../middleware/auth.js';
import { sendVerificationEmail, sendPasswordResetEmail } from '../utils/emailService.js';
import {
  catchAsync,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  AppError
} from '../middleware/errorHandler.js';
import { validateRequest, validateUserRegistration } from '../utils/validation.js';
import { ApplicationLogger } from '../utils/logger.js';

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
    emailVerified: Boolean(user.email_verified),
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

const loginValidation = [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty()
];

const emailValidation = [
  body('email').isEmail().normalizeEmail()
];

const passwordResetValidation = [
  body('token').notEmpty(),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one lowercase letter, one uppercase letter, and one number')
];

router.post(
  '/register',
  ...validateUserRegistration,
  validateRequest,
  catchAsync(async (req, res) => {
    const { email, password, name, phone, role = 'user' } = req.body;

    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      throw new AppError('User already exists with this email', 409, 'USER_CONFLICT');
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

    ApplicationLogger.securityEvent('USER_REGISTERED', user, {
      email,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.status(201).json({
      success: true,
      data: {
        token,
        user: mapUserResponse(user),
        agent: role === 'agent' ? mapAgentResponse(await Agent.findByUserId(user.id)) : null
      },
      message: 'Registration successful. Please check your email for verification.'
    });
  })
);

router.post(
  '/login',
  ...loginValidation,
  validateRequest,
  catchAsync(async (req, res) => {
    const { email, password } = req.body;

    const user = await User.findByEmail(email);
    if (!user) {
      throw new AuthenticationError('Invalid email or password');
    }

    const isPasswordValid = await User.comparePassword(password, user.password);
    if (!isPasswordValid) {
      throw new AuthenticationError('Invalid email or password');
    }

    if (!user.is_verified && !user.email_verified) {
      throw new AuthorizationError('Please verify your email before logging in');
    }

    const token = generateToken(user.id);
    await User.updateLastLogin(user.id);

    req.user = mapUserResponse(user);

    res.json({
      success: true,
      data: {
        token,
        user: req.user
      }
    });
  })
);

router.get(
  '/verify-email',
  catchAsync(async (req, res) => {
    const { token } = req.query;

    if (!token) {
      throw new ValidationError('Verification token is required');
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findByEmail(decoded.email);

    if (!user) {
      throw new NotFoundError('User');
    }

    if (user.is_verified || user.email_verified) {
      throw new ValidationError('Email already verified');
    }

    await User.verifyEmail(user.id);

    res.json({
      success: true,
      message: 'Email verified successfully'
    });
  })
);

router.post(
  '/forgot-password',
  ...emailValidation,
  validateRequest,
  catchAsync(async (req, res) => {
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
  })
);

router.post(
  '/reset-password',
  ...passwordResetValidation,
  validateRequest,
  catchAsync(async (req, res) => {
    const { token, password } = req.body;

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);

    if (!user) {
      throw new NotFoundError('User');
    }

    await User.updatePassword(user.id, password);
    await User.clearResetToken(user.id);

    res.json({
      success: true,
      message: 'Password reset successfully'
    });
  })
);

router.get(
  '/me',
  authenticate,
  catchAsync(async (req, res) => {
    const user = await User.findById(req.user.id);
    if (!user) {
      throw new NotFoundError('User');
    }

    const agentProfile = user.role === 'agent' ? await Agent.findByUserId(user.id) : null;

    res.json({
      success: true,
      data: {
        user: mapUserResponse(user),
        agent: mapAgentResponse(agentProfile)
      }
    });
  })
);

router.post(
  '/resend-verification',
  ...emailValidation,
  validateRequest,
  catchAsync(async (req, res) => {
    const { email } = req.body;
    const user = await User.findByEmail(email);

    if (!user) {
      throw new NotFoundError('User');
    }

    if (user.is_verified || user.email_verified) {
      throw new ValidationError('Email already verified');
    }

    const verificationToken = jwt.sign({ email }, process.env.JWT_SECRET, { expiresIn: '1d' });
    await User.updateVerificationToken(user.id, verificationToken);
    await sendVerificationEmail(email, verificationToken);

    res.json({
      success: true,
      message: 'Verification email sent successfully'
    });
  })
);

router.put(
  '/profile',
  authenticate,
  body('name').optional().isLength({ min: 2, max: 100 }).trim().escape(),
  body('phone').optional().isMobilePhone(),
  body('avatar').optional().isString(),
  validateRequest,
  catchAsync(async (req, res) => {
    const { name, phone, avatar } = req.body;
    const updateData = {};

    if (name !== undefined) updateData.name = name;
    if (phone !== undefined) updateData.phone = phone;
    if (avatar !== undefined) updateData.avatar = avatar;

    const updatedUser = await User.updateProfile(req.user.id, updateData);

    res.json({
      success: true,
      data: {
        user: mapUserResponse(updatedUser)
      },
      message: 'Profile updated successfully'
    });
  })
);

export default router;
