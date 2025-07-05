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
    biometricData: string;
    deviceId: string;
    challenge: string;
}
export interface BiometricVerificationResult {
    isValid: boolean;
    confidence: number;
    templateId?: string;
    error?: string;
}
export declare class BiometricAuthService {
    private static readonly MIN_CONFIDENCE_THRESHOLD;
    private static readonly MAX_VERIFICATION_ATTEMPTS;
    registerBiometric(userId: string, biometricType: 'FINGERPRINT' | 'FACE_ID' | 'VOICE' | 'IRIS', biometricData: string, deviceId: string): Promise<{
        success: boolean;
        templateId?: string;
        error?: string;
    }>;
    verifyBiometric(request: BiometricVerificationRequest): Promise<BiometricVerificationResult>;
    revokeBiometric(userId: string, templateId: string): Promise<boolean>;
    getBiometricCapabilities(userId: string, deviceId: string): Promise<{
        availableTypes: string[];
        registeredTypes: string[];
        isEnabled: boolean;
    }>;
    private processBiometricTemplate;
    private simulateFingerprintProcessing;
    private simulateFaceProcessing;
    private simulateVoiceProcessing;
    private simulateIrisProcessing;
    private performBiometricMatching;
    private calculateTemplateSimilarity;
    private verifyChallengeResponse;
    private getBiometricTemplate;
    private getRecentVerificationAttempts;
    private logVerificationAttempt;
    private updateBiometricLastUsed;
}
