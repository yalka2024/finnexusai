// apps/backend/src/routes/mobile-app.js
const express = require('express');
const router = express.Router();

// Simple validation middleware
const validateRequest = (req, res, next) => {
  // Basic validation - can be enhanced as needed
  next();
};

// Basic route for mobile-app
router.get('/', validateRequest, (req, res) => {
  res.json({
    message: 'mobile-app service is running',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
