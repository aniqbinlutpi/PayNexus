export interface FraudAnalysis {
    isFraudulent: boolean;
    riskScore: number;
    reasons: string[];
    confidence: number;
    requiredActions: string[];
}
export interface TransactionPattern {
    userId: string;
    averageAmount: number;
    commonHours: number[];
    frequentProviders: string[];
    typicalCurrencies: string[];
    velocityPattern: number;
}
export declare class FraudDetectionService {
    private static readonly FRAUD_THRESHOLD;
    private static readonly HIGH_RISK_THRESHOLD;
    analyzeTransaction(transactionData: {
        userId: string;
        amount: number;
        currency: string;
        targetCurrency?: string;
        sourceProvider: string;
        targetProvider: string;
        deviceFingerprint?: string;
        ipAddress?: string;
        timestamp: Date;
    }): Promise<FraudAnalysis>;
    private getUserPattern;
    private analyzeVelocity;
    private analyzeDevice;
    private analyzeAmount;
    private analyzeGeographic;
    private getMockLocationFromIP;
    private analyzeBehavioralPattern;
    private calculateConfidence;
    private logFraudAnalysis;
}
