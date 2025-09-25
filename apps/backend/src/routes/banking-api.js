// apps/backend/src/routes/banking-api.js
const express = require('express');
const router = express.Router();

// Simple validation middleware
const validateRequest = (req, res, next) => {
  // Basic validation - can be enhanced as needed
  next();
};

// Basic route for banking-api
router.get('/', validateRequest, (req, res) => {
  res.json({
    message: 'banking-api service is running',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
