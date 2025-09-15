import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';
import ARVoicePlaceholder from '../components/ARVoicePlaceholder';

test('renders AR/Voice mode placeholder', () => {
  render(<ARVoicePlaceholder />);
  expect(screen.getByText((content) => content.includes('AR and Voice Mode'))).toBeInTheDocument();
});
