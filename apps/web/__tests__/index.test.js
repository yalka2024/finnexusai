import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';
import Index from '../pages/index';

test('renders landing page content', () => {
  render(<Index />);
  expect(screen.getByText(/FinAI Nexus/i)).toBeInTheDocument();
  expect(screen.getByText(/Enterprise-Grade AI Financial Platform/i)).toBeInTheDocument();
});
