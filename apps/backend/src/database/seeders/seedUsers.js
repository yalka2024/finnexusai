// apps/backend/src/database/seeders/seedUsers.js
const { sequelize } = require('../config/database');
const User = require('../models/User');
const bcrypt = require('bcryptjs');

async function seedUsers() {
  await sequelize.sync({ force: true });
  await User.bulkCreate([
    {
      email: 'admin@example.com',
      password: await bcrypt.hash('admin123', 10),
      firstName: 'Admin',
      lastName: 'User'
    },
    {
      email: 'test@example.com',
      password: await bcrypt.hash('test123', 10),
      firstName: 'Test',
      lastName: 'User'
    }
  ]);
  logger.info('Users seeded successfully');
}

seedUsers().catch(logger.error);
