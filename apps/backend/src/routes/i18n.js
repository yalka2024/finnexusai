// apps/backend/src/routes/i18n.js
const express = require('express');
const router = express.Router();

// Simple validation middleware
const validateRequest = (req, res, next) => {
  // Basic validation - can be enhanced as needed
  next();
};

// Basic route for i18n
router.get('/', validateRequest, (req, res) => {
  res.json({
    message: 'i18n service is running',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
