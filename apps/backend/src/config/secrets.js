// apps/backend/src/config/secrets.js
require('dotenv').config();

module.exports = {
  jwtSecret: process.env.JWT_SECRET || 'your_jwt_secret_here',
  apiKey: process.env.API_KEY || 'your_api_key_here',
  blockchainProvider: process.env.BLOCKCHAIN_PROVIDER || 'https://mainnet.infura.io/v3/YOUR_INFURA_KEY'
};
