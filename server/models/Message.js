const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  conversationId: {
    type: String,
    required: true,
    index: true,
  },
  userId: {
    type: String,
    required: true,
    index: true,
  },
  message: {
    type: String,
    required: true,
  },
  response: {
    type: String,
    required: true,
  },
  model: {
    type: String,
    default: 'Mathiyon Neural v4.0',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Compound index for fast authorized history query
messageSchema.index({ conversationId: 1, userId: 1, createdAt: -1 });

module.exports = mongoose.model('Message', messageSchema);
