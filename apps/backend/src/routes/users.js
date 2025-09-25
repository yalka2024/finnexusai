// apps/backend/src/routes/users.js
const express = require('express');
const router = express.Router();

// Simple validation middleware
const validateRequest = (req, res, next) => {
  // Basic validation - can be enhanced as needed
  next();
};

// Basic route for users
router.get('/', validateRequest, (req, res) => {
  res.json({
    message: 'users service is running',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
