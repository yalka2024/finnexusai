// apps/backend/src/routes/social-trading-rooms.js
const express = require('express');
const router = express.Router();

// Simple validation middleware
const validateRequest = (req, res, next) => {
  // Basic validation - can be enhanced as needed
  next();
};

// Basic route for social-trading-rooms
router.get('/', validateRequest, (req, res) => {
  res.json({
    message: 'social-trading-rooms service is running',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
