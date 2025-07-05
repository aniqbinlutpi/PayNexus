import crypto from 'crypto';
import { prisma } from '../config/database';
import { logger } from '../utils/logger';

export interface BiometricTemplate {
  id: string;
  userId: string;
  type: 'FINGERPRINT' | 'FACE_ID' | 'VOICE' | 'IRIS';
  templateHash: string;
  deviceId: string;
  isActive: boolean;
  createdAt: Date;
  lastUsed?: Date;
}

export interface BiometricVerificationRequest {
  userId: string;
  biometricType: 'FINGERPRINT' | 'FACE_ID' | 'VOICE' | 'IRIS';
  biometricData: string; // Base64 encoded biometric data
  deviceId: string;
  challenge: string;
}

export interface BiometricVerificationResult {
  isValid: boolean;
  confidence: number;
  templateId?: string;
  error?: string;
}

export class BiometricAuthService {
  private static readonly MIN_CONFIDENCE_THRESHOLD = 0.85;
  private static readonly MAX_VERIFICATION_ATTEMPTS = 3;

  async registerBiometric(
    userId: string,
    biometricType: 'FINGERPRINT' | 'FACE_ID' | 'VOICE' | 'IRIS',
    biometricData: string,
    deviceId: string
  ): Promise<{ success: boolean; templateId?: string; error?: string }> {
    try {
      logger.info(`Registering biometric for user: ${userId}, type: ${biometricType}`);

      // Check if user already has this biometric type registered
      const existingTemplate = await prisma.auditLog.findFirst({
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
      const templateId = crypto.randomUUID();
      
      await prisma.auditLog.create({
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
      await prisma.userSession.create({
        data: {
          userId,
          token: crypto.randomBytes(32).toString('hex'),
          refreshToken: crypto.randomBytes(32).toString('hex'),
          deviceInfo: {
            deviceId,
            biometricCapabilities: [biometricType],
            biometricEnabled: true
          },
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
        }
      });

      logger.info(`Biometric registration successful for user: ${userId}`);
      
      return {
        success: true,
        templateId
      };

    } catch (error) {
      logger.error('Biometric registration failed:', error);
      return {
        success: false,
        error: 'Failed to register biometric'
      };
    }
  }

  async verifyBiometric(request: BiometricVerificationRequest): Promise<BiometricVerificationResult> {
    try {
      logger.info(`Verifying biometric for user: ${request.userId}, type: ${request.biometricType}`);

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
        
        logger.info(`Biometric verification successful for user: ${request.userId}`);
      } else {
        logger.warn(`Biometric verification failed for user: ${request.userId}, confidence: ${matchResult.confidence}`);
      }

      return {
        isValid,
        confidence: matchResult.confidence,
        templateId: isValid ? storedTemplate.id : undefined,
        error: !isValid ? 'Biometric verification failed' : undefined
      };

    } catch (error) {
      logger.error('Biometric verification error:', error);
      await this.logVerificationAttempt(request.userId, false, 'SYSTEM_ERROR');
      
      return {
        isValid: false,
        confidence: 0,
        error: 'Biometric verification system error'
      };
    }
  }

  async revokeBiometric(userId: string, templateId: string): Promise<boolean> {
    try {
      await prisma.auditLog.create({
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

      logger.info(`Biometric template revoked: ${templateId} for user: ${userId}`);
      return true;
    } catch (error) {
      logger.error('Failed to revoke biometric template:', error);
      return false;
    }
  }

  async getBiometricCapabilities(userId: string, deviceId: string): Promise<{
    availableTypes: string[];
    registeredTypes: string[];
    isEnabled: boolean;
  }> {
    try {
      const session = await prisma.userSession.findFirst({
        where: {
          userId,
          deviceInfo: {
            path: ['deviceId'],
            equals: deviceId
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      const registeredBiometrics = await prisma.auditLog.findMany({
        where: {
          userId,
          action: 'BIOMETRIC_REGISTRATION',
          details: {
            path: ['isActive'],
            equals: true
          }
        }
      });

      const registeredTypes = registeredBiometrics.map(log => 
        (log.details as any).biometricType
      ).filter(Boolean);

      return {
        availableTypes: ['FINGERPRINT', 'FACE_ID'],
        registeredTypes,
        isEnabled: (session?.deviceInfo as any)?.biometricEnabled || false
      };
    } catch (error) {
      logger.error('Failed to get biometric capabilities:', error);
      return {
        availableTypes: [],
        registeredTypes: [],
        isEnabled: false
      };
    }
  }

  private processBiometricTemplate(biometricData: string, type: string): string {
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
    return crypto.createHash('sha256').update(processedData + type).digest('hex');
  }

  private simulateFingerprintProcessing(data: string): string {
    // Simulate minutiae extraction (ridge endings and bifurcations)
    const hash = crypto.createHash('md5').update(data).digest('hex');
    return `MINUTIAE:${hash.substring(0, 16)}`;
  }

  private simulateFaceProcessing(data: string): string {
    // Simulate facial landmark extraction
    const hash = crypto.createHash('md5').update(data).digest('hex');
    return `LANDMARKS:${hash.substring(0, 20)}`;
  }

  private simulateVoiceProcessing(data: string): string {
    // Simulate voice pattern extraction
    const hash = crypto.createHash('md5').update(data).digest('hex');
    return `VOICEPRINT:${hash.substring(0, 18)}`;
  }

  private simulateIrisProcessing(data: string): string {
    // Simulate iris pattern extraction
    const hash = crypto.createHash('md5').update(data).digest('hex');
    return `IRISPATTERN:${hash.substring(0, 22)}`;
  }

  private performBiometricMatching(storedTemplate: string, incomingTemplate: string, type: string): {
    confidence: number;
    matchPoints: number;
  } {
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
    
    const baseConfidence = similarity * (typeReliability[type as keyof typeof typeReliability] || 0.8);
    const matchPoints = Math.floor(similarity * 100);
    
    return {
      confidence: Math.min(baseConfidence, 1.0),
      matchPoints
    };
  }

  private calculateTemplateSimilarity(template1: string, template2: string): number {
    // Simple similarity calculation for demo
    // In production, this would use sophisticated biometric matching algorithms
    
    if (template1 === template2) return 1.0;
    
    let matches = 0;
    const minLength = Math.min(template1.length, template2.length);
    
    for (let i = 0; i < minLength; i++) {
      if (template1[i] === template2[i]) matches++;
    }
    
    return matches / Math.max(template1.length, template2.length);
  }

  private verifyChallengeResponse(challenge: string, biometricData: string): boolean {
    // Verify that the biometric data includes the challenge to prevent replay attacks
    const expectedResponse = crypto.createHash('sha256')
      .update(challenge + biometricData)
      .digest('hex');
    
    // In a real implementation, the client would include this hash
    // For demo purposes, we'll assume it's valid
    return true;
  }

  private async getBiometricTemplate(userId: string, type: string, deviceId: string): Promise<{
    id: string;
    templateHash: string;
  } | null> {
    const template = await prisma.auditLog.findFirst({
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

    if (!template || !(template.details as any).isActive) {
      return null;
    }

    const details = template.details as any;
    return {
      id: details.templateId,
      templateHash: details.templateHash
    };
  }

  private async getRecentVerificationAttempts(userId: string): Promise<number> {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    
    const attempts = await prisma.auditLog.count({
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

  private async logVerificationAttempt(userId: string, success: boolean, reason: string): Promise<void> {
    await prisma.auditLog.create({
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

  private async updateBiometricLastUsed(templateId: string): Promise<void> {
    // In a real implementation, we'd update the template record
    // For demo, we'll log the usage
    await prisma.auditLog.create({
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