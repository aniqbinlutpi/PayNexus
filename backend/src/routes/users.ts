import { Router } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';

const router = Router();

// Get current user profile
router.get('/profile', async (req: AuthenticatedRequest, res, next) => {
  try {
    res.json({
      success: true,
      data: {
        user: req.user,
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router; 