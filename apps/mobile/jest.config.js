module.exports = {
  preset: 'react-native',
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|@react-navigation|@testing-library/react-native)/)'
  ],
  // setupFiles: ['<rootDir>/node_modules/react-native-gesture-handler/jestSetup.js'],
  // testEnvironment: 'jsdom',
};
