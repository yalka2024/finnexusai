import React from 'react';
import { render } from '@testing-library/react-native';
import App from '../App';

describe('App', () => {
  it('renders without crashing and shows analytics/leaderboard', () => {
    const { getByTestId, getByText } = render(<App />);
    expect(getByTestId('main-app')).toBeTruthy();
    expect(getByText(/Advanced Analytics/i)).toBeTruthy();
    expect(getByText(/Leaderboard/i)).toBeTruthy();
    expect(getByText(/Alice - \$1.2M/i)).toBeTruthy();
    expect(getByText(/Bob - \$950K/i)).toBeTruthy();
    expect(getByText(/Carol - \$800K/i)).toBeTruthy();
  });
});
