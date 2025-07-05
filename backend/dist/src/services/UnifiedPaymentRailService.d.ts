import { PaymentProvider } from '@prisma/client';
export interface PaymentRequest {
    amount: number;
    fromCurrency: string;
    toCurrency: string;
    fromProvider: PaymentProvider;
    toProvider: PaymentProvider;
    urgency: PaymentUrgency;
    userPreferences: UserPreferences;
}
export interface OptimalRoute {
    steps: RouteStep[];
    totalCost: number;
    totalTime: number;
    reliability: number;
    reasoning: string;
    alternatives: AlternativeRoute[];
}
export interface RouteStep {
    stepId: string;
    provider: PaymentProvider;
    action: RouteAction;
    amount: number;
    currency: string;
    estimatedTime: number;
    fee: number;
    reliability: number;
    fallbackOptions: FallbackOption[];
}
export interface AlternativeRoute {
    route: RouteStep[];
    tradeoff: string;
    savings: number;
    timeImpact: number;
}
export interface FallbackOption {
    provider: PaymentProvider;
    action: RouteAction;
    conditions: string[];
    reliability: number;
}
export interface ProtocolTranslation {
    fromProtocol: PaymentProtocol;
    toProtocol: PaymentProtocol;
    mappingRules: ProtocolMapping[];
    validationRules: ValidationRule[];
}
export interface LiquidityStrategy {
    primarySource: PaymentProvider;
    backupSources: PaymentProvider[];
    rebalancingTriggers: RebalancingTrigger[];
    optimizationTarget: 'COST' | 'SPEED' | 'RELIABILITY';
}
export declare enum PaymentUrgency {
    INSTANT = "INSTANT",// <30 seconds
    FAST = "FAST",// <5 minutes
    STANDARD = "STANDARD",// <1 hour
    ECONOMY = "ECONOMY"
}
export declare enum RouteAction {
    DEBIT = "DEBIT",
    CREDIT = "CREDIT",
    CONVERT = "CONVERT",
    BRIDGE = "BRIDGE",
    VALIDATE = "VALIDATE"
}
export declare enum PaymentProtocol {
    ISO20022 = "ISO20022",
    SWIFT = "SWIFT",
    FEDNOW = "FEDNOW",
    FASTER_PAYMENTS = "FASTER_PAYMENTS",
    SEPA = "SEPA",
    UPI = "UPI",
    PROMPTPAY = "PROMPTPAY",
    DUITNOW = "DUITNOW",
    PAYNOW = "PAYNOW"
}
export interface UserPreferences {
    prioritizeSpeed: boolean;
    prioritizeCost: boolean;
    trustedProviders: PaymentProvider[];
    avoidProviders: PaymentProvider[];
    maxAcceptableFee: number;
    maxAcceptableTime: number;
}
export interface ProtocolMapping {
    sourceField: string;
    targetField: string;
    transformFunction?: string;
    validationRules: string[];
}
export interface ValidationRule {
    field: string;
    rule: string;
    errorMessage: string;
}
export interface RebalancingTrigger {
    condition: string;
    threshold: number;
    action: string;
}
export declare class UnifiedPaymentRailService {
    routePayment(request: PaymentRequest): Promise<OptimalRoute>;
    translateProtocol(from: PaymentProtocol, to: PaymentProtocol): Promise<ProtocolTranslation>;
    optimizeLiquidity(amount: number, currency: string): Promise<LiquidityStrategy>;
    aggregateProviders(): Promise<ProviderNetwork>;
    getSmartRoutingRecommendation(request: PaymentRequest, userHistory: any[]): Promise<SmartRoutingRecommendation>;
    private getAvailableProviders;
    private generateRoutes;
    private scoreRoutes;
    private selectOptimalRoute;
    private addFallbackOptions;
    private calculateReliability;
    private getSupportedCurrencies;
    private getCurrentCapacity;
    private supportsDirectTransfer;
    private calculateDirectFee;
    private generateCrossCurrencyRoutes;
    private generateMultiHopRoutes;
    private calculateProviderPreferenceScore;
    private generateTradeoffDescription;
    private generateReasoningText;
    private canHandleStep;
    private analyzeUserPatterns;
    private getMarketConditions;
    private generateAIRecommendation;
    private getProtocolTranslationRules;
    private analyzeLiquidityStatus;
    private determineLiquidityStrategy;
    private getProviderCapabilities;
    private calculateTotalCapacity;
    private calculateNetworkHealth;
}
interface ProviderNetwork {
    providers: Map<PaymentProvider, ProviderCapabilities>;
    totalCapacity: number;
    lastUpdated: Date;
    healthScore: number;
}
interface ProviderCapabilities {
    maxTransactionAmount: number;
    supportedCurrencies: string[];
    supportedProtocols: PaymentProtocol[];
    averageProcessingTime: number;
    feeStructure: FeeStructure;
}
interface FeeStructure {
    baseFee: number;
    percentageFee: number;
    crossBorderFee: number;
    currencyConversionFee: number;
}
interface SmartRoutingRecommendation {
    recommendedRoute: OptimalRoute;
    confidence: number;
    reasoning: string;
    marketInsights: string[];
    userInsights: string[];
}
export {};
