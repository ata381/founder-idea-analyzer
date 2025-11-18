require('dotenv').config();
const path = require('path');
const express = require('express');
const morgan = require('morgan');
const cors = require('cors');
const connectDB = require('./config/db');

const app = express();

// MongoDB bağlantısı
connectDB();

// Middleware'ler
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Basit health-check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', env: process.env.NODE_ENV || 'dev' });
});

// Static public dosyalarını servis et
app.use(express.static(path.join(__dirname, 'public')));

// Root isteklerde index.html döndür
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Server'ı başlat
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
