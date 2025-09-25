// apps/backend/src/routes/trading.js
const express = require('express');
const router = express.Router();

// Simple validation middleware
const validateRequest = (req, res, next) => {
  // Basic validation - can be enhanced as needed
  next();
};

// Basic route for trading
router.get('/', validateRequest, (req, res) => {
  res.json({
    message: 'trading service is running',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
