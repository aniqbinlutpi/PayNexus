import { Router, Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/database';
import { CustomError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

const router = Router();

// Helper function for JWT signing
const signJWT = (payload: object, secret: string, expiresIn: string): string => {
  return jwt.sign(payload, secret, { expiresIn } as jwt.SignOptions);
};

// Register endpoint
router.post('/register', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('firstName').trim().isLength({ min: 1 }),
  body('lastName').trim().isLength({ min: 1 }),
  body('phoneNumber').trim().isLength({ min: 8 }),
  body('countryCode').trim().isLength({ min: 2, max: 2 }),
], async (req: Request, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new CustomError('Validation failed', 400);
    }

    const { email, password, firstName, lastName, phoneNumber, countryCode } = req.body;

    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email },
          { phoneNumber }
        ]
      }
    });

    if (existingUser) {
      throw new CustomError('User already exists with this email or phone number', 409);
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, parseInt(process.env.BCRYPT_ROUNDS || '12'));

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        firstName,
        lastName,
        phoneNumber,
        countryCode,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phoneNumber: true,
        countryCode: true,
        createdAt: true,
      },
    });

    // Generate tokens
    const accessToken = signJWT(
      { userId: user.id },
      process.env.JWT_SECRET!,
      process.env.JWT_EXPIRES_IN || '15m'
    );

    const refreshToken = signJWT(
      { userId: user.id },
      process.env.JWT_REFRESH_SECRET!,
      process.env.JWT_REFRESH_EXPIRES_IN || '7d'
    );

    logger.info(`New user registered: ${user.email}`);

    res.status(201).json({
      success: true,
      data: {
        user,
        accessToken,
        refreshToken,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Login endpoint
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 1 }),
], async (req: Request, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new CustomError('Validation failed', 400);
    }

    const { email, password } = req.body;

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phoneNumber: true,
        countryCode: true,
        passwordHash: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new CustomError('Invalid credentials', 401);
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new CustomError('Invalid credentials', 401);
    }

    // Generate tokens
    const accessToken = signJWT(
      { userId: user.id },
      process.env.JWT_SECRET!,
      process.env.JWT_EXPIRES_IN || '15m'
    );

    const refreshToken = signJWT(
      { userId: user.id },
      process.env.JWT_REFRESH_SECRET!,
      process.env.JWT_REFRESH_EXPIRES_IN || '7d'
    );

    // Remove password from response
    const { passwordHash, ...userWithoutPassword } = user;

    logger.info(`User logged in: ${user.email}`);

    res.json({
      success: true,
      data: {
        user: userWithoutPassword,
        accessToken,
        refreshToken,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Refresh token endpoint
router.post('/refresh', [
  body('refreshToken').isLength({ min: 1 }),
], async (req: Request, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new CustomError('Refresh token is required', 400);
    }

    const { refreshToken } = req.body;

    // Verify refresh token
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET!) as any;

    // Find user
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
      },
    });

    if (!user) {
      throw new CustomError('User not found', 401);
    }

    // Generate new access token
    const accessToken = signJWT(
      { userId: user.id },
      process.env.JWT_SECRET!,
      process.env.JWT_EXPIRES_IN || '15m'
    );

    res.json({
      success: true,
      data: {
        accessToken,
      },
    });
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      next(new CustomError('Invalid refresh token', 401));
    } else {
      next(error);
    }
  }
});

export default router; 