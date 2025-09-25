const logger = require('../../utils/logger');
jest.mock('../components/AuthProvider', () => ({
  useAuth: () => ({ login: jest.fn() })
}));
import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Login from '../pages/login';

test('renders login form and submits', () => {
  render(<Login />);
  expect(screen.getByText(/Login/i)).toBeInTheDocument();
  expect(screen.getByPlaceholderText(/Username/i)).toBeInTheDocument();
  expect(screen.getByPlaceholderText(/Password/i)).toBeInTheDocument();
  fireEvent.change(screen.getByPlaceholderText(/Username/i), { target: { value: 'testuser' } });
  fireEvent.change(screen.getByPlaceholderText(/Password/i), { target: { value: 'password' } });
  fireEvent.click(screen.getByText(/Login/i));
  // Add more assertions for login logic as implemented
});
