const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const aiRoutes = require('./routes/aiRoutes');
const chatRoutes = require('./routes/chatRoutes');
const mathRoutes = require('./routes/mathRoutes');
const fileRoutes = require('./routes/fileRoutes');
const memoryRoutes = require('./routes/memoryRoutes');
const observabilityRoutes = require('./routes/observabilityRoutes');

// Load env variables
dotenv.config();

const PORT = Number(process.env.PORT || 5000);
const defaultOrigins = [
  'http://localhost:8645',
  'http://localhost:5173',
  'http://localhost:3000',
  'https://mathiyon-ai.vercel.app',
  'https://mathiyon-ai.onrender.com'
];
const allowedOrigins = (process.env.CORS_ORIGINS || defaultOrigins.join(',')).split(',').map((origin) => origin.trim()).filter(Boolean);
const isOriginAllowed = (origin) => !origin || allowedOrigins.includes(origin) || defaultOrigins.includes(origin);

// Connect MongoDB Database
connectDB();

const app = express();

// Middleware
app.use(cors({
  origin: (origin, callback) => {
    if (isOriginAllowed(origin)) {
      callback(null, true);
      return;
    }
    callback(new Error('CORS origin not allowed'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/math', mathRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/memory', memoryRoutes);
app.use('/api/observability', observabilityRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    platform: 'Mathiyon AI Node.js Express API Server',
    database: 'MongoDB',
    uptimeSeconds: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

app.use((err, req, res, next) => {
  console.error('Express error:', err.message);
  if (err.message === 'CORS origin not allowed') {
    return res.status(403).json({ success: false, message: 'Origin not allowed by CORS policy' });
  }
  return res.status(500).json({ success: false, message: 'Internal server error' });
});

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Mathiyon AI Express Backend running on port ${PORT}`);
  console.log(`🔒 Authentication: JWT + bcryptjs active`);
  console.log(`💬 Chat API: MongoDB persistent chat & messages active`);
  console.log(`🧠 AI Service: Python PyTorch bridge connected`);
});

const shutdown = (signal) => {
  console.log(`Received ${signal}; shutting down gracefully`);
  server.close(() => {
    process.exit(0);
  });
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
