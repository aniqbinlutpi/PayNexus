"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const NetworkMonitorService_1 = require("../services/NetworkMonitorService");
const logger_1 = require("../utils/logger");
const router = (0, express_1.Router)();
const networkService = new NetworkMonitorService_1.NetworkMonitorService();
// Get network status for all payment providers
router.get('/status', auth_1.authMiddleware, async (req, res) => {
    try {
        // Mock network status for demo
        const networkStatus = [
            { provider: 'DuitNow', status: 'ONLINE', responseTime: 245, successRate: 99.8, region: 'MY' },
            { provider: 'PromptPay', status: 'ONLINE', responseTime: 312, successRate: 99.5, region: 'TH' },
            { provider: 'PayNow', status: 'ONLINE', responseTime: 189, successRate: 99.9, region: 'SG' },
            { provider: 'GrabPay', status: 'ONLINE', responseTime: 156, successRate: 99.7, region: 'ASEAN' },
            { provider: 'QRIS', status: 'DEGRADED', responseTime: 1250, successRate: 95.2, region: 'ID' },
        ];
        res.json({
            success: true,
            data: networkStatus
        });
    }
    catch (error) {
        logger_1.logger.error('Failed to get network status:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve network status'
        });
    }
});
// Get regional network statistics
router.get('/regional-stats', auth_1.authMiddleware, async (req, res) => {
    try {
        // Mock regional stats for demo
        const regionalStats = {
            totalTransactions: 245678,
            totalVolume: 89456723,
            averageProcessingTime: 2.8,
            networkUptime: 99.94,
            countriesConnected: 6,
            providersIntegrated: 25
        };
        res.json({
            success: true,
            data: regionalStats
        });
    }
    catch (error) {
        logger_1.logger.error('Failed to get regional stats:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve regional statistics'
        });
    }
});
exports.default = router;
//# sourceMappingURL=network.js.map