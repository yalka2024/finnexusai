// apps/backend/src/routes/gnn.js
const express = require('express');
const router = express.Router();

// Simple validation middleware
const validateRequest = (req, res, next) => {
  // Basic validation - can be enhanced as needed
  next();
};

// Basic route for gnn
router.get('/', validateRequest, (req, res) => {
  res.json({
    message: 'gnn service is running',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
