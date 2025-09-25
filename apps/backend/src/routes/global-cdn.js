// apps/backend/src/routes/global-cdn.js
const express = require('express');
const router = express.Router();

// Simple validation middleware
const validateRequest = (req, res, next) => {
  // Basic validation - can be enhanced as needed
  next();
};

// Basic route for global-cdn
router.get('/', validateRequest, (req, res) => {
  res.json({
    message: 'global-cdn service is running',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
