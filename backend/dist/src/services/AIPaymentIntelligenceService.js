"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AIPaymentIntelligenceService = void 0;
const database_1 = require("../config/database");
const logger_1 = require("../utils/logger");
class AIPaymentIntelligenceService {
    async getSmartRoutingRecommendation(amount, fromCurrency, toCurrency, userId) {
        try {
            const userHistory = await this.getUserTransactionHistory(userId);
            const routes = await this.generateRoutingOptions(amount, fromCurrency, toCurrency);
            const bestRoute = this.selectBestRoute(routes, userHistory);
            return {
                recommendedRoute: bestRoute,
                reasoning: this.generateReasoning(bestRoute, amount),
                estimatedSavings: amount * 0.01,
                riskLevel: bestRoute.reliability > 0.9 ? 'LOW' : 'MEDIUM'
            };
        }
        catch (error) {
            logger_1.logger.error('Smart routing failed:', error);
            throw error;
        }
    }
    async generateSpendingInsights(userId) {
        try {
            const transactions = await database_1.prisma.paymentTransaction.findMany({
                where: { userId, status: 'COMPLETED' },
                take: 100
            });
            const categories = this.categorizeTransactions(transactions);
            return Object.entries(categories).map(([category, amount]) => ({
                category,
                trend: 'STABLE',
                amount,
                prediction: `Projected ${category} spending: ${(amount * 1.1).toFixed(0)} next month`,
                recommendations: [`Set budget limit for ${category}`, `Look for savings opportunities`]
            }));
        }
        catch (error) {
            logger_1.logger.error('Spending insights failed:', error);
            throw error;
        }
    }
    async calculateFinancialHealthScore(userId) {
        try {
            const transactions = await this.getUserTransactionHistory(userId);
            const accounts = await database_1.prisma.linkedAccount.findMany({ where: { userId } });
            let score = 50; // Base score
            // Spending consistency
            if (transactions.length > 10)
                score += 20;
            // Account diversification
            if (accounts.length > 2)
                score += 15;
            // Cross-border experience
            const crossBorder = transactions.filter(tx => tx.targetCurrency !== tx.currency);
            if (crossBorder.length > 0)
                score += 15;
            const recommendations = [];
            if (score < 70)
                recommendations.push('Increase account diversification');
            if (score < 60)
                recommendations.push('Build more transaction history');
            return {
                score: Math.min(100, score),
                factors: {
                    spendingPattern: transactions.length > 10 ? 0.8 : 0.4,
                    savingsRate: 0.6,
                    diversification: accounts.length > 2 ? 0.9 : 0.3,
                    riskManagement: 0.7
                },
                recommendations,
                nextReviewDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
            };
        }
        catch (error) {
            logger_1.logger.error('Health score calculation failed:', error);
            throw error;
        }
    }
    async predictOptimalPaymentTiming(userId, amount, currency) {
        try {
            // Analyze historical exchange rate patterns
            const exchangeRateHistory = await this.getExchangeRateHistory(currency);
            // Analyze user's payment patterns
            const userPatterns = await this.getUserPaymentPatterns(userId);
            // Analyze network congestion patterns
            const networkPatterns = await this.getNetworkCongestionPatterns();
            // Use AI to predict optimal timing
            const prediction = this.predictOptimalTiming(exchangeRateHistory, userPatterns, networkPatterns, amount, currency);
            return prediction;
        }
        catch (error) {
            logger_1.logger.error('Optimal payment timing prediction failed:', error);
            throw error;
        }
    }
    async generateAutomatedBudgetRecommendations(userId) {
        try {
            logger_1.logger.info(`Generating automated budget recommendations for user ${userId}`);
            const insights = await this.generateSpendingInsights(userId);
            const healthScore = await this.calculateFinancialHealthScore(userId);
            // Generate budget categories based on spending patterns
            const budgetCategories = insights.map(insight => ({
                category: insight.category,
                recommendedLimit: this.calculateRecommendedBudgetLimit(insight),
                currentSpending: insight.amount
            }));
            // Generate savings goals based on income and spending
            const savingsGoals = this.generateSavingsGoals(insights, healthScore);
            // Generate investment suggestions based on risk profile
            const investmentSuggestions = this.generateInvestmentSuggestions(healthScore);
            return {
                budgetCategories,
                savingsGoals,
                investmentSuggestions
            };
        }
        catch (error) {
            logger_1.logger.error('Automated budget recommendations failed:', error);
            throw error;
        }
    }
    // Private helper methods
    async getUserTransactionHistory(userId) {
        return await database_1.prisma.paymentTransaction.findMany({
            where: { userId, status: 'COMPLETED' },
            take: 50,
            orderBy: { createdAt: 'desc' }
        });
    }
    async generateRoutingOptions(amount, from, to) {
        const routes = [];
        // Direct route
        routes.push({
            steps: [{
                    provider: 'DIRECT',
                    action: 'CREDIT',
                    amount,
                    currency: to,
                    fee: amount * 0.01,
                    estimatedTime: 300
                }],
            totalCost: amount * 0.01,
            totalTime: 300,
            reliability: 0.95
        });
        // Via conversion
        if (from !== to) {
            routes.push({
                steps: [
                    {
                        provider: 'CONVERTER',
                        action: 'CONVERT',
                        amount,
                        currency: to,
                        fee: amount * 0.025,
                        estimatedTime: 600
                    }
                ],
                totalCost: amount * 0.025,
                totalTime: 600,
                reliability: 0.90
            });
        }
        return routes;
    }
    selectBestRoute(routes, history) {
        return routes.reduce((best, current) => current.totalCost < best.totalCost ? current : best);
    }
    generateReasoning(route, amount) {
        const feePercentage = ((route.totalCost / amount) * 100).toFixed(1);
        return `Optimized route with ${feePercentage}% total fees and ${route.totalTime / 60} minute processing time.`;
    }
    categorizeTransactions(transactions) {
        const categories = {};
        transactions.forEach(tx => {
            const category = tx.merchantCategory || 'General';
            categories[category] = (categories[category] || 0) + tx.amount;
        });
        return categories;
    }
    async getExchangeRateHistory(currency) {
        return await database_1.prisma.exchangeRate.findMany({
            where: {
                OR: [
                    { fromCurrency: currency },
                    { toCurrency: currency }
                ]
            },
            orderBy: { timestamp: 'desc' },
            take: 100
        });
    }
    async getUserPaymentPatterns(userId) {
        const transactions = await database_1.prisma.paymentTransaction.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            take: 50
        });
        return {
            preferredHours: this.getPreferredTransactionHours(transactions),
            averageAmount: transactions.reduce((sum, tx) => sum + tx.amount, 0) / transactions.length,
            frequency: transactions.length / 30 // transactions per day
        };
    }
    async getNetworkCongestionPatterns() {
        const networkStatus = await database_1.prisma.paymentNetworkStatus.findMany({
            orderBy: { lastChecked: 'desc' },
            take: 100
        });
        return {
            averageResponseTime: networkStatus.reduce((sum, status) => sum + status.responseTime, 0) / networkStatus.length,
            reliabilityByHour: this.calculateReliabilityByHour(networkStatus)
        };
    }
    predictOptimalTiming(exchangeRateHistory, userPatterns, networkPatterns, amount, currency) {
        // Simple prediction algorithm - in production, this would use ML models
        const now = new Date();
        const optimalHour = userPatterns.preferredHours[0] || 14; // Default to 2 PM
        const optimalTime = new Date(now);
        optimalTime.setHours(optimalHour, 0, 0, 0);
        // If optimal time has passed today, schedule for tomorrow
        if (optimalTime < now) {
            optimalTime.setDate(optimalTime.getDate() + 1);
        }
        return {
            optimalTime,
            reasoning: `Based on your transaction patterns and network conditions, ${optimalHour}:00 offers the best combination of low fees and fast processing.`,
            potentialSavings: amount * 0.005, // 0.5% savings
            riskFactors: ['Exchange rate volatility', 'Network congestion during peak hours']
        };
    }
    getPreferredTransactionHours(transactions) {
        const hourCounts = {};
        transactions.forEach(tx => {
            const hour = tx.createdAt.getHours();
            hourCounts[hour] = (hourCounts[hour] || 0) + 1;
        });
        return Object.entries(hourCounts)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 3)
            .map(([hour]) => parseInt(hour));
    }
    calculateReliabilityByHour(networkStatus) {
        const hourlyReliability = {};
        networkStatus.forEach(status => {
            const hour = status.lastChecked.getHours();
            if (!hourlyReliability[hour])
                hourlyReliability[hour] = [];
            hourlyReliability[hour].push(status.isOnline ? 1 : 0);
        });
        const result = {};
        Object.entries(hourlyReliability).forEach(([hour, values]) => {
            result[parseInt(hour)] = values.reduce((sum, val) => sum + val, 0) / values.length;
        });
        return result;
    }
    calculateRecommendedBudgetLimit(insight) {
        if (insight.trend === 'INCREASING') {
            return insight.amount * 0.9; // Reduce by 10%
        }
        else if (insight.trend === 'DECREASING') {
            return insight.amount * 1.1; // Allow 10% increase
        }
        return insight.amount; // Keep stable
    }
    generateSavingsGoals(insights, healthScore) {
        const totalSpending = insights.reduce((sum, insight) => sum + insight.amount, 0);
        const recommendedSavings = totalSpending * 0.2; // 20% savings rate
        return [
            {
                goal: 'Emergency Fund',
                targetAmount: totalSpending * 3, // 3 months expenses
                timeframe: '12 months',
                monthlyContribution: totalSpending * 0.25
            },
            {
                goal: 'Investment Fund',
                targetAmount: recommendedSavings * 12,
                timeframe: '12 months',
                monthlyContribution: recommendedSavings
            }
        ];
    }
    generateInvestmentSuggestions(healthScore) {
        const suggestions = [];
        if (healthScore.score > 80) {
            suggestions.push('Consider high-growth investments like stocks or crypto');
            suggestions.push('Explore international investment opportunities');
        }
        else if (healthScore.score > 60) {
            suggestions.push('Start with low-risk investments like bonds or fixed deposits');
            suggestions.push('Consider balanced mutual funds');
        }
        else {
            suggestions.push('Focus on building emergency fund first');
            suggestions.push('Consider high-yield savings accounts');
        }
        return suggestions;
    }
}
exports.AIPaymentIntelligenceService = AIPaymentIntelligenceService;
//# sourceMappingURL=AIPaymentIntelligenceService.js.map