const logger = require('../../utils/logger');
import React from 'react';
import Head from 'next/head';

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center">
      <Head>
        <title>FinAI Nexus</title>
      </Head>
      <h1 className="text-5xl font-bold text-neon mb-4">FinAI Nexus</h1>
      <p className="text-xl text-accent mb-8">Enterprise-Grade AI Financial Platform</p>
      <div className="bg-gray-800 rounded-lg p-6 shadow-lg">
        <ul className="list-disc pl-6">
          <li>Personalized Advisory</li>
          <li>Fraud Detection</li>
          <li>Regulatory Compliance</li>
          <li>DeFAI & Tokenized Asset Management</li>
          <li>Predictive Analytics</li>
        </ul>
      </div>
    </div>
  );
}
