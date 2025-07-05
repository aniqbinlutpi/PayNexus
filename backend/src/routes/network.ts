import { Router } from 'express';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth';
import { NetworkMonitorService } from '../services/NetworkMonitorService';
import { logger } from '../utils/logger';

const router = Router();
const networkService = new NetworkMonitorService();

// Get network status for all payment providers
router.get('/status', authMiddleware, async (req: AuthenticatedRequest, res) => {
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
  } catch (error) {
    logger.error('Failed to get network status:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to retrieve network status' 
    });
  }
});

// Get regional network statistics
router.get('/regional-stats', authMiddleware, async (req: AuthenticatedRequest, res) => {
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
  } catch (error) {
    logger.error('Failed to get regional stats:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to retrieve regional statistics' 
    });
  }
});

export default router; 