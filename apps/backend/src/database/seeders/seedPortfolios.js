// apps/backend/src/database/seeders/seedPortfolios.js
const { sequelize } = require('../config/database');
const Portfolio = require('../models/Portfolio');
const User = require('../models/User');

async function seedPortfolios() {
  await sequelize.sync();
  const user = await User.findOne({ where: { email: 'test@example.com' } });
  await Portfolio.bulkCreate([
    {
      userId: user.id,
      name: 'Growth Portfolio',
      assets: { BTC: 1.5, ETH: 10 }
    }
  ]);
  logger.info('Portfolios seeded successfully');
}

seedPortfolios().catch(logger.error);
