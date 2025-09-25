const { MongoMemoryServer } = require('mongodb-memory-server');

module.exports = async () => {
  // Global setup for all tests
  console.log('🚀 Starting global test setup...');
  
  // Initialize in-memory MongoDB for testing
  global.mongoServer = new MongoMemoryServer({
    instance: {
      dbName: 'finnexusai_test',
    },
  });
  
  await global.mongoServer.start();
  process.env.MONGODB_TEST_URI = global.mongoServer.getUri();
  
  console.log('✅ Global test setup completed');
};

