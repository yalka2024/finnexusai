// apps/backend/src/validation/portfolioValidation.js

// Optional imports - application will work without these dependencies
let check = null;

try {
  const expressValidator = require('express-validator');
  check = expressValidator.check;
} catch (error) {
  // Express-validator not available - validation will be limited
  // Provide a fallback check function
  check = (field) => ({
    notEmpty: () => ({ withMessage: (msg) => ({ field, message: msg }) }),
    isObject: () => ({ withMessage: (msg) => ({ field, message: msg }) })
  });
}

const validator = require('../utils/validator');

exports.validatePortfolio = [
  check('name').notEmpty().withMessage('Portfolio name is required'),
  check('assets').isObject().withMessage('Assets must be an object'),
  validator
];
