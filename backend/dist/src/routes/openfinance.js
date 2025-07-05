"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const OpenFinanceIntegrationService_1 = require("../services/OpenFinanceIntegrationService");
const logger_1 = require("../utils/logger");
const router = (0, express_1.Router)();
const openFinanceService = new OpenFinanceIntegrationService_1.OpenFinanceIntegrationService();
// Get unified balance view across all linked accounts
router.get('/balance-view', auth_1.authMiddleware, async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ error: 'User not authenticated' });
        }
        const unifiedBalance = await openFinanceService.getUnifiedBalanceView(userId);
        res.json({
            success: true,
            data: unifiedBalance
        });
    }
    catch (error) {
        logger_1.logger.error('Failed to get unified balance view:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve unified balance view'
        });
    }
});
// Generate smart payment suggestions
router.post('/payment-suggestions', auth_1.authMiddleware, async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ error: 'User not authenticated' });
        }
        const context = {
            ...req.body,
            userId
        };
        const suggestions = await openFinanceService.generateSmartPaymentSuggestions(context);
        res.json({
            success: true,
            data: suggestions
        });
    }
    catch (error) {
        logger_1.logger.error('Failed to generate smart payment suggestions:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to generate payment suggestions'
        });
    }
});
exports.default = router;
//# sourceMappingURL=openfinance.js.map