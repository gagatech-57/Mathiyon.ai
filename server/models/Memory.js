const mongoose = require('mongoose');

const MemorySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['conversation', 'preference', 'project', 'instruction'],
      default: 'preference',
    },
    content: {
      type: String,
      required: [true, 'Memory content is required'],
      trim: true,
    },
    source: {
      type: String,
      default: 'chat',
    },
    importance: {
      type: Number,
      default: 1,
      min: 1,
      max: 5,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for fast authorized lookup
MemorySchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('Memory', MemorySchema);
