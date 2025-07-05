export interface SmartRoutingRecommendation {
    recommendedRoute: PaymentRoute;
    reasoning: string;
    estimatedSavings: number;
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
}
export interface PaymentRoute {
    steps: RouteStep[];
    totalCost: number;
    totalTime: number;
    reliability: number;
}
export interface RouteStep {
    provider: string;
    action: 'DEBIT' | 'CREDIT' | 'CONVERT';
    amount: number;
    currency: string;
    fee: number;
    estimatedTime: number;
}
export interface SpendingInsight {
    category: string;
    trend: 'INCREASING' | 'DECREASING' | 'STABLE';
    amount: number;
    prediction: string;
    recommendations: string[];
}
export interface FinancialHealthScore {
    score: number;
    factors: {
        spendingPattern: number;
        savingsRate: number;
        diversification: number;
        riskManagement: number;
    };
    recommendations: string[];
    nextReviewDate: Date;
}
export declare class AIPaymentIntelligenceService {
    getSmartRoutingRecommendation(amount: number, fromCurrency: string, toCurrency: string, userId: string): Promise<SmartRoutingRecommendation>;
    generateSpendingInsights(userId: string): Promise<SpendingInsight[]>;
    calculateFinancialHealthScore(userId: string): Promise<FinancialHealthScore>;
    predictOptimalPaymentTiming(userId: string, amount: number, currency: string): Promise<{
        optimalTime: Date;
        reasoning: string;
        potentialSavings: number;
        riskFactors: string[];
    }>;
    generateAutomatedBudgetRecommendations(userId: string): Promise<{
        budgetCategories: {
            category: string;
            recommendedLimit: number;
            currentSpending: number;
        }[];
        savingsGoals: {
            goal: string;
            targetAmount: number;
            timeframe: string;
            monthlyContribution: number;
        }[];
        investmentSuggestions: string[];
    }>;
    private getUserTransactionHistory;
    private generateRoutingOptions;
    private selectBestRoute;
    private generateReasoning;
    private categorizeTransactions;
    private getExchangeRateHistory;
    private getUserPaymentPatterns;
    private getNetworkCongestionPatterns;
    private predictOptimalTiming;
    private getPreferredTransactionHours;
    private calculateReliabilityByHour;
    private calculateRecommendedBudgetLimit;
    private generateSavingsGoals;
    private generateInvestmentSuggestions;
}
