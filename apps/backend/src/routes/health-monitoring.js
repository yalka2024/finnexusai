// apps/backend/src/routes/health-monitoring.js
const express = require('express');
const router = express.Router();

// Simple validation middleware
const validateRequest = (req, res, next) => {
  // Basic validation - can be enhanced as needed
  next();
};

// Basic route for health-monitoring
router.get('/', validateRequest, (req, res) => {
  res.json({
    message: 'health-monitoring service is running',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
