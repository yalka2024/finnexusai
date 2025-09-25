// apps/backend/src/routes/incidents.js
const express = require('express');
const router = express.Router();

// Simple validation middleware
const validateRequest = (req, res, next) => {
  // Basic validation - can be enhanced as needed
  next();
};

// Basic route for incidents
router.get('/', validateRequest, (req, res) => {
  res.json({
    message: 'incidents service is running',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
