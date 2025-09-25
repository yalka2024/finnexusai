module.exports = async () => {
  // Global teardown for all tests
  console.log('🧹 Starting global test teardown...');
  
  // Stop in-memory MongoDB
  if (global.mongoServer) {
    await global.mongoServer.stop();
  }
  
  // Clear all mocks
  jest.clearAllMocks();
  jest.restoreAllMocks();
  
  console.log('✅ Global test teardown completed');
};

