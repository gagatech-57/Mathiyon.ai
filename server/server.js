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

// Load env variables
dotenv.config();

// Connect MongoDB Database
connectDB();

const app = express();

// Middleware
app.use(cors({
  origin: '*',
  credentials: true
}));
app.use(express.json());

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/math', mathRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/memory', memoryRoutes);



// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    platform: 'Mathiyon AI Node.js Express API Server',
    database: 'MongoDB',
    timestamp: new Date().toISOString()
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Mathiyon AI Express Backend running on http://localhost:${PORT}`);
  console.log(`🔒 Authentication: JWT + bcryptjs active`);
  console.log(`💬 Chat API: MongoDB persistent chat & messages active`);
  console.log(`🧠 AI Service: Python PyTorch bridge connected`);
});
