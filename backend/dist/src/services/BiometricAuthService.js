"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BiometricAuthService = void 0;
const crypto_1 = __importDefault(require("crypto"));
const database_1 = require("../config/database");
const logger_1 = require("../utils/logger");
class BiometricAuthService {
    async registerBiometric(userId, biometricType, biometricData, deviceId) {
        try {
            logger_1.logger.info(`Registering biometric for user: ${userId}, type: ${biometricType}`);
            // Check if user already has this biometric type registered
            const existingTemplate = await database_1.prisma.auditLog.findFirst({
                where: {
                    userId,
                    action: 'BIOMETRIC_REGISTRATION',
                    details: {
                        path: ['biometricType'],
                        equals: biometricType
                    }
                }
            });
            if (existingTemplate) {
                return {
                    success: false,
                    error: 'Biometric type already registered for this user'
                };
            }
            // Process and hash the biometric template
            const templateHash = this.processBiometricTemplate(biometricData, biometricType);
            // Create biometric record (stored in audit log for security)
            const templateId = crypto_1.default.randomUUID();
            await database_1.prisma.auditLog.create({
                data: {
                    userId,
                    action: 'BIOMETRIC_REGISTRATION',
                    resource: 'BIOMETRIC_TEMPLATE',
                    details: {
                        templateId,
                        biometricType,
                        templateHash,
                        deviceId,
                        isActive: true,
                        registrationTime: new Date()
                    }
                }
            });
            // Create user session with biometric capability
            await database_1.prisma.userSession.create({
                data: {
                    userId,
                    token: crypto_1.default.randomBytes(32).toString('hex'),
                    refreshToken: crypto_1.default.randomBytes(32).toString('hex'),
                    deviceInfo: {
                        deviceId,
                        biometricCapabilities: [biometricType],
                        biometricEnabled: true
                    },
                    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
                }
            });
            logger_1.logger.info(`Biometric registration successful for user: ${userId}`);
            return {
                success: true,
                templateId
            };
        }
        catch (error) {
            logger_1.logger.error('Biometric registration failed:', error);
            return {
                success: false,
                error: 'Failed to register biometric'
            };
        }
    }
    async verifyBiometric(request) {
        try {
            logger_1.logger.info(`Verifying biometric for user: ${request.userId}, type: ${request.biometricType}`);
            // Check verification attempts
            const recentAttempts = await this.getRecentVerificationAttempts(request.userId);
            if (recentAttempts >= BiometricAuthService.MAX_VERIFICATION_ATTEMPTS) {
                await this.logVerificationAttempt(request.userId, false, 'MAX_ATTEMPTS_EXCEEDED');
                return {
                    isValid: false,
                    confidence: 0,
                    error: 'Maximum verification attempts exceeded. Please try again later.'
                };
            }
            // Get stored biometric template
            const storedTemplate = await this.getBiometricTemplate(request.userId, request.biometricType, request.deviceId);
            if (!storedTemplate) {
                await this.logVerificationAttempt(request.userId, false, 'TEMPLATE_NOT_FOUND');
                return {
                    isValid: false,
                    confidence: 0,
                    error: 'Biometric template not found'
                };
            }
            // Process incoming biometric data
            const incomingTemplateHash = this.processBiometricTemplate(request.biometricData, request.biometricType);
            // Perform biometric matching
            const matchResult = this.performBiometricMatching(storedTemplate.templateHash, incomingTemplateHash, request.biometricType);
            // Verify challenge to prevent replay attacks
            const challengeValid = this.verifyChallengeResponse(request.challenge, request.biometricData);
            const isValid = matchResult.confidence >= BiometricAuthService.MIN_CONFIDENCE_THRESHOLD && challengeValid;
            // Log verification attempt
            await this.logVerificationAttempt(request.userId, isValid, isValid ? 'SUCCESS' : 'FAILED_MATCH');
            if (isValid) {
                // Update last used timestamp
                await this.updateBiometricLastUsed(storedTemplate.id);
                logger_1.logger.info(`Biometric verification successful for user: ${request.userId}`);
            }
            else {
                logger_1.logger.warn(`Biometric verification failed for user: ${request.userId}, confidence: ${matchResult.confidence}`);
            }
            return {
                isValid,
                confidence: matchResult.confidence,
                templateId: isValid ? storedTemplate.id : undefined,
                error: !isValid ? 'Biometric verification failed' : undefined
            };
        }
        catch (error) {
            logger_1.logger.error('Biometric verification error:', error);
            await this.logVerificationAttempt(request.userId, false, 'SYSTEM_ERROR');
            return {
                isValid: false,
                confidence: 0,
                error: 'Biometric verification system error'
            };
        }
    }
    async revokeBiometric(userId, templateId) {
        try {
            await database_1.prisma.auditLog.create({
                data: {
                    userId,
                    action: 'BIOMETRIC_REVOCATION',
                    resource: 'BIOMETRIC_TEMPLATE',
                    details: {
                        templateId,
                        revokedAt: new Date(),
                        reason: 'USER_REQUEST'
                    }
                }
            });
            logger_1.logger.info(`Biometric template revoked: ${templateId} for user: ${userId}`);
            return true;
        }
        catch (error) {
            logger_1.logger.error('Failed to revoke biometric template:', error);
            return false;
        }
    }
    async getBiometricCapabilities(userId, deviceId) {
        try {
            const session = await database_1.prisma.userSession.findFirst({
                where: {
                    userId,
                    deviceInfo: {
                        path: ['deviceId'],
                        equals: deviceId
                    }
                },
                orderBy: { createdAt: 'desc' }
            });
            const registeredBiometrics = await database_1.prisma.auditLog.findMany({
                where: {
                    userId,
                    action: 'BIOMETRIC_REGISTRATION',
                    details: {
                        path: ['isActive'],
                        equals: true
                    }
                }
            });
            const registeredTypes = registeredBiometrics.map(log => log.details.biometricType).filter(Boolean);
            return {
                availableTypes: ['FINGERPRINT', 'FACE_ID'],
                registeredTypes,
                isEnabled: session?.deviceInfo?.biometricEnabled || false
            };
        }
        catch (error) {
            logger_1.logger.error('Failed to get biometric capabilities:', error);
            return {
                availableTypes: [],
                registeredTypes: [],
                isEnabled: false
            };
        }
    }
    processBiometricTemplate(biometricData, type) {
        // In a real implementation, this would use specialized biometric processing libraries
        // For demo purposes, we'll create a hash with some type-specific processing
        let processedData = biometricData;
        switch (type) {
            case 'FINGERPRINT':
                // Simulate minutiae extraction and normalization
                processedData = this.simulateFingerprintProcessing(biometricData);
                break;
            case 'FACE_ID':
                // Simulate facial feature extraction
                processedData = this.simulateFaceProcessing(biometricData);
                break;
            case 'VOICE':
                // Simulate voice pattern extraction
                processedData = this.simulateVoiceProcessing(biometricData);
                break;
            case 'IRIS':
                // Simulate iris pattern extraction
                processedData = this.simulateIrisProcessing(biometricData);
                break;
        }
        // Create secure hash of processed template
        return crypto_1.default.createHash('sha256').update(processedData + type).digest('hex');
    }
    simulateFingerprintProcessing(data) {
        // Simulate minutiae extraction (ridge endings and bifurcations)
        const hash = crypto_1.default.createHash('md5').update(data).digest('hex');
        return `MINUTIAE:${hash.substring(0, 16)}`;
    }
    simulateFaceProcessing(data) {
        // Simulate facial landmark extraction
        const hash = crypto_1.default.createHash('md5').update(data).digest('hex');
        return `LANDMARKS:${hash.substring(0, 20)}`;
    }
    simulateVoiceProcessing(data) {
        // Simulate voice pattern extraction
        const hash = crypto_1.default.createHash('md5').update(data).digest('hex');
        return `VOICEPRINT:${hash.substring(0, 18)}`;
    }
    simulateIrisProcessing(data) {
        // Simulate iris pattern extraction
        const hash = crypto_1.default.createHash('md5').update(data).digest('hex');
        return `IRISPATTERN:${hash.substring(0, 22)}`;
    }
    performBiometricMatching(storedTemplate, incomingTemplate, type) {
        // Simulate biometric matching algorithm
        // In production, this would use specialized matching libraries
        const similarity = this.calculateTemplateSimilarity(storedTemplate, incomingTemplate);
        // Adjust confidence based on biometric type reliability
        const typeReliability = {
            'FINGERPRINT': 0.95,
            'FACE_ID': 0.90,
            'IRIS': 0.98,
            'VOICE': 0.85
        };
        const baseConfidence = similarity * (typeReliability[type] || 0.8);
        const matchPoints = Math.floor(similarity * 100);
        return {
            confidence: Math.min(baseConfidence, 1.0),
            matchPoints
        };
    }
    calculateTemplateSimilarity(template1, template2) {
        // Simple similarity calculation for demo
        // In production, this would use sophisticated biometric matching algorithms
        if (template1 === template2)
            return 1.0;
        let matches = 0;
        const minLength = Math.min(template1.length, template2.length);
        for (let i = 0; i < minLength; i++) {
            if (template1[i] === template2[i])
                matches++;
        }
        return matches / Math.max(template1.length, template2.length);
    }
    verifyChallengeResponse(challenge, biometricData) {
        // Verify that the biometric data includes the challenge to prevent replay attacks
        const expectedResponse = crypto_1.default.createHash('sha256')
            .update(challenge + biometricData)
            .digest('hex');
        // In a real implementation, the client would include this hash
        // For demo purposes, we'll assume it's valid
        return true;
    }
    async getBiometricTemplate(userId, type, deviceId) {
        const template = await database_1.prisma.auditLog.findFirst({
            where: {
                userId,
                action: 'BIOMETRIC_REGISTRATION',
                details: {
                    path: ['biometricType'],
                    equals: type
                }
            },
            orderBy: { timestamp: 'desc' }
        });
        if (!template || !template.details.isActive) {
            return null;
        }
        const details = template.details;
        return {
            id: details.templateId,
            templateHash: details.templateHash
        };
    }
    async getRecentVerificationAttempts(userId) {
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        const attempts = await database_1.prisma.auditLog.count({
            where: {
                userId,
                action: 'BIOMETRIC_VERIFICATION',
                timestamp: {
                    gte: oneHourAgo
                }
            }
        });
        return attempts;
    }
    async logVerificationAttempt(userId, success, reason) {
        await database_1.prisma.auditLog.create({
            data: {
                userId,
                action: 'BIOMETRIC_VERIFICATION',
                resource: 'AUTHENTICATION',
                details: {
                    success,
                    reason,
                    timestamp: new Date()
                }
            }
        });
    }
    async updateBiometricLastUsed(templateId) {
        // In a real implementation, we'd update the template record
        // For demo, we'll log the usage
        await database_1.prisma.auditLog.create({
            data: {
                action: 'BIOMETRIC_USAGE',
                resource: 'BIOMETRIC_TEMPLATE',
                details: {
                    templateId,
                    lastUsed: new Date()
                }
            }
        });
    }
}
exports.BiometricAuthService = BiometricAuthService;
BiometricAuthService.MIN_CONFIDENCE_THRESHOLD = 0.85;
BiometricAuthService.MAX_VERIFICATION_ATTEMPTS = 3;
//# sourceMappingURL=BiometricAuthService.js.map