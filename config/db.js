const mongoose = require('mongoose');

async function connectDB() {
  const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/idea_analyzer';

  try {
    await mongoose.connect(uri, {
      autoIndex: true
    });
    console.log('✅ MongoDB connected');
  } catch (err) {
    console.error('❌ MongoDB connection error:', err.message);
  }
}

module.exports = connectDB;
