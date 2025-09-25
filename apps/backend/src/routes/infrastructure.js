// apps/backend/src/routes/infrastructure.js
const express = require('express');
const router = express.Router();

// Simple validation middleware
const validateRequest = (req, res, next) => {
  // Basic validation - can be enhanced as needed
  next();
};

// Basic route for infrastructure
router.get('/', validateRequest, (req, res) => {
  res.json({
    message: 'infrastructure service is running',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
