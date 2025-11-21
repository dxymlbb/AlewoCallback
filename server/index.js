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
const io = new Server(httpServer, {
  cors: {
    origin: process.env.NODE_ENV === 'production' ? false : '*',
    credentials: true
  }
});

// Store io instance in app
app.set('io', io);

// Connect to database
connectDatabase();

// Start cleanup services
startCleanupService();
startSubdomainCleanup();

// Middleware
app.use(helmet({
  contentSecurityPolicy: false // Allow scripts for callback testing
}));

app.use(cors({
  origin: process.env.NODE_ENV === 'production' ? false : '*',
  credentials: true
}));

app.use(morgan('dev'));

// Body parsing middleware with raw body capture
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.text({ type: '*/*', limit: '10mb' }));

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

// Start server
const PORT = process.env.PORT || 3000;

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

  // Start DNS Server after HTTP server is ready
  startDNSServer(io);
});

export default app;
