import { PaymentProvider } from '@prisma/client';
export interface StandInProcessingDecision {
    shouldProcess: boolean;
    riskLevel: RiskLevel;
    maxAmount: number;
    reasoning: string;
    conditions: string[];
    settlementQueue: string;
}
export interface FailoverStrategy {
    primaryProvider: PaymentProvider;
    backupProviders: PaymentProvider[];
    failoverTriggers: FailoverTrigger[];
    recoveryProcedures: RecoveryProcedure[];
    circuitBreakerState: CircuitBreakerState;
}
export interface CircuitBreakerState {
    provider: PaymentProvider;
    state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
    failureCount: number;
    lastFailureTime: Date;
    nextRetryTime: Date;
    threshold: number;
}
export interface FailoverTrigger {
    condition: string;
    threshold: number;
    timeWindow: number;
    action: FailoverAction;
}
export interface RecoveryProcedure {
    provider: PaymentProvider;
    healthCheckEndpoint: string;
    recoverySteps: RecoveryStep[];
    reconciliationRequired: boolean;
    estimatedRecoveryTime: number;
}
export interface RecoveryStep {
    stepId: string;
    description: string;
    action: string;
    timeout: number;
    retryCount: number;
}
export interface PendingSettlement {
    transactionId: string;
    originalProvider: PaymentProvider;
    standInProvider: PaymentProvider;
    amount: number;
    currency: string;
    processedAt: Date;
    settlementStatus: SettlementStatus;
    reconciliationData: any;
}
export declare enum RiskLevel {
    LOW = "LOW",
    MEDIUM = "MEDIUM",
    HIGH = "HIGH",
    CRITICAL = "CRITICAL"
}
export declare enum FailoverAction {
    SWITCH_PROVIDER = "SWITCH_PROVIDER",
    ACTIVATE_STANDIN = "ACTIVATE_STANDIN",
    QUEUE_TRANSACTION = "QUEUE_TRANSACTION",
    REJECT_TRANSACTION = "REJECT_TRANSACTION"
}
export declare enum SettlementStatus {
    PENDING = "PENDING",
    RECONCILING = "RECONCILING",
    SETTLED = "SETTLED",
    FAILED = "FAILED"
}
export declare class ResilientPaymentInfrastructureService {
    private circuitBreakers;
    private settlementQueues;
    private healthCheckInterval;
    constructor();
    evaluateStandInProcessing(transactionRequest: any, failedProvider: PaymentProvider): Promise<StandInProcessingDecision>;
    executeFailover(failedProvider: PaymentProvider, transactionRequest: any): Promise<FailoverResult>;
    checkCircuitBreaker(provider: PaymentProvider): Promise<boolean>;
    updateCircuitBreaker(provider: PaymentProvider, result: 'SUCCESS' | 'FAILURE'): Promise<void>;
    initiateRecoveryProcess(provider: PaymentProvider): Promise<RecoveryResult>;
    predictDowntime(provider: PaymentProvider): Promise<DowntimePrediction>;
    private processReconciliation;
    private initializeCircuitBreakers;
    private startHealthChecking;
    private performHealthChecks;
    private assessStandInRisk;
    private getStandInCapacity;
    private shouldProcessStandIn;
    private generateStandInReasoning;
    private getStandInConditions;
    private getSettlementQueueId;
    private getFailoverStrategy;
    private selectBackupProvider;
    private processStandInTransaction;
    private processFailoverTransaction;
    private getRecoveryProcedure;
    private executeRecoveryStep;
    private verifyProviderHealth;
    private getProviderPerformanceHistory;
    private getCurrentProviderMetrics;
    private analyzeDowntimeRisk;
    private reconcileSettlement;
}
interface FailoverResult {
    success: boolean;
    transactionId: string;
    provider: PaymentProvider;
    processingTime: number;
    isStandIn: boolean;
    error?: string;
}
interface RecoveryResult {
    success: boolean;
    provider: PaymentProvider;
    recoveryTime?: number;
    stepsExecuted: number;
    reconciliationCompleted?: boolean;
    error?: string;
}
interface DowntimePrediction {
    provider: PaymentProvider;
    riskLevel: RiskLevel;
    predictedDowntime: Date | null;
    confidence: number;
    recommendedActions: string[];
    timeToAction: number;
}
export {};
