// apps/backend/src/database/seeders/seedTrades.js
const { sequelize } = require('../config/database');
const Trade = require('../models/Trade');
const Portfolio = require('../models/Portfolio');

async function seedTrades() {
  await sequelize.sync();
  const portfolio = await Portfolio.findOne({ where: { name: 'Growth Portfolio' } });
  await Trade.bulkCreate([
    {
      userId: portfolio.userId,
      portfolioId: portfolio.id,
      asset: 'BTC',
      amount: 0.1,
      tradeType: 'buy',
      status: 'completed',
      txHash: '0x1234567890abcdef'
    }
  ]);
  logger.info('Trades seeded successfully');
}

seedTrades().catch(logger.error);
