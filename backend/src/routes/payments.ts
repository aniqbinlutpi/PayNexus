import { Router, Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import { prisma } from '../config/database';
import { CustomError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';
import { TransactionStatus, PaymentProvider } from '@prisma/client';

const router = Router();

// Get user's accounts
router.get('/accounts', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user.id;
    
    const accounts = await prisma.linkedAccount.findMany({
      where: { 
        userId: userId,
        isActive: true 
      },
      select: {
        id: true,
        accountType: true,
        provider: true,
        accountNumber: true,
        accountName: true,
        currency: true,
        balance: true,
        isPrimary: true,
      },
    });

    res.json({
      success: true,
      data: accounts,
    });
  } catch (error) {
    next(error);
  }
});

// Get available recipients (other users for demo)
router.get('/recipients', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user.id;
    
    const recipients = await prisma.user.findMany({
      where: { 
        id: { not: userId } // Exclude current user
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        countryCode: true,
        linkedAccounts: {
          where: { isActive: true },
          select: {
            id: true,
            provider: true,
            currency: true,
            accountName: true,
          },
        },
      },
    });

    res.json({
      success: true,
      data: recipients,
    });
  } catch (error) {
    next(error);
  }
});

// Initiate cross-border payment
router.post('/transfer', [
  body('recipientId').isString().notEmpty(),
  body('amount').isFloat({ min: 0.01 }),
  body('currency').isString().isLength({ min: 3, max: 3 }),
  body('sourceAccountId').isString().notEmpty(),
  body('targetAccountId').isString().notEmpty(),
  body('description').optional().isString(),
], async (req: Request, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new CustomError('Validation failed', 400);
    }

    const userId = (req as any).user.id;
    const { recipientId, amount, currency, sourceAccountId, targetAccountId, description } = req.body;

    // Verify source account belongs to user
    const sourceAccount = await prisma.linkedAccount.findFirst({
      where: { 
        id: sourceAccountId,
        userId: userId,
        isActive: true 
      },
    });

    if (!sourceAccount) {
      throw new CustomError('Source account not found or not accessible', 404);
    }

    // Verify target account exists
    const targetAccount = await prisma.linkedAccount.findFirst({
      where: { 
        id: targetAccountId,
        isActive: true 
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            countryCode: true,
          },
        },
      },
    });

    if (!targetAccount) {
      throw new CustomError('Target account not found', 404);
    }

    // Check if sufficient balance (simplified check)
    if (sourceAccount.balance && sourceAccount.balance < amount) {
      throw new CustomError('Insufficient balance', 400);
    }

    // Determine if cross-border
    const isCrossBorder = sourceAccount.currency !== targetAccount.currency;
    
    // Simple exchange rate simulation
    const exchangeRates: { [key: string]: number } = {
      'MYR_THB': 8.2,
      'THB_MYR': 0.122,
      'MYR_SGD': 0.32,
      'SGD_MYR': 3.125,
      'THB_SGD': 0.039,
      'SGD_THB': 25.6,
    };

    let targetAmount = amount;
    let exchangeRate = 1.0;
    let fee = 0.0;

    if (isCrossBorder) {
      const rateKey = `${sourceAccount.currency}_${targetAccount.currency}`;
      exchangeRate = exchangeRates[rateKey] || 1.0;
      targetAmount = amount * exchangeRate;
      fee = amount * 0.025; // 2.5% cross-border fee
    }

    // Create payment transaction for sender
    const senderTransaction = await prisma.paymentTransaction.create({
      data: {
        userId: userId,
        amount: amount,
        currency: sourceAccount.currency,
        targetAmount: targetAmount,
        targetCurrency: targetAccount.currency,
        exchangeRate: exchangeRate,
        sourceAccountId: sourceAccountId,
        targetAccountId: targetAccountId,
        status: TransactionStatus.PROCESSING,
        merchantName: `${targetAccount.user.firstName} ${targetAccount.user.lastName}`,
        merchantCategory: 'P2P Transfer',
        merchantLocation: `${targetAccount.user.countryCode}`,
        metadata: {
          originalAmount: amount,
          originalCurrency: sourceAccount.currency,
          fee: fee,
          description: description || 'Money transfer',
          isCrossBorder: isCrossBorder,
          routingPath: isCrossBorder ? 
            `${sourceAccount.provider} -> FX -> ${targetAccount.provider}` : 
            `${sourceAccount.provider} -> ${targetAccount.provider}`,
          transactionType: 'SENT',
        },
      },
      include: {
        sourceAccount: {
          select: {
            provider: true,
            currency: true,
            accountName: true,
          },
        },
        targetAccount: {
          select: {
            provider: true,
            currency: true,
            accountName: true,
            user: {
              select: {
                firstName: true,
                lastName: true,
                countryCode: true,
              },
            },
          },
        },
      },
    });

    // Create corresponding transaction for receiver
    const receiverTransaction = await prisma.paymentTransaction.create({
      data: {
        userId: targetAccount.userId,
        amount: targetAmount,
        currency: targetAccount.currency,
        targetAmount: targetAmount,
        targetCurrency: targetAccount.currency,
        exchangeRate: exchangeRate,
        sourceAccountId: sourceAccountId,
        targetAccountId: targetAccountId,
        status: TransactionStatus.PROCESSING,
        merchantName: `${sourceAccount.accountName}`,
        merchantCategory: 'P2P Transfer',
        merchantLocation: `${sourceAccount.currency}`,
        metadata: {
          originalAmount: amount,
          originalCurrency: sourceAccount.currency,
          fee: 0, // Receiver doesn't pay fees
          description: description || 'Money transfer',
          isCrossBorder: isCrossBorder,
          routingPath: isCrossBorder ? 
            `${sourceAccount.provider} -> FX -> ${targetAccount.provider}` : 
            `${sourceAccount.provider} -> ${targetAccount.provider}`,
          transactionType: 'RECEIVED',
          linkedTransactionId: senderTransaction.id,
        },
      },
    });

    const transaction = senderTransaction;

    // Simulate processing delay and update to completed
    setTimeout(async () => {
      try {
        // Update both sender and receiver transactions
        await prisma.paymentTransaction.update({
          where: { id: senderTransaction.id },
          data: {
            status: TransactionStatus.COMPLETED,
            completedAt: new Date(),
          },
        });

        await prisma.paymentTransaction.update({
          where: { id: receiverTransaction.id },
          data: {
            status: TransactionStatus.COMPLETED,
            completedAt: new Date(),
          },
        });

        // Update balances (simplified)
        await prisma.linkedAccount.update({
          where: { id: sourceAccountId },
          data: {
            balance: {
              decrement: amount + fee,
            },
          },
        });

        await prisma.linkedAccount.update({
          where: { id: targetAccountId },
          data: {
            balance: {
              increment: targetAmount,
            },
          },
        });

        logger.info(`Payment completed: ${senderTransaction.id} -> ${receiverTransaction.id}`);
      } catch (error) {
        logger.error('Error completing payment:', error);
      }
    }, 2000); // 2 second processing time

    res.json({
      success: true,
      data: {
        transactionId: transaction.id,
        status: 'PROCESSING',
        amount: amount,
        currency: sourceAccount.currency,
        targetAmount: targetAmount,
        targetCurrency: targetAccount.currency,
        exchangeRate: exchangeRate,
        fee: fee,
        recipient: {
          name: `${targetAccount.user.firstName} ${targetAccount.user.lastName}`,
          country: targetAccount.user.countryCode,
          provider: targetAccount.provider,
        },
        estimatedCompletion: '2-3 seconds',
        routingPath: transaction.metadata,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Get transaction history
router.get('/history', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user.id;
    const { limit = 10, offset = 0 } = req.query;

    const transactions = await prisma.paymentTransaction.findMany({
      where: { userId: userId },
      include: {
        sourceAccount: {
          select: {
            provider: true,
            currency: true,
            accountName: true,
          },
        },
        targetAccount: {
          select: {
            provider: true,
            currency: true,
            accountName: true,
            user: {
              select: {
                firstName: true,
                lastName: true,
                countryCode: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit as string),
      skip: parseInt(offset as string),
    });

    res.json({
      success: true,
      data: transactions,
    });
  } catch (error) {
    next(error);
  }
});

// Get transaction status
router.get('/status/:transactionId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { transactionId } = req.params;
    const userId = (req as any).user.id;

    const transaction = await prisma.paymentTransaction.findFirst({
      where: { 
        id: transactionId,
        userId: userId 
      },
      include: {
        sourceAccount: {
          select: {
            provider: true,
            currency: true,
          },
        },
        targetAccount: {
          select: {
            provider: true,
            currency: true,
            user: {
              select: {
                firstName: true,
                lastName: true,
                countryCode: true,
              },
            },
          },
        },
      },
    });

    if (!transaction) {
      throw new CustomError('Transaction not found', 404);
    }

    res.json({
      success: true,
      data: transaction,
    });
  } catch (error) {
    next(error);
  }
});

export default router; 