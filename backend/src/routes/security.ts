import { Router, Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import { AuthenticatedRequest } from '../middleware/auth';
import { BiometricAuthService } from '../services/BiometricAuthService';
import { FraudDetectionService } from '../services/FraudDetectionService';
import { CustomError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';
import { prisma } from '../config/database';

const router = Router();
const biometricService = new BiometricAuthService();
const fraudService = new FraudDetectionService();

// Register biometric authentication
router.post('/biometric/register', [
  body('biometricType').isIn(['FINGERPRINT', 'FACE_ID', 'VOICE', 'IRIS']),
  body('biometricData').isString().notEmpty(),
  body('deviceId').isString().notEmpty(),
], async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new CustomError('Validation failed', 400);
    }

    const userId = req.user!.id;
    const { biometricType, biometricData, deviceId } = req.body;

    const result = await biometricService.registerBiometric(
      userId,
      biometricType,
      biometricData,
      deviceId
    );

    if (result.success) {
      res.status(201).json({
        success: true,
        data: {
          templateId: result.templateId,
          message: 'Biometric registered successfully'
        }
      });
    } else {
      throw new CustomError(result.error || 'Biometric registration failed', 400);
    }
  } catch (error) {
    next(error);
  }
});

// Verify biometric authentication
router.post('/biometric/verify', [
  body('biometricType').isIn(['FINGERPRINT', 'FACE_ID', 'VOICE', 'IRIS']),
  body('biometricData').isString().notEmpty(),
  body('deviceId').isString().notEmpty(),
  body('challenge').isString().notEmpty(),
], async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new CustomError('Validation failed', 400);
    }

    const userId = req.user!.id;
    const { biometricType, biometricData, deviceId, challenge } = req.body;

    const result = await biometricService.verifyBiometric({
      userId,
      biometricType,
      biometricData,
      deviceId,
      challenge
    });

    res.json({
      success: result.isValid,
      data: {
        verified: result.isValid,
        confidence: result.confidence,
        templateId: result.templateId
      },
      error: result.error
    });
  } catch (error) {
    next(error);
  }
});

// Get biometric capabilities
router.get('/biometric/capabilities', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const deviceId = req.query.deviceId as string;

    if (!deviceId) {
      throw new CustomError('Device ID is required', 400);
    }

    const capabilities = await biometricService.getBiometricCapabilities(userId, deviceId);

    res.json({
      success: true,
      data: capabilities
    });
  } catch (error) {
    next(error);
  }
});

// Report suspicious activity
router.post('/fraud/report', [
  body('transactionId').optional().isString(),
  body('description').isString().notEmpty(),
  body('category').isIn(['UNAUTHORIZED_TRANSACTION', 'SUSPICIOUS_LOGIN', 'PHISHING', 'OTHER']),
], async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new CustomError('Validation failed', 400);
    }

    const userId = req.user!.id;
    const { transactionId, description, category } = req.body;

    // Log fraud report
    logger.warn('Fraud report received', {
      userId,
      transactionId,
      category,
      description,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    // In production, this would trigger fraud investigation workflow
    
    res.json({
      success: true,
      data: {
        reportId: `FR-${Date.now()}`,
        status: 'RECEIVED',
        message: 'Fraud report received and will be investigated'
      }
    });
  } catch (error) {
    next(error);
  }
});

// Get security settings
router.get('/settings', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;

    // Get user's security settings
    const sessions = await prisma.userSession.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        deviceInfo: true,
        ipAddress: true,
        createdAt: true,
        expiresAt: true
      }
    });

    const auditLogs = await prisma.auditLog.findMany({
      where: { 
        userId,
        action: { in: ['LOGIN', 'BIOMETRIC_REGISTRATION', 'FRAUD_ANALYSIS'] }
      },
      orderBy: { timestamp: 'desc' },
      take: 10,
      select: {
        action: true,
        details: true,
        timestamp: true,
        ipAddress: true
      }
    });

    res.json({
      success: true,
      data: {
        activeSessions: sessions.length,
        recentActivity: auditLogs,
        securityFeatures: {
          biometricEnabled: sessions.some((s: any) => (s.deviceInfo as any)?.biometricEnabled),
          mfaEnabled: false, // Would check MFA status
          fraudProtection: true
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

// Update security preferences
router.put('/settings', [
  body('biometricEnabled').optional().isBoolean(),
  body('mfaEnabled').optional().isBoolean(),
  body('fraudAlertsEnabled').optional().isBoolean(),
], async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new CustomError('Validation failed', 400);
    }

    const userId = req.user!.id;
    const settings = req.body;

    // Log security settings change
    logger.info('Security settings updated', {
      userId,
      settings,
      ip: req.ip
    });

    res.json({
      success: true,
      data: {
        message: 'Security settings updated successfully',
        settings
      }
    });
  } catch (error) {
    next(error);
  }
});

export default router; 