import { Router } from 'express';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth';
import { OpenFinanceIntegrationService } from '../services/OpenFinanceIntegrationService';
import { logger } from '../utils/logger';

const router = Router();
const openFinanceService = new OpenFinanceIntegrationService();

// Get unified balance view across all linked accounts
router.get('/balance-view', authMiddleware, async (req: AuthenticatedRequest, res) => {
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
  } catch (error) {
    logger.error('Failed to get unified balance view:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to retrieve unified balance view' 
    });
  }
});

// Generate smart payment suggestions
router.post('/payment-suggestions', authMiddleware, async (req: AuthenticatedRequest, res) => {
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
  } catch (error) {
    logger.error('Failed to generate smart payment suggestions:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to generate payment suggestions' 
    });
  }
});

export default router; 