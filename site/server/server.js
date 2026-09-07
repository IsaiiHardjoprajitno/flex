/**
 * Express Application Entry Point
 * Staff Attendance & Field Work Order Tracking System
 */

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');

// Import route modules
const staffRoutes = require('./routes/staffRoutes');
const attendanceRoutes = require('./routes/attendanceRoutes');
const teamRoutes = require('./routes/teamRoutes');
const reportRoutes = require('./routes/reportRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// ── Middleware ───────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.originalUrl}`);
  next();
});

// ── API Routes ──────────────────────────────────────────────────────────────
app.use('/api/staff', staffRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/reports', reportRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── Serve static client files in production ─────────────────────────────────
app.use(express.static(path.join(__dirname, '..', 'client')));
app.use(express.static(path.join(__dirname, '..')));

// Clean legal routes
app.get(['/terms', '/terms.html'], (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'client', 'terms.html'));
});

app.get(['/privacy', '/privacy.html'], (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'client', 'privacy.html'));
});

// Catch-all: serve client index.html for SPA routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'client', 'index.html'));
});

// ── Centralized Error Handling Middleware ────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('[ERROR]', err.message);
  console.error(err.stack);

  res.status(err.statusCode || 500).json({
    success: false,
    error: err.message || 'Internal Server Error',
  });
});

// ── Start Server ────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n========================================`);
  console.log(`  FieldOps API Server`);
  console.log(`  Running on http://localhost:${PORT}`);
  console.log(`  API Base: http://localhost:${PORT}/api`);
  console.log(`========================================\n`);
});

module.exports = app;
