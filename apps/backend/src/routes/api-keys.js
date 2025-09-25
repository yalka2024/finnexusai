// apps/backend/src/routes/api-keys.js
const express = require('express');
const router = express.Router();

// Simple validation middleware
const validateRequest = (req, res, next) => {
  // Basic validation - can be enhanced as needed
  next();
};

// Basic route for api-keys
router.get('/', validateRequest, (req, res) => {
  res.json({
    message: 'api-keys service is running',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
