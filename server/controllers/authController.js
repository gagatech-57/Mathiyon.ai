const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = require('../models/User');

// Fallback in-memory user store for instant testing if MongoDB server is offline
const memoryUsers = [];

const generateToken = (id, email, name) => {
  return jwt.sign(
    { id, email, name },
    process.env.JWT_SECRET || 'mathiyon_secret_jwt_key_2026_super_secure_987654321',
    { expiresIn: '30d' }
  );
};

// @desc    Register new user
// @route   POST /api/auth/register
// @access  Public
const registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide all required fields' });
    }

    const isMongoConnected = mongoose.connection.readyState === 1;
    const lowerEmail = email.toLowerCase().trim();

    if (isMongoConnected) {
      const userExists = await User.findOne({ email: lowerEmail });
      if (userExists) {
        return res.status(400).json({ success: false, message: 'User already exists with this email' });
      }

      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      const user = await User.create({
        name,
        email: lowerEmail,
        password: hashedPassword,
      });

      const token = generateToken(user._id, user.email, user.name);

      return res.status(201).json({
        success: true,
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
        },
      });
    } else {
      // Memory Store fallback
      const existingUser = memoryUsers.find((u) => u.email === lowerEmail);
      if (existingUser) {
        return res.status(400).json({ success: false, message: 'User already exists with this email' });
      }

      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);
      const newUser = {
        id: 'user_' + Date.now(),
        name,
        email: lowerEmail,
        password: hashedPassword,
      };
      memoryUsers.push(newUser);

      const token = generateToken(newUser.id, newUser.email, newUser.name);

      return res.status(201).json({
        success: true,
        token,
        user: {
          id: newUser.id,
          name: newUser.name,
          email: newUser.email,
        },
      });
    }
  } catch (error) {
    console.error('Register Error:', error);
    res.status(500).json({ success: false, message: error.message || 'Server Error' });
  }
};

// @desc    Authenticate user & get token
// @route   POST /api/auth/login
// @access  Public
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide email and password' });
    }

    const isMongoConnected = mongoose.connection.readyState === 1;
    const lowerEmail = email.toLowerCase().trim();

    if (isMongoConnected) {
      let user = await User.findOne({ email: lowerEmail });
      
      // Auto-create demo developer user in MongoDB if requested
      if (!user && (lowerEmail === 'developer@mathiyon.ai' || lowerEmail === 'mathiyon1.0@mathiyon.ai')) {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        user = await User.create({
          name: lowerEmail === 'developer@mathiyon.ai' ? 'Mathiyon Developer' : 'Mathiyon 1.0',
          email: lowerEmail,
          password: hashedPassword,
        });
      }

      if (!user) {
        return res.status(401).json({ success: false, message: 'Invalid credentials' });
      }

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(401).json({ success: false, message: 'Invalid credentials' });
      }

      const token = generateToken(user._id, user.email, user.name);

      return res.json({
        success: true,
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
        },
      });
    } else {
      // Memory Store fallback
      let user = memoryUsers.find((u) => u.email === lowerEmail);

      // Create default demo user if logging in with demo account
      if (!user && lowerEmail === 'developer@mathiyon.ai') {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        user = {
          id: 'demo_123',
          name: 'Mathiyon Developer',
          email: lowerEmail,
          password: hashedPassword,
        };
        memoryUsers.push(user);
      }

      if (!user) {
        return res.status(401).json({ success: false, message: 'Invalid credentials' });
      }

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(401).json({ success: false, message: 'Invalid credentials' });
      }

      const token = generateToken(user.id, user.email, user.name);

      return res.json({
        success: true,
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
        },
      });
    }
  } catch (error) {
    console.error('Login Error:', error);
    res.status(500).json({ success: false, message: error.message || 'Server Error' });
  }
};

// @desc    Get current user profile
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res) => {
  try {
    return res.json({
      success: true,
      user: {
        id: req.user.id,
        name: req.user.name,
        email: req.user.email,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  registerUser,
  loginUser,
  getMe,
};
