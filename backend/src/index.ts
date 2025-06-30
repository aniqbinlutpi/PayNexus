import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';

import { logger } from './utils/logger';
import { connectDatabase } from './config/database';
import { connectRedis } from './config/redis';
import { errorHandler } from './middleware/errorHandler';
import { notFoundHandler } from './middleware/notFoundHandler';
import { authMiddleware } from './middleware/auth';

// Import routes
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import accountRoutes from './routes/accounts';
import paymentRoutes from './routes/payments';
import routingRoutes from './routes/routing';
import transactionRoutes from './routes/transactions';
import networkRoutes from './routes/network';

// Import services
import { NetworkMonitorService } from './services/NetworkMonitorService';
import { PaymentProcessorService } from './services/PaymentProcessorService';
import { SocketService } from './services/SocketService';

const app = express();
const server = createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: process.env.SOCKET_IO_CORS_ORIGIN?.split(',') || ['http://localhost:19006'],
    methods: ['GET', 'POST'],
  },
});

const PORT = process.env.PORT || 3000;

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'), // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
});

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000', 'http://localhost:19006'],
  credentials: true,
}));
app.use(compression());
app.use(morgan(process.env.LOG_FORMAT || 'combined'));
app.use(limiter);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

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
app.use('/api/auth', authRoutes);
app.use('/api/users', authMiddleware, userRoutes);
app.use('/api/accounts', authMiddleware, accountRoutes);
app.use('/api/payments', authMiddleware, paymentRoutes);
app.use('/api/routing', authMiddleware, routingRoutes);
app.use('/api/transactions', authMiddleware, transactionRoutes);
app.use('/api/network', authMiddleware, networkRoutes);

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

// Initialize services
async function initializeServices() {
  try {
    // Connect to databases
    await connectDatabase();
    await connectRedis();
    
    // Initialize Socket.IO service
    const socketService = new SocketService(io);
    
    // Initialize payment processor
    const paymentProcessor = new PaymentProcessorService(socketService);
    
    // Initialize network monitor
    const networkMonitor = new NetworkMonitorService();
    await networkMonitor.start();
    
    // Store services in app locals for access in routes
    app.locals.socketService = socketService;
    app.locals.paymentProcessor = paymentProcessor;
    app.locals.networkMonitor = networkMonitor;
    
    logger.info('All services initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize services:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  
  server.close(() => {
    logger.info('HTTP server closed');
  });
  
  // Close database connections
  // Add cleanup logic here
  
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  
  server.close(() => {
    logger.info('HTTP server closed');
  });
  
  process.exit(0);
});

// Start server
async function startServer() {
  try {
    await initializeServices();
    
    server.listen(PORT, () => {
      logger.info(`PayNexus API Server running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV}`);
      logger.info(`Health check: http://localhost:${PORT}/health`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer(); 