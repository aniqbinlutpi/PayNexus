"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = exports.CustomError = void 0;
const logger_1 = require("../utils/logger");
class CustomError extends Error {
    constructor(message, statusCode, isOperational = true) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = isOperational;
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.CustomError = CustomError;
const errorHandler = (error, req, res, next) => {
    const { statusCode = 500, message } = error;
    // Log error
    logger_1.logger.error('Error occurred:', {
        error: message,
        statusCode,
        stack: error.stack,
        url: req.url,
        method: req.method,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
    });
    // Send error response
    res.status(statusCode).json({
        success: false,
        error: {
            code: statusCode,
            message: statusCode === 500 ? 'Internal Server Error' : message,
            timestamp: new Date().toISOString(),
            ...(process.env.NODE_ENV === 'development' && { stack: error.stack }),
        },
    });
};
exports.errorHandler = errorHandler;
//# sourceMappingURL=errorHandler.js.map