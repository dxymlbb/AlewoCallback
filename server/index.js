import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import morgan from 'morgan';
import { connectDatabase } from './config/database.js';
import { startCleanupService } from './utils/cleanupService.js';
import { startSubdomainCleanup } from './utils/subdomainCleanupService.js';
import { startDNSServer } from './services/dnsServer.js';
import { captureCallback } from './middleware/callbackHandler.js';
import jwt from 'jsonwebtoken';

// Routes
import authRoutes from './routes/auth.js';
import subdomainRoutes from './routes/subdomains.js';
import callbackRoutes from './routes/callbacks.js';
import scriptRoutes from './routes/scripts.js';
import interactionRoutes from './routes/interactions.js';

// Load environment variables
dotenv.config();

// Initialize express app
const app = express();
const httpServer = createServer(app);
// CORS configuration
const corsOptions = {
  origin: process.env.NODE_ENV === 'production'
    ? (origin, callback) => {
        // In production, allow same origin and configured origins
        const allowedOrigins = process.env.ALLOWED_ORIGINS
          ? process.env.ALLOWED_ORIGINS.split(',')
          : [];

        // Allow same-origin requests (frontend served from same server)
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(null, true); // Allow for callback service (needs to accept from anywhere)
        }
      }
    : '*', // Development: allow all
  credentials: true
};

const io = new Server(httpServer, {
  cors: corsOptions
});

// Store io instance in app
app.set('io', io);

// Middleware
app.use(helmet({
  contentSecurityPolicy: false // Allow scripts for callback testing
}));

app.use(cors(corsOptions));

app.use(morgan('dev'));

// Body parsing middleware - order matters!
// 1. Parse JSON content
app.use(express.json({ limit: '10mb' }));
// 2. Parse URL-encoded forms
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
// 3. Parse text for other content types (excluding JSON and urlencoded)
app.use(express.text({
  type: ['text/*', 'application/xml', 'application/xhtml+xml'],
  limit: '10mb'
}));
// 4. Capture raw body for any remaining content types
app.use(express.raw({
  type: (req) => {
    // Accept anything that wasn't already parsed
    return !req.is('json') && !req.is('urlencoded') && !req.is('text/*');
  },
  limit: '10mb'
}));

// Rate limiting for API routes
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Socket.IO authentication
io.use((socket, next) => {
  const token = socket.handshake.auth.token;

  if (!token) {
    return next(new Error('Authentication error'));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = decoded.id;
    next();
  } catch (error) {
    next(new Error('Authentication error'));
  }
});

// Socket.IO connection
io.on('connection', (socket) => {
  console.log(`✓ Client connected: ${socket.id} (User: ${socket.userId})`);

  // Join user-specific room
  socket.join(`user_${socket.userId}`);

  socket.on('disconnect', () => {
    console.log(`✗ Client disconnected: ${socket.id}`);
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Apply callback handler to ALL routes (must be before API routes)
// This captures callbacks from subdomains
app.use(captureCallback);

// API Routes (only for main domain)
app.use('/api/auth', apiLimiter, authRoutes);
app.use('/api/subdomains', apiLimiter, subdomainRoutes);
app.use('/api/callbacks', apiLimiter, callbackRoutes);
app.use('/api/scripts', apiLimiter, scriptRoutes);
app.use('/api/interactions', apiLimiter, interactionRoutes);

// Serve static files from React app (production)
if (process.env.NODE_ENV === 'production') {
  app.use(express.static('client/dist'));

  app.get('*', (req, res) => {
    res.sendFile('index.html', { root: 'client/dist' });
  });
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    message: err.message || 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err : {}
  });
});

// Start server with proper async initialization
const PORT = process.env.PORT || 3000;

const startServer = async () => {
  try {
    // 1. Connect to database FIRST
    console.log('📦 Connecting to MongoDB...');
    await connectDatabase();

    // 2. Start cleanup services after database is ready
    console.log('🧹 Starting cleanup services...');
    startCleanupService();
    startSubdomainCleanup();

    // 3. Start HTTP server
    await new Promise((resolve) => {
      httpServer.listen(PORT, () => {
        console.log('\n========================================');
        console.log(`🚀 AlewoCallback Server Running`);
        console.log(`========================================`);
        console.log(`HTTP Port: ${PORT}`);
        console.log(`DNS Port: ${process.env.DNS_PORT || 53}`);
        console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
        console.log(`Base Domain: ${process.env.BASE_DOMAIN || 'callback.local'}`);
        console.log(`SSL Enabled: ${process.env.SSL_ENABLED || 'false'}`);
        console.log(`========================================\n`);
        resolve();
      });
    });

    // 4. Start DNS Server LAST (after everything is ready)
    console.log('🌐 Starting DNS server...');
    startDNSServer(io);

    console.log('✅ All services started successfully!\n');
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Start the server
startServer();

export default app;
