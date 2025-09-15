import React from 'react';
import { useAuth } from '../components/AuthProvider';
import WalletConnect from '../components/WalletConnect';

export default function Dashboard() {
  const { user, logout } = useAuth();
  if (!user) return <div className="text-center mt-20">Please log in.</div>;
  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <h1 className="text-4xl text-neon mb-4">Welcome, {user.username}</h1>
      <button onClick={logout} className="bg-accent text-black px-4 py-2 rounded mb-8">Logout</button>
      <WalletConnect />
      <div className="flex gap-4 mb-8">
        <button className="bg-accent text-black px-4 py-2 rounded font-bold">AR Mode (Coming Soon)</button>
        <button className="bg-accent text-black px-4 py-2 rounded font-bold">Voice Mode (Coming Soon)</button>
      </div>
  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-gray-800 p-6 rounded shadow-lg">
          <h2 className="text-xl text-accent mb-2">Portfolio</h2>
          <p>AI-powered portfolio management and analytics.</p>
        </div>
        <div className="bg-gray-800 p-6 rounded shadow-lg">
          <h2 className="text-xl text-accent mb-2">Fraud Alerts</h2>
          <p>Real-time anomaly detection and risk management.</p>
        </div>
        <div className="bg-gray-800 p-6 rounded shadow-lg">
          <h2 className="text-xl text-accent mb-2">Compliance</h2>
          <p>Automated regulatory monitoring and reporting.</p>
        </div>
        <div className="bg-gray-800 p-6 rounded shadow-lg">
          <h2 className="text-xl text-accent mb-2">DeFAI Yields</h2>
          <p>Tokenized asset management and yield optimization.</p>
        </div>
        <div className="bg-gray-800 p-6 rounded shadow-lg">
          <h2 className="text-xl text-accent mb-2">Market Insights</h2>
          <p>Predictive analytics, sentiment, and leaderboards.</p>
        </div>
        <div className="bg-gray-800 p-6 rounded shadow-lg">
          <h2 className="text-xl text-accent mb-2">Advanced Analytics</h2>
          <p>Deep learning forecasts, volatility, and risk scores.</p>
        </div>
        <div className="bg-gray-800 p-6 rounded shadow-lg">
          <h2 className="text-xl text-accent mb-2">Leaderboard</h2>
          <ul>
            <li className="mb-1">Alice - $1.2M</li>
            <li className="mb-1">Bob - $950K</li>
            <li className="mb-1">Carol - $800K</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
