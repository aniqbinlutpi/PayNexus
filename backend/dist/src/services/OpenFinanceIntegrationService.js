"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenFinanceIntegrationService = void 0;
const database_1 = require("../config/database");
const logger_1 = require("../utils/logger");
class OpenFinanceIntegrationService {
    async getUnifiedBalanceView(userId) {
        try {
            logger_1.logger.info('OFI: Getting unified balance view', { userId });
            const linkedAccounts = await database_1.prisma.linkedAccount.findMany({
                where: { userId, isActive: true },
                include: { user: true }
            });
            const totalBalance = linkedAccounts.reduce((sum, acc) => sum + (acc.balance || 0), 0);
            return {
                userId,
                totalBalance,
                currency: 'MYR',
                accounts: linkedAccounts,
                lastUpdated: new Date()
            };
        }
        catch (error) {
            logger_1.logger.error('OFI: Failed to get unified balance view', error);
            throw error;
        }
    }
    async generateSmartPaymentSuggestions(context) {
        try {
            logger_1.logger.info('OFI: Generating smart payment suggestions');
            return [{
                    suggestionId: 'cost-opt-' + Date.now(),
                    type: 'COST_OPTIMIZATION',
                    title: 'Save 15% on fees',
                    description: 'Use GrabPay for lower fees on this transaction',
                    potentialSavings: context.amount * 0.015,
                    confidence: 0.85,
                    expiresAt: new Date(Date.now() + 3600000)
                }];
        }
        catch (error) {
            logger_1.logger.error('OFI: Failed to generate smart payment suggestions', error);
            throw error;
        }
    }
}
exports.OpenFinanceIntegrationService = OpenFinanceIntegrationService;
//# sourceMappingURL=OpenFinanceIntegrationService.js.map