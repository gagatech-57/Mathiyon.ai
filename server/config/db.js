const mongoose = require('mongoose');

const getMongoUri = () => {
  if (process.env.MONGODB_URI || process.env.MONGO_URI) {
    return process.env.MONGODB_URI || process.env.MONGO_URI;
  }

  if (process.env.MONGODB_USERNAME && process.env.MONGODB_PASSWORD) {
    const host = process.env.MONGODB_HOST || 'cluster0.1dmmmky.mongodb.net';
    const dbName = process.env.MONGODB_DB_NAME || 'mathiyon_ai';
    const username = encodeURIComponent(process.env.MONGODB_USERNAME);
    const password = encodeURIComponent(process.env.MONGODB_PASSWORD);
    return `mongodb+srv://${username}:${password}@${host}/${dbName}?retryWrites=true&w=majority`;
  }

  return 'mongodb://127.0.0.1:27017/mathiyon_ai';
};

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(getMongoUri(), {
      serverSelectionTimeoutMS: 3000,
    });
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    return true;
  } catch (error) {
    console.warn(`⚠️ MongoDB connection warning (${error.message}). Running with hybrid memory persistence.`);
    return false;
  }
};

module.exports = connectDB;
