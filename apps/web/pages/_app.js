const logger = require('../../utils/logger');
import React from 'react';
import '../styles/globals.css';
import { AuthProvider } from '../components/AuthProvider';
import { Web3Provider } from '../components/Web3Provider';
import CookieConsent from '../components/CookieConsent';

export default function App({ Component, pageProps }) {
  return (
    <AuthProvider>
      <Web3Provider>
        <Component {...pageProps} />
        <CookieConsent />
      </Web3Provider>
    </AuthProvider>
  );
}
