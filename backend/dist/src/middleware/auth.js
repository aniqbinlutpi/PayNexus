"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authMiddleware = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const errorHandler_1 = require("./errorHandler");
const database_1 = require("../config/database");
const authMiddleware = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw new errorHandler_1.CustomError('Access token is required', 401);
        }
        const token = authHeader.substring(7); // Remove 'Bearer ' prefix
        if (!token) {
            throw new errorHandler_1.CustomError('Access token is required', 401);
        }
        // Verify token
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        // Check if user exists
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
        // Add user to request
        req.user = user;
        next();
    }
    catch (error) {
        if (error instanceof jsonwebtoken_1.default.JsonWebTokenError) {
            next(new errorHandler_1.CustomError('Invalid access token', 401));
        }
        else {
            next(error);
        }
    }
};
exports.authMiddleware = authMiddleware;
//# sourceMappingURL=auth.js.map