require('dotenv').config();

// Ensure LLM defaults are always present so the stronger Ollama model is used without manual exports.
process.env.LLM_PROVIDER = process.env.LLM_PROVIDER || 'ollama';
process.env.OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3.1:8b';
const path = require('path');
const express = require('express');
const morgan = require('morgan');
const cors = require('cors');
const connectDB = require('./config/db');

const app = express();

connectDB();

app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

app.use('/api/ideas', require('./routes/ideas'));
// Admin routes (guarded endpoints)
app.use('/api/admin', require('./routes/admin'));

app.get('/health', (req, res) => {
  res.json({ status: 'ok', env: process.env.NODE_ENV || 'dev' });
});

app.use(express.static(path.join(__dirname, 'public')));

app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
