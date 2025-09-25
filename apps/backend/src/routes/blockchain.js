// apps/backend/src/routes/blockchain.js
const express = require('express');
const router = express.Router();

// Simple validation middleware
const validateRequest = (req, res, next) => {
  // Basic validation - can be enhanced as needed
  next();
};

// Basic route for blockchain
router.get('/', validateRequest, (req, res) => {
  res.json({
    message: 'blockchain service is running',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
