/**
 * Dhaage Designer Boutique - Main Server
 * Express REST API + SQLite database + file uploads.
 */
const path = require('path');
// Load environment variables from server/.env (not the CWD).
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const { db } = require('./db');

const app = express();
const PORT = process.env.PORT || 4000;

// ---------- Middleware ----------
app.use(cors());

// Webhook needs the raw body for signature verification (Express 4: express.raw before json).
app.use('/api/payments/webhook', express.raw({ type: '*/*' }));

app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

// Static uploads
const UPLOAD_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
app.use('/uploads', express.static(UPLOAD_DIR));

// Simple request logger
app.use((req, res, next) => {
  if (process.env.NODE_ENV !== 'production') {
    console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
  }
  next();
});

// ---------- API Routes ----------
app.use('/api/auth', require('./routes/auth'));
app.use('/api/categories', require('./routes/categories'));
app.use('/api/products', require('./routes/products'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/banners', require('./routes/banners'));
app.use('/api/settings', require('./routes/settings'));

// ---------- Health check ----------
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'Dhaage API is running', time: new Date().toISOString() });
});

// ---------- Serve React build in production ----------
const CLIENT_DIST = path.join(__dirname, '..', 'client', 'dist');
if (fs.existsSync(CLIENT_DIST)) {
  app.use(express.static(CLIENT_DIST));
  app.get(/^(?!\/api|\/uploads).*/, (req, res) => {
    res.sendFile(path.join(CLIENT_DIST, 'index.html'));
  });
}

// ---------- Error handler ----------
app.use((err, req, res, next) => {
  console.error('Server error:', err.message);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Something went wrong on the server.'
  });
});

// ---------- Start ----------
app.listen(PORT, () => {
  console.log('========================================');
  console.log('  Dhaage Designer Boutique API running');
  console.log(`  ➜  http://localhost:${PORT}`);
  console.log('========================================');
});

module.exports = app;

