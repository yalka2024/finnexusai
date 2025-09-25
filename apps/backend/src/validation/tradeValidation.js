// apps/backend/src/validation/tradeValidation.js
const { check } = require('express-validator');
const validator = require('../utils/validator');

exports.validateTrade = [
  check('portfolioId').isUUID().withMessage('Invalid portfolio ID'),
  check('asset').notEmpty().withMessage('Asset is required'),
  check('amount').isFloat({ gt: 0 }).withMessage('Amount must be greater than 0'),
  check('tradeType')
    .isIn(['buy', 'sell'])
    .withMessage('Trade type must be buy or sell'),
  validator
];
