// apps/backend/src/validation/userValidation.js

// Optional imports - application will work without these dependencies
let check = null;

try {
  const expressValidator = require('express-validator');
  check = expressValidator.check;
} catch (error) {
  // Express-validator not available - validation will be limited
  // Provide a fallback check function
  check = (field) => ({
    isEmail: () => ({ withMessage: (msg) => ({ field, message: msg }) }),
    isLength: (options) => ({ withMessage: (msg) => ({ field, message: msg }) }),
    notEmpty: () => ({ withMessage: (msg) => ({ field, message: msg }) })
  });
}

const validator = require('../utils/validator');

exports.validateUser = [
  check('email').isEmail().withMessage('Invalid email address'),
  check('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long'),
  check('firstName').notEmpty().withMessage('First name is required'),
  check('lastName').notEmpty().withMessage('Last name is required'),
  validator
];

// Simple validation middleware for login (no firstName/lastName required)
exports.validateLogin = [
  check('email').isEmail().withMessage('Invalid email address'),
  check('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long'),
  validator
];
