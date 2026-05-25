require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/certforge';

// Middleware
app.use(cors({
  origin: [
    'http://localhost:3000',
    'https://cert-forge-mu.vercel.app'  // replace with your actual Vercel URL
  ],
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use('/public', express.static(path.join(__dirname, 'public')));// Static files
const uploadsDir = path.join(__dirname, 'uploads');
const outputDir = path.join(__dirname, 'output');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
app.use('/uploads', express.static(uploadsDir));
app.use('/output', express.static(outputDir));

// Routes
app.use('/api/templates', require('./routes/templates'));
app.use('/api/certificates', require('./routes/certificates'));
app.use('/api/bulk', require('./routes/bulk'));

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok', message: 'CertForge API running' }));

// Connect to MongoDB and start server
mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('✅ MongoDB connected');
    app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err.message);
    console.log('Starting server without DB (templates will use defaults)...');
    app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT} (no DB)`));
  });

module.exports = app;
