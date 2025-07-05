"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.transactionEncryptionMiddleware = exports.amlComplianceMiddleware = exports.riskAssessmentMiddleware = exports.deviceFingerprintMiddleware = void 0;
const crypto_1 = __importDefault(require("crypto"));
const errorHandler_1 = require("./errorHandler");
const database_1 = require("../config/database");
const logger_1 = require("../utils/logger");
// Device fingerprinting middleware
const deviceFingerprintMiddleware = (req, res, next) => {
    try {
        const userAgent = req.get('User-Agent') || '';
        const acceptLanguage = req.get('Accept-Language') || '';
        const acceptEncoding = req.get('Accept-Encoding') || '';
        const ip = req.ip || req.connection.remoteAddress || '';
        // Create device fingerprint
        const fingerprintData = `${userAgent}|${acceptLanguage}|${acceptEncoding}|${ip}`;
        const deviceFingerprint = crypto_1.default.createHash('sha256').update(fingerprintData).digest('hex');
        req.deviceFingerprint = deviceFingerprint;
        next();
    }
    catch (error) {
        logger_1.logger.error('Device fingerprinting failed:', error);
        next(error);
    }
};
exports.deviceFingerprintMiddleware = deviceFingerprintMiddleware;
// Transaction risk assessment middleware
const riskAssessmentMiddleware = async (req, res, next) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return next();
        }
        // Calculate risk score based on multiple factors
        let riskScore = 0;
        // Factor 1: Transaction amount (higher amount = higher risk)
        const amount = req.body.amount || 0;
        if (amount > 10000)
            riskScore += 30;
        else if (amount > 5000)
            riskScore += 20;
        else if (amount > 1000)
            riskScore += 10;
        // Factor 2: Time of transaction (off-hours = higher risk)
        const hour = new Date().getHours();
        if (hour < 6 || hour > 22)
            riskScore += 15;
        // Factor 3: Device fingerprint (new device = higher risk)
        if (req.deviceFingerprint) {
            const recentSession = await database_1.prisma.userSession.findFirst({
                where: {
                    userId,
                    deviceInfo: {
                        path: ['fingerprint'],
                        equals: req.deviceFingerprint
                    }
                },
                orderBy: { createdAt: 'desc' }
            });
            if (!recentSession)
                riskScore += 25; // New device
        }
        // Factor 4: Velocity check (multiple transactions in short time)
        const recentTransactions = await database_1.prisma.paymentTransaction.findMany({
            where: {
                userId,
                createdAt: {
                    gte: new Date(Date.now() - 3600000) // Last hour
                }
            }
        });
        if (recentTransactions.length > 5)
            riskScore += 20;
        else if (recentTransactions.length > 3)
            riskScore += 10;
        // Factor 5: Cross-border transaction
        if (req.body.targetCurrency && req.body.currency !== req.body.targetCurrency) {
            riskScore += 15;
        }
        req.riskScore = riskScore;
        // Block high-risk transactions
        if (riskScore > 70) {
            logger_1.logger.warn(`High-risk transaction blocked for user ${userId}`, {
                riskScore,
                deviceFingerprint: req.deviceFingerprint,
                amount,
                ip: req.ip
            });
            throw new errorHandler_1.CustomError('Transaction blocked due to security concerns. Please contact support.', 403);
        }
        // Require additional verification for medium-risk transactions
        if (riskScore > 40) {
            logger_1.logger.info(`Medium-risk transaction flagged for user ${userId}`, {
                riskScore,
                requiresVerification: true
            });
            // In a real implementation, this would trigger MFA
            res.setHeader('X-Requires-MFA', 'true');
        }
        next();
    }
    catch (error) {
        next(error);
    }
};
exports.riskAssessmentMiddleware = riskAssessmentMiddleware;
// Anti-Money Laundering (AML) middleware
const amlComplianceMiddleware = async (req, res, next) => {
    try {
        const userId = req.user?.id;
        const amount = req.body.amount || 0;
        if (!userId || amount < 1000) {
            return next(); // Skip AML for small transactions
        }
        // Check daily transaction limit
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const dailyTransactions = await database_1.prisma.paymentTransaction.findMany({
            where: {
                userId,
                createdAt: {
                    gte: today
                },
                status: {
                    in: ['COMPLETED', 'PROCESSING']
                }
            }
        });
        const dailyTotal = dailyTransactions.reduce((sum, tx) => sum + tx.amount, 0);
        const newDailyTotal = dailyTotal + amount;
        // AML threshold checks
        const AML_DAILY_LIMIT = 50000; // $50k daily limit
        const AML_SINGLE_LIMIT = 10000; // $10k single transaction limit
        if (newDailyTotal > AML_DAILY_LIMIT) {
            logger_1.logger.warn(`AML daily limit exceeded for user ${userId}`, {
                dailyTotal: newDailyTotal,
                limit: AML_DAILY_LIMIT
            });
            throw new errorHandler_1.CustomError('Daily transaction limit exceeded. Please contact compliance.', 403);
        }
        if (amount > AML_SINGLE_LIMIT) {
            logger_1.logger.warn(`AML single transaction limit exceeded for user ${userId}`, {
                amount,
                limit: AML_SINGLE_LIMIT
            });
            // Create audit log for large transactions
            await database_1.prisma.auditLog.create({
                data: {
                    userId,
                    action: 'LARGE_TRANSACTION_FLAG',
                    resource: 'PAYMENT',
                    details: {
                        amount,
                        currency: req.body.currency,
                        riskScore: req.riskScore,
                        requiresReview: true
                    },
                    ipAddress: req.ip,
                    userAgent: req.get('User-Agent')
                }
            });
            throw new errorHandler_1.CustomError('Transaction amount requires manual review. Please contact compliance.', 403);
        }
        next();
    }
    catch (error) {
        next(error);
    }
};
exports.amlComplianceMiddleware = amlComplianceMiddleware;
// Transaction encryption middleware
const transactionEncryptionMiddleware = (req, res, next) => {
    try {
        // Generate transaction signature for integrity
        if (req.body && req.method === 'POST') {
            const transactionData = JSON.stringify(req.body);
            const signature = crypto_1.default
                .createHmac('sha256', process.env.TRANSACTION_SIGNING_KEY || 'default-key')
                .update(transactionData)
                .digest('hex');
            req.body._signature = signature;
            req.body._timestamp = Date.now();
        }
        next();
    }
    catch (error) {
        logger_1.logger.error('Transaction encryption failed:', error);
        next(error);
    }
};
exports.transactionEncryptionMiddleware = transactionEncryptionMiddleware;
//# sourceMappingURL=securityMiddleware.js.map