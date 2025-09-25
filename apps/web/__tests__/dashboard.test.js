const logger = require('../../utils/logger');
import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';
import Dashboard from '../pages/dashboard';

// Mock useAuth hook
jest.mock('../components/AuthProvider', () => ({
  useAuth: () => ({ user: { name: 'Test User' }, logout: jest.fn() })
}));

test('renders dashboard widgets', () => {
  render(<Dashboard />);
  expect(screen.getAllByText(/Portfolio/i).length).toBeGreaterThan(0);
  expect(screen.getByText(/Fraud Alerts/i)).toBeInTheDocument();
  expect(screen.getByText(/Compliance/i)).toBeInTheDocument();
  expect(screen.getByText(/DeFAI Yields/i)).toBeInTheDocument();
  expect(screen.getByText(/Market Insights/i)).toBeInTheDocument();
  expect(screen.getByText(/Advanced Analytics/i)).toBeInTheDocument();
  expect(screen.getAllByText(/Leaderboard/i).length).toBeGreaterThan(0);
  expect(screen.getByText(/Alice - \$1.2M/i)).toBeInTheDocument();
  expect(screen.getByText(/Bob - \$950K/i)).toBeInTheDocument();
  expect(screen.getByText(/Carol - \$800K/i)).toBeInTheDocument();
});