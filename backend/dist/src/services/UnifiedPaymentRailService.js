"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UnifiedPaymentRailService = exports.PaymentProtocol = exports.RouteAction = exports.PaymentUrgency = void 0;
const database_1 = require("../config/database");
const logger_1 = require("../utils/logger");
var PaymentUrgency;
(function (PaymentUrgency) {
    PaymentUrgency["INSTANT"] = "INSTANT";
    PaymentUrgency["FAST"] = "FAST";
    PaymentUrgency["STANDARD"] = "STANDARD";
    PaymentUrgency["ECONOMY"] = "ECONOMY"; // <24 hours
})(PaymentUrgency || (exports.PaymentUrgency = PaymentUrgency = {}));
var RouteAction;
(function (RouteAction) {
    RouteAction["DEBIT"] = "DEBIT";
    RouteAction["CREDIT"] = "CREDIT";
    RouteAction["CONVERT"] = "CONVERT";
    RouteAction["BRIDGE"] = "BRIDGE";
    RouteAction["VALIDATE"] = "VALIDATE";
})(RouteAction || (exports.RouteAction = RouteAction = {}));
var PaymentProtocol;
(function (PaymentProtocol) {
    PaymentProtocol["ISO20022"] = "ISO20022";
    PaymentProtocol["SWIFT"] = "SWIFT";
    PaymentProtocol["FEDNOW"] = "FEDNOW";
    PaymentProtocol["FASTER_PAYMENTS"] = "FASTER_PAYMENTS";
    PaymentProtocol["SEPA"] = "SEPA";
    PaymentProtocol["UPI"] = "UPI";
    PaymentProtocol["PROMPTPAY"] = "PROMPTPAY";
    PaymentProtocol["DUITNOW"] = "DUITNOW";
    PaymentProtocol["PAYNOW"] = "PAYNOW";
})(PaymentProtocol || (exports.PaymentProtocol = PaymentProtocol = {}));
class UnifiedPaymentRailService {
    async routePayment(request) {
        try {
            logger_1.logger.info('UPR: Routing payment request', { request });
            // 1. Analyze available providers and their current status
            const availableProviders = await this.getAvailableProviders(request);
            // 2. Generate possible routes
            const possibleRoutes = await this.generateRoutes(request, availableProviders);
            // 3. Score and rank routes based on user preferences
            const scoredRoutes = await this.scoreRoutes(possibleRoutes, request.userPreferences);
            // 4. Select optimal route with fallback options
            const optimalRoute = this.selectOptimalRoute(scoredRoutes);
            // 5. Add fallback mechanisms for each step
            await this.addFallbackOptions(optimalRoute, availableProviders);
            logger_1.logger.info('UPR: Optimal route selected', {
                routeId: optimalRoute.steps[0]?.stepId,
                totalCost: optimalRoute.totalCost,
                totalTime: optimalRoute.totalTime
            });
            return optimalRoute;
        }
        catch (error) {
            logger_1.logger.error('UPR: Payment routing failed', error);
            throw error;
        }
    }
    async translateProtocol(from, to) {
        try {
            logger_1.logger.info('UPR: Translating payment protocol', { from, to });
            // Load protocol translation rules from database
            const translationRules = await this.getProtocolTranslationRules(from, to);
            if (!translationRules) {
                throw new Error(`No translation rules found for ${from} -> ${to}`);
            }
            return {
                fromProtocol: from,
                toProtocol: to,
                mappingRules: translationRules.mappingRules,
                validationRules: translationRules.validationRules
            };
        }
        catch (error) {
            logger_1.logger.error('UPR: Protocol translation failed', error);
            throw error;
        }
    }
    async optimizeLiquidity(amount, currency) {
        try {
            logger_1.logger.info('UPR: Optimizing liquidity', { amount, currency });
            // Analyze current liquidity across providers
            const liquidityStatus = await this.analyzeLiquidityStatus(currency);
            // Determine optimal liquidity strategy
            const strategy = this.determineLiquidityStrategy(amount, currency, liquidityStatus);
            return strategy;
        }
        catch (error) {
            logger_1.logger.error('UPR: Liquidity optimization failed', error);
            throw error;
        }
    }
    async aggregateProviders() {
        try {
            logger_1.logger.info('UPR: Aggregating provider network');
            const providers = await database_1.prisma.paymentNetworkStatus.findMany({
                where: { isOnline: true }
            });
            const networkMap = new Map();
            for (const provider of providers) {
                const capabilities = await this.getProviderCapabilities(provider.provider);
                networkMap.set(provider.provider, capabilities);
            }
            return {
                providers: networkMap,
                totalCapacity: this.calculateTotalCapacity(networkMap),
                lastUpdated: new Date(),
                healthScore: this.calculateNetworkHealth(networkMap)
            };
        }
        catch (error) {
            logger_1.logger.error('UPR: Provider aggregation failed', error);
            throw error;
        }
    }
    // Smart routing with AI-powered decision making
    async getSmartRoutingRecommendation(request, userHistory) {
        try {
            // Analyze user's historical preferences
            const userPattern = this.analyzeUserPatterns(userHistory);
            // Get current market conditions
            const marketConditions = await this.getMarketConditions(request.fromCurrency, request.toCurrency);
            // Generate AI-powered recommendation
            const recommendation = await this.generateAIRecommendation(request, userPattern, marketConditions);
            return recommendation;
        }
        catch (error) {
            logger_1.logger.error('UPR: Smart routing recommendation failed', error);
            throw error;
        }
    }
    // Private helper methods
    async getAvailableProviders(request) {
        const networkStatus = await database_1.prisma.paymentNetworkStatus.findMany({
            where: { isOnline: true }
        });
        return networkStatus.map(status => ({
            provider: status.provider,
            isOnline: status.isOnline,
            responseTime: status.responseTime,
            reliability: this.calculateReliability(status),
            supportedCurrencies: this.getSupportedCurrencies(status.provider),
            currentCapacity: this.getCurrentCapacity(status.provider)
        }));
    }
    async generateRoutes(request, providers) {
        const routes = [];
        // Direct route (same currency)
        if (request.fromCurrency === request.toCurrency) {
            const directProviders = providers.filter(p => this.supportsDirectTransfer(p.provider, request.fromCurrency));
            for (const provider of directProviders) {
                routes.push({
                    steps: [{
                            stepId: `direct-${provider.provider}`,
                            provider: provider.provider,
                            action: RouteAction.CREDIT,
                            amount: request.amount,
                            currency: request.fromCurrency,
                            estimatedTime: provider.responseTime,
                            fee: this.calculateDirectFee(provider.provider, request.amount),
                            reliability: provider.reliability,
                            fallbackOptions: []
                        }],
                    totalCost: this.calculateDirectFee(provider.provider, request.amount),
                    totalTime: provider.responseTime,
                    reliability: provider.reliability,
                    type: 'DIRECT'
                });
            }
        }
        // Cross-currency routes
        if (request.fromCurrency !== request.toCurrency) {
            const fxRoutes = await this.generateCrossCurrencyRoutes(request, providers);
            routes.push(...fxRoutes);
        }
        // Multi-hop routes for optimization
        const multiHopRoutes = await this.generateMultiHopRoutes(request, providers);
        routes.push(...multiHopRoutes);
        return routes;
    }
    async scoreRoutes(routes, preferences) {
        return routes.map(route => {
            let score = 0;
            // Cost scoring
            const costScore = preferences.prioritizeCost ?
                Math.max(0, 100 - (route.totalCost / preferences.maxAcceptableFee) * 100) : 50;
            // Speed scoring
            const speedScore = preferences.prioritizeSpeed ?
                Math.max(0, 100 - (route.totalTime / preferences.maxAcceptableTime) * 100) : 50;
            // Reliability scoring
            const reliabilityScore = route.reliability * 100;
            // Provider preference scoring
            const providerScore = this.calculateProviderPreferenceScore(route, preferences);
            // Weighted final score
            score = (costScore * 0.3) + (speedScore * 0.3) + (reliabilityScore * 0.3) + (providerScore * 0.1);
            return {
                ...route,
                score,
                breakdown: {
                    cost: costScore,
                    speed: speedScore,
                    reliability: reliabilityScore,
                    provider: providerScore
                }
            };
        }).sort((a, b) => b.score - a.score);
    }
    selectOptimalRoute(scoredRoutes) {
        const best = scoredRoutes[0];
        const alternatives = scoredRoutes.slice(1, 4).map(route => ({
            route: route.steps,
            tradeoff: this.generateTradeoffDescription(best, route),
            savings: best.totalCost - route.totalCost,
            timeImpact: route.totalTime - best.totalTime
        }));
        return {
            steps: best.steps,
            totalCost: best.totalCost,
            totalTime: best.totalTime,
            reliability: best.reliability,
            reasoning: this.generateReasoningText(best),
            alternatives
        };
    }
    async addFallbackOptions(route, providers) {
        for (const step of route.steps) {
            const fallbacks = providers
                .filter(p => p.provider !== step.provider)
                .filter(p => this.canHandleStep(p, step))
                .slice(0, 2) // Top 2 fallback options
                .map(p => ({
                provider: p.provider,
                action: step.action,
                conditions: [`Primary provider ${step.provider} unavailable`],
                reliability: p.reliability
            }));
            step.fallbackOptions = fallbacks;
        }
    }
    // Additional helper methods would be implemented here...
    calculateReliability(status) {
        // Implementation for reliability calculation
        return 0.95; // Placeholder
    }
    getSupportedCurrencies(provider) {
        // Implementation for getting supported currencies
        return ['MYR', 'THB', 'SGD', 'USD']; // Placeholder
    }
    getCurrentCapacity(provider) {
        // Implementation for getting current capacity
        return 1000000; // Placeholder
    }
    supportsDirectTransfer(provider, currency) {
        // Implementation for checking direct transfer support
        return true; // Placeholder
    }
    calculateDirectFee(provider, amount) {
        // Implementation for calculating direct transfer fee
        return amount * 0.01; // Placeholder
    }
    async generateCrossCurrencyRoutes(request, providers) {
        // Implementation for cross-currency route generation
        return []; // Placeholder
    }
    async generateMultiHopRoutes(request, providers) {
        // Implementation for multi-hop route generation
        return []; // Placeholder
    }
    calculateProviderPreferenceScore(route, preferences) {
        // Implementation for provider preference scoring
        return 50; // Placeholder
    }
    generateTradeoffDescription(best, alternative) {
        // Implementation for tradeoff description generation
        return "Alternative route with different cost/speed profile"; // Placeholder
    }
    generateReasoningText(route) {
        // Implementation for reasoning text generation
        return "Selected based on optimal balance of cost, speed, and reliability"; // Placeholder
    }
    canHandleStep(provider, step) {
        // Implementation for checking if provider can handle step
        return true; // Placeholder
    }
    analyzeUserPatterns(userHistory) {
        // Implementation for user pattern analysis
        return {}; // Placeholder
    }
    async getMarketConditions(fromCurrency, toCurrency) {
        // Implementation for getting market conditions
        return {}; // Placeholder
    }
    async generateAIRecommendation(request, userPattern, marketConditions) {
        // Implementation for AI recommendation generation
        return {}; // Placeholder
    }
    async getProtocolTranslationRules(from, to) {
        // Implementation for getting protocol translation rules
        return null; // Placeholder
    }
    async analyzeLiquidityStatus(currency) {
        // Implementation for liquidity status analysis
        return {}; // Placeholder
    }
    determineLiquidityStrategy(amount, currency, liquidityStatus) {
        // Implementation for liquidity strategy determination
        return {}; // Placeholder
    }
    async getProviderCapabilities(provider) {
        // Implementation for getting provider capabilities
        return {}; // Placeholder
    }
    calculateTotalCapacity(networkMap) {
        // Implementation for calculating total network capacity
        return 0; // Placeholder
    }
    calculateNetworkHealth(networkMap) {
        // Implementation for calculating network health score
        return 0.95; // Placeholder
    }
}
exports.UnifiedPaymentRailService = UnifiedPaymentRailService;
//# sourceMappingURL=UnifiedPaymentRailService.js.map