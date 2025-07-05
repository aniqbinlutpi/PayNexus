"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const database_1 = require("../config/database");
const errorHandler_1 = require("../middleware/errorHandler");
const logger_1 = require("../utils/logger");
const router = (0, express_1.Router)();
// Helper function for JWT signing
const signJWT = (payload, secret, expiresIn) => {
    return jsonwebtoken_1.default.sign(payload, secret, { expiresIn });
};
// Register endpoint
router.post('/register', [
    (0, express_validator_1.body)('email').isEmail().normalizeEmail(),
    (0, express_validator_1.body)('password').isLength({ min: 6 }),
    (0, express_validator_1.body)('firstName').trim().isLength({ min: 1 }),
    (0, express_validator_1.body)('lastName').trim().isLength({ min: 1 }),
    (0, express_validator_1.body)('phoneNumber').trim().isLength({ min: 8 }),
    (0, express_validator_1.body)('countryCode').trim().isLength({ min: 2, max: 2 }),
], async (req, res, next) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            throw new errorHandler_1.CustomError('Validation failed', 400);
        }
        const { email, password, firstName, lastName, phoneNumber, countryCode } = req.body;
        // Check if user already exists
        const existingUser = await database_1.prisma.user.findFirst({
            where: {
                OR: [
                    { email },
                    { phoneNumber }
                ]
            }
        });
        if (existingUser) {
            throw new errorHandler_1.CustomError('User already exists with this email or phone number', 409);
        }
        // Hash password
        const passwordHash = await bcryptjs_1.default.hash(password, parseInt(process.env.BCRYPT_ROUNDS || '12'));
        // Create user
        const user = await database_1.prisma.user.create({
            data: {
                email,
                passwordHash,
                firstName,
                lastName,
                phoneNumber,
                countryCode,
            },
            select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                phoneNumber: true,
                countryCode: true,
                createdAt: true,
            },
        });
        // Generate tokens
        const accessToken = signJWT({ userId: user.id }, process.env.JWT_SECRET, process.env.JWT_EXPIRES_IN || '15m');
        const refreshToken = signJWT({ userId: user.id }, process.env.JWT_REFRESH_SECRET, process.env.JWT_REFRESH_EXPIRES_IN || '7d');
        logger_1.logger.info(`New user registered: ${user.email}`);
        res.status(201).json({
            success: true,
            data: {
                user,
                accessToken,
                refreshToken,
            },
        });
    }
    catch (error) {
        next(error);
    }
});
// Login endpoint
router.post('/login', [
    (0, express_validator_1.body)('email').isEmail().normalizeEmail(),
    (0, express_validator_1.body)('password').isLength({ min: 1 }),
], async (req, res, next) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            throw new errorHandler_1.CustomError('Validation failed', 400);
        }
        const { email, password } = req.body;
        // Find user
        const user = await database_1.prisma.user.findUnique({
            where: { email },
            select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                phoneNumber: true,
                countryCode: true,
                passwordHash: true,
                createdAt: true,
            },
        });
        if (!user) {
            throw new errorHandler_1.CustomError('Invalid credentials', 401);
        }
        // Verify password
        const isPasswordValid = await bcryptjs_1.default.compare(password, user.passwordHash);
        if (!isPasswordValid) {
            throw new errorHandler_1.CustomError('Invalid credentials', 401);
        }
        // Generate tokens
        const accessToken = signJWT({ userId: user.id }, process.env.JWT_SECRET, process.env.JWT_EXPIRES_IN || '15m');
        const refreshToken = signJWT({ userId: user.id }, process.env.JWT_REFRESH_SECRET, process.env.JWT_REFRESH_EXPIRES_IN || '7d');
        // Remove password from response
        const { passwordHash, ...userWithoutPassword } = user;
        logger_1.logger.info(`User logged in: ${user.email}`);
        res.json({
            success: true,
            data: {
                user: userWithoutPassword,
                accessToken,
                refreshToken,
            },
        });
    }
    catch (error) {
        next(error);
    }
});
// Refresh token endpoint
router.post('/refresh', [
    (0, express_validator_1.body)('refreshToken').isLength({ min: 1 }),
], async (req, res, next) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            throw new errorHandler_1.CustomError('Refresh token is required', 400);
        }
        const { refreshToken } = req.body;
        // Verify refresh token
        const decoded = jsonwebtoken_1.default.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
        // Find user
        const user = await database_1.prisma.user.findUnique({
            where: { id: decoded.userId },
            select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
            },
        });
        if (!user) {
            throw new errorHandler_1.CustomError('User not found', 401);
        }
        // Generate new access token
        const accessToken = signJWT({ userId: user.id }, process.env.JWT_SECRET, process.env.JWT_EXPIRES_IN || '15m');
        res.json({
            success: true,
            data: {
                accessToken,
            },
        });
    }
    catch (error) {
        if (error instanceof jsonwebtoken_1.default.JsonWebTokenError) {
            next(new errorHandler_1.CustomError('Invalid refresh token', 401));
        }
        else {
            next(error);
        }
    }
});
exports.default = router;
//# sourceMappingURL=auth.js.map