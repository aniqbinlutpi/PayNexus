"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const database_1 = require("../config/database");
const errorHandler_1 = require("../middleware/errorHandler");
const logger_1 = require("../utils/logger");
const client_1 = require("@prisma/client");
const router = (0, express_1.Router)();
// Get user's accounts
router.get('/accounts', async (req, res, next) => {
    try {
        const userId = req.user.id;
        const accounts = await database_1.prisma.linkedAccount.findMany({
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
    }
    catch (error) {
        next(error);
    }
});
// Get available recipients (other users for demo)
router.get('/recipients', async (req, res, next) => {
    try {
        const userId = req.user.id;
        const recipients = await database_1.prisma.user.findMany({
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
    }
    catch (error) {
        next(error);
    }
});
// Initiate cross-border payment
router.post('/transfer', [
    (0, express_validator_1.body)('recipientId').isString().notEmpty(),
    (0, express_validator_1.body)('amount').isFloat({ min: 0.01 }),
    (0, express_validator_1.body)('currency').isString().isLength({ min: 3, max: 3 }),
    (0, express_validator_1.body)('sourceAccountId').isString().notEmpty(),
    (0, express_validator_1.body)('targetAccountId').isString().notEmpty(),
    (0, express_validator_1.body)('description').optional().isString(),
], async (req, res, next) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            throw new errorHandler_1.CustomError('Validation failed', 400);
        }
        const userId = req.user.id;
        const { recipientId, amount, currency, sourceAccountId, targetAccountId, description } = req.body;
        // Verify source account belongs to user
        const sourceAccount = await database_1.prisma.linkedAccount.findFirst({
            where: {
                id: sourceAccountId,
                userId: userId,
                isActive: true
            },
        });
        if (!sourceAccount) {
            throw new errorHandler_1.CustomError('Source account not found or not accessible', 404);
        }
        // Verify target account exists
        const targetAccount = await database_1.prisma.linkedAccount.findFirst({
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
            throw new errorHandler_1.CustomError('Target account not found', 404);
        }
        // Check if sufficient balance (simplified check)
        if (sourceAccount.balance && sourceAccount.balance < amount) {
            throw new errorHandler_1.CustomError('Insufficient balance', 400);
        }
        // Determine if cross-border
        const isCrossBorder = sourceAccount.currency !== targetAccount.currency;
        // Simple exchange rate simulation
        const exchangeRates = {
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
        const senderTransaction = await database_1.prisma.paymentTransaction.create({
            data: {
                userId: userId,
                amount: amount,
                currency: sourceAccount.currency,
                targetAmount: targetAmount,
                targetCurrency: targetAccount.currency,
                exchangeRate: exchangeRate,
                sourceAccountId: sourceAccountId,
                targetAccountId: targetAccountId,
                status: client_1.TransactionStatus.PROCESSING,
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
        const receiverTransaction = await database_1.prisma.paymentTransaction.create({
            data: {
                userId: targetAccount.userId,
                amount: targetAmount,
                currency: targetAccount.currency,
                targetAmount: targetAmount,
                targetCurrency: targetAccount.currency,
                exchangeRate: exchangeRate,
                sourceAccountId: sourceAccountId,
                targetAccountId: targetAccountId,
                status: client_1.TransactionStatus.PROCESSING,
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
                await database_1.prisma.paymentTransaction.update({
                    where: { id: senderTransaction.id },
                    data: {
                        status: client_1.TransactionStatus.COMPLETED,
                        completedAt: new Date(),
                    },
                });
                await database_1.prisma.paymentTransaction.update({
                    where: { id: receiverTransaction.id },
                    data: {
                        status: client_1.TransactionStatus.COMPLETED,
                        completedAt: new Date(),
                    },
                });
                // Update balances (simplified)
                await database_1.prisma.linkedAccount.update({
                    where: { id: sourceAccountId },
                    data: {
                        balance: {
                            decrement: amount + fee,
                        },
                    },
                });
                await database_1.prisma.linkedAccount.update({
                    where: { id: targetAccountId },
                    data: {
                        balance: {
                            increment: targetAmount,
                        },
                    },
                });
                logger_1.logger.info(`Payment completed: ${senderTransaction.id} -> ${receiverTransaction.id}`);
            }
            catch (error) {
                logger_1.logger.error('Error completing payment:', error);
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
    }
    catch (error) {
        next(error);
    }
});
// Get transaction history
router.get('/history', async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { limit = 10, offset = 0 } = req.query;
        const transactions = await database_1.prisma.paymentTransaction.findMany({
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
            take: parseInt(limit),
            skip: parseInt(offset),
        });
        res.json({
            success: true,
            data: transactions,
        });
    }
    catch (error) {
        next(error);
    }
});
// Get transaction status
router.get('/status/:transactionId', async (req, res, next) => {
    try {
        const { transactionId } = req.params;
        const userId = req.user.id;
        const transaction = await database_1.prisma.paymentTransaction.findFirst({
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
            throw new errorHandler_1.CustomError('Transaction not found', 404);
        }
        res.json({
            success: true,
            data: transaction,
        });
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
//# sourceMappingURL=payments.js.map