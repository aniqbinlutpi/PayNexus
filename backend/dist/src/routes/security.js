"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const BiometricAuthService_1 = require("../services/BiometricAuthService");
const FraudDetectionService_1 = require("../services/FraudDetectionService");
const errorHandler_1 = require("../middleware/errorHandler");
const logger_1 = require("../utils/logger");
const database_1 = require("../config/database");
const router = (0, express_1.Router)();
const biometricService = new BiometricAuthService_1.BiometricAuthService();
const fraudService = new FraudDetectionService_1.FraudDetectionService();
// Register biometric authentication
router.post('/biometric/register', [
    (0, express_validator_1.body)('biometricType').isIn(['FINGERPRINT', 'FACE_ID', 'VOICE', 'IRIS']),
    (0, express_validator_1.body)('biometricData').isString().notEmpty(),
    (0, express_validator_1.body)('deviceId').isString().notEmpty(),
], async (req, res, next) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            throw new errorHandler_1.CustomError('Validation failed', 400);
        }
        const userId = req.user.id;
        const { biometricType, biometricData, deviceId } = req.body;
        const result = await biometricService.registerBiometric(userId, biometricType, biometricData, deviceId);
        if (result.success) {
            res.status(201).json({
                success: true,
                data: {
                    templateId: result.templateId,
                    message: 'Biometric registered successfully'
                }
            });
        }
        else {
            throw new errorHandler_1.CustomError(result.error || 'Biometric registration failed', 400);
        }
    }
    catch (error) {
        next(error);
    }
});
// Verify biometric authentication
router.post('/biometric/verify', [
    (0, express_validator_1.body)('biometricType').isIn(['FINGERPRINT', 'FACE_ID', 'VOICE', 'IRIS']),
    (0, express_validator_1.body)('biometricData').isString().notEmpty(),
    (0, express_validator_1.body)('deviceId').isString().notEmpty(),
    (0, express_validator_1.body)('challenge').isString().notEmpty(),
], async (req, res, next) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            throw new errorHandler_1.CustomError('Validation failed', 400);
        }
        const userId = req.user.id;
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
    }
    catch (error) {
        next(error);
    }
});
// Get biometric capabilities
router.get('/biometric/capabilities', async (req, res, next) => {
    try {
        const userId = req.user.id;
        const deviceId = req.query.deviceId;
        if (!deviceId) {
            throw new errorHandler_1.CustomError('Device ID is required', 400);
        }
        const capabilities = await biometricService.getBiometricCapabilities(userId, deviceId);
        res.json({
            success: true,
            data: capabilities
        });
    }
    catch (error) {
        next(error);
    }
});
// Report suspicious activity
router.post('/fraud/report', [
    (0, express_validator_1.body)('transactionId').optional().isString(),
    (0, express_validator_1.body)('description').isString().notEmpty(),
    (0, express_validator_1.body)('category').isIn(['UNAUTHORIZED_TRANSACTION', 'SUSPICIOUS_LOGIN', 'PHISHING', 'OTHER']),
], async (req, res, next) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            throw new errorHandler_1.CustomError('Validation failed', 400);
        }
        const userId = req.user.id;
        const { transactionId, description, category } = req.body;
        // Log fraud report
        logger_1.logger.warn('Fraud report received', {
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
    }
    catch (error) {
        next(error);
    }
});
// Get security settings
router.get('/settings', async (req, res, next) => {
    try {
        const userId = req.user.id;
        // Get user's security settings
        const sessions = await database_1.prisma.userSession.findMany({
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
        const auditLogs = await database_1.prisma.auditLog.findMany({
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
                    biometricEnabled: sessions.some((s) => s.deviceInfo?.biometricEnabled),
                    mfaEnabled: false, // Would check MFA status
                    fraudProtection: true
                }
            }
        });
    }
    catch (error) {
        next(error);
    }
});
// Update security preferences
router.put('/settings', [
    (0, express_validator_1.body)('biometricEnabled').optional().isBoolean(),
    (0, express_validator_1.body)('mfaEnabled').optional().isBoolean(),
    (0, express_validator_1.body)('fraudAlertsEnabled').optional().isBoolean(),
], async (req, res, next) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            throw new errorHandler_1.CustomError('Validation failed', 400);
        }
        const userId = req.user.id;
        const settings = req.body;
        // Log security settings change
        logger_1.logger.info('Security settings updated', {
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
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
//# sourceMappingURL=security.js.map