const logger = require('../../utils/logger');
import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';
import WalletConnect from '../components/WalletConnect';

test('renders wallet connect button', () => {
  render(<WalletConnect />);
  expect(screen.getByText(/Connect Wallet/i)).toBeInTheDocument();
});
