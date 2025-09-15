import '@testing-library/jest-dom';
import React from 'react';
import { renderHook } from '@testing-library/react';
import { AuthProvider, useAuth } from '../components/AuthProvider';

test('provides auth context', () => {
  const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>;
  const { result } = renderHook(() => useAuth(), { wrapper });
  expect(result.current).toHaveProperty('user');
  expect(result.current).toHaveProperty('logout');
});
