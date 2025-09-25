// apps/backend/src/middleware/rateLimiter.js
const rateLimit = require('express-rate-limit');
const { rateLimit: config } = require('../config/security');

module.exports = rateLimit(config);
