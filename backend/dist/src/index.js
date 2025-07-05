"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const compression_1 = __importDefault(require("compression"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const logger_1 = require("./utils/logger");
const database_1 = require("./config/database");
const redis_1 = require("./config/redis");
const errorHandler_1 = require("./middleware/errorHandler");
const notFoundHandler_1 = require("./middleware/notFoundHandler");
const auth_1 = require("./middleware/auth");
const securityMiddleware_1 = require("./middleware/securityMiddleware");
// Import routes
const auth_2 = __importDefault(require("./routes/auth"));
const users_1 = __importDefault(require("./routes/users"));
const accounts_1 = __importDefault(require("./routes/accounts"));
const payments_1 = __importDefault(require("./routes/payments"));
const routing_1 = __importDefault(require("./routes/routing"));
const transactions_1 = __importDefault(require("./routes/transactions"));
const network_1 = __importDefault(require("./routes/network"));
const security_1 = __importDefault(require("./routes/security"));
const openfinance_1 = __importDefault(require("./routes/openfinance"));
// Import services
const NetworkMonitorService_1 = require("./services/NetworkMonitorService");
const PaymentProcessorService_1 = require("./services/PaymentProcessorService");
const SocketService_1 = require("./services/SocketService");
const app = (0, express_1.default)();
const server = (0, http_1.createServer)(app);
const io = new socket_io_1.Server(server, {
    cors: {
        origin: process.env.SOCKET_IO_CORS_ORIGIN?.split(',') || ['http://localhost:19006'],
        methods: ['GET', 'POST'],
    },
});
const PORT = process.env.PORT || 3000;
// Rate limiting
const limiter = (0, express_rate_limit_1.default)({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'), // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.',
});
// Middleware
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)({
    origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000', 'http://localhost:19006'],
    credentials: true,
}));
app.use((0, compression_1.default)());
app.use((0, morgan_1.default)(process.env.LOG_FORMAT || 'combined'));
app.use(limiter);
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV,
    });
});
// API Routes
app.use('/api/auth', auth_2.default);
app.use('/api/users', auth_1.authMiddleware, users_1.default);
app.use('/api/accounts', auth_1.authMiddleware, accounts_1.default);
app.use('/api/payments', auth_1.authMiddleware, securityMiddleware_1.deviceFingerprintMiddleware, securityMiddleware_1.riskAssessmentMiddleware, securityMiddleware_1.amlComplianceMiddleware, securityMiddleware_1.transactionEncryptionMiddleware, payments_1.default);
app.use('/api/routing', auth_1.authMiddleware, routing_1.default);
app.use('/api/transactions', auth_1.authMiddleware, transactions_1.default);
app.use('/api/network', auth_1.authMiddleware, network_1.default);
app.use('/api/security', auth_1.authMiddleware, security_1.default);
app.use('/api/openfinance', auth_1.authMiddleware, openfinance_1.default);
// Error handling
app.use(notFoundHandler_1.notFoundHandler);
app.use(errorHandler_1.errorHandler);
// Initialize services
async function initializeServices() {
    try {
        // Connect to databases
        await (0, database_1.connectDatabase)();
        await (0, redis_1.connectRedis)();
        // Initialize Socket.IO service
        const socketService = new SocketService_1.SocketService(io);
        // Initialize payment processor
        const paymentProcessor = new PaymentProcessorService_1.PaymentProcessorService(socketService);
        // Initialize network monitor
        const networkMonitor = new NetworkMonitorService_1.NetworkMonitorService();
        await networkMonitor.start();
        // Store services in app locals for access in routes
        app.locals.socketService = socketService;
        app.locals.paymentProcessor = paymentProcessor;
        app.locals.networkMonitor = networkMonitor;
        logger_1.logger.info('All services initialized successfully');
    }
    catch (error) {
        logger_1.logger.error('Failed to initialize services:', error);
        process.exit(1);
    }
}
// Graceful shutdown
process.on('SIGTERM', async () => {
    logger_1.logger.info('SIGTERM received, shutting down gracefully');
    server.close(() => {
        logger_1.logger.info('HTTP server closed');
    });
    // Close database connections
    // Add cleanup logic here
    process.exit(0);
});
process.on('SIGINT', async () => {
    logger_1.logger.info('SIGINT received, shutting down gracefully');
    server.close(() => {
        logger_1.logger.info('HTTP server closed');
    });
    process.exit(0);
});
// Start server
async function startServer() {
    try {
        await initializeServices();
        server.listen(PORT, () => {
            logger_1.logger.info(`PayNexus API Server running on port ${PORT}`);
            logger_1.logger.info(`Environment: ${process.env.NODE_ENV}`);
            logger_1.logger.info(`Health check: http://localhost:${PORT}/health`);
        });
    }
    catch (error) {
        logger_1.logger.error('Failed to start server:', error);
        process.exit(1);
    }
}
startServer();
//# sourceMappingURL=index.js.map