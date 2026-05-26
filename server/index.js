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
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, curl, Postman)
    if (!origin) return callback(null, true);
    const allowed = [
      'http://localhost:3000',
      'http://localhost:5173',
      'https://cert-forge-mu.vercel.app',
      process.env.FRONTEND_URL,         // set this in Railway env vars
    ].filter(Boolean);
    if (allowed.includes(origin)) return callback(null, true);
    // Also allow any Vercel preview URLs for your project
    if (origin.endsWith('.vercel.app')) return callback(null, true);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));

// Increase limits for base64 image/PDF uploads
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));

// Static files
app.use('/public', express.static(path.join(__dirname, 'public')));

const uploadsDir = path.join(__dirname, 'uploads');
const outputDir  = path.join(__dirname, 'output');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
if (!fs.existsSync(outputDir))  fs.mkdirSync(outputDir,  { recursive: true });
app.use('/uploads', express.static(uploadsDir));
app.use('/output',  express.static(outputDir));

// Routes
app.use('/api/templates',    require('./routes/templates'));
app.use('/api/certificates', require('./routes/certificates'));
app.use('/api/bulk',         require('./routes/bulk'));

// Health check
app.get('/api/health', (req, res) => res.json({
  status: 'ok',
  message: 'CertForge API running',
  env: process.env.NODE_ENV || 'development',
  time: new Date().toISOString()
}));

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.message);
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({ error: 'CORS: origin not allowed' });
  }
  res.status(500).json({ error: err.message || 'Internal server error' });
});

// Connect to MongoDB and start server
mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('✅ MongoDB connected');
    app.listen(PORT, '0.0.0.0', () =>
      console.log(`🚀 Server running on port ${PORT}`)
    );
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err.message);
    console.log('Starting server without DB...');
    app.listen(PORT, '0.0.0.0', () =>
      console.log(`🚀 Server running on port ${PORT} (no DB)`)
    );
  });

module.exports = app;