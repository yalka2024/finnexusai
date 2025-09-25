// apps/backend/src/utils/validator.js

// Optional imports - application will work without these dependencies
let validationResult = null;

try {
  const expressValidator = require('express-validator');
  validationResult = expressValidator.validationResult;
} catch (error) {
  // Express-validator not available - validation will be limited
  // Provide a fallback validationResult function
  validationResult = (req) => ({
    isEmpty: () => true,
    array: () => []
  });
}

const validator = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

module.exports = validator;
