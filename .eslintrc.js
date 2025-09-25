module.exports = {
  env: {
    browser: true,
    es2021: true,
    node: true,
    jest: true,
  },
  extends: [
    'eslint:recommended',
  ],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true,
    },
  },
  rules: {
    'no-console': 'off', // Allow console statements in development
    'no-debugger': 'error',
    'prefer-const': 'error',
    'no-var': 'error',
    'no-unused-vars': 'warn',
    'no-undef': 'error',
    'semi': ['error', 'always'],
    'quotes': ['error', 'single'],
    'indent': ['error', 2],
    'no-case-declarations': 'off',
  },
  overrides: [
    // React/JSX files
    {
      files: ['**/*.jsx', '**/*.js'],
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
      rules: {
        'no-unused-vars': 'off', // Disable for React files as they often have unused imports
        'react/prop-types': 'off', // Disable prop-types validation
        'react/react-in-jsx-scope': 'off', // React 17+ doesn't need React import
      },
      globals: {
        React: 'readonly',
        JSX: 'readonly',
      },
    },
    // Cypress test files
    {
      files: ['**/cypress/**/*.js', '**/*.cy.js'],
      globals: {
        cy: 'readonly',
        Cypress: 'readonly',
        before: 'readonly',
        after: 'readonly',
      },
      rules: {
        'no-undef': 'off',
      },
    },
    // Test files
    {
      files: ['**/*.test.js', '**/*.spec.js', '**/tests/**/*.js'],
      env: {
        jest: true,
      },
      rules: {
        'no-console': 'off',
      },
    },
    // Script files
    {
      files: ['**/scripts/**/*.js', '**/scripts/**/*.ts'],
      rules: {
        'no-console': 'off',
      },
    },
    // Contract files
    {
      files: ['**/contracts/**/*.js', '**/smart-contracts/**/*.js'],
      rules: {
        'no-console': 'off',
      },
    },
    // Mobile React Native files
    {
      files: ['**/mobile/**/*.js', '**/apps/mobile/**/*.js'],
      globals: {
        React: 'readonly',
        __DEV__: 'readonly',
        fetch: 'readonly',
        FormData: 'readonly',
        navigator: 'readonly',
        XMLHttpRequest: 'readonly',
      },
      rules: {
        'no-unused-vars': 'off',
        'no-console': 'off',
      },
    },
    // Web/Next.js files
    {
      files: ['**/web/**/*.js', '**/apps/web/**/*.js', '**/frontend/**/*.js'],
      globals: {
        React: 'readonly',
        JSX: 'readonly',
      },
      rules: {
        'no-unused-vars': 'off',
        'no-console': 'off',
      },
    },
  ],
  ignorePatterns: [
    'node_modules/',
    'dist/',
    'build/',
    'coverage/',
    '*.min.js',
    'public/',
    'FinNexusAI/',
    'apps/frontend/node_modules/',
    'apps/backend/node_modules/',
    'apps/web/node_modules/',
    'apps/mobile/node_modules/',
  ],
};
