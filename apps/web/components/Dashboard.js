const logger = require('../../utils/logger');
import React, { useState, useEffect } from 'react';
import { useAuth } from './AuthProvider';

export default function Dashboard() {
  const { user } = useAuth();
  const [portfolioData, setPortfolioData] = useState(null);
  const [marketData, setMarketData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchDashboardData();
    // Set up real-time updates
    const interval = setInterval(fetchDashboardData, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Fetch portfolio data
      const portfolioResponse = await fetch('/api/v1/portfolio');
      const portfolio = await portfolioResponse.json();

      // Fetch market data
      const marketResponse = await fetch('/api/v1/analytics');
      const market = await marketResponse.json();

      setPortfolioData(portfolio);
      setMarketData(market);
    } catch (error) {
      logger.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'portfolio', label: 'Portfolio', icon: '💼' },
    { id: 'trading', label: 'Trading', icon: '📈' },
    { id: 'analytics', label: 'Analytics', icon: '🔍' },
    { id: 'compliance', label: 'Compliance', icon: '🛡️' },
    { id: 'ai-insights', label: 'AI Insights', icon: '🤖' }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-neon mx-auto mb-4"></div>
          <p className="text-xl">Loading your financial dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-neon">FinAI Nexus</h1>
            <p className="text-gray-400">Welcome back, {user?.firstName || 'Trader'}</p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <p className="text-sm text-gray-400">Portfolio Value</p>
              <p className="text-2xl font-bold text-green-400">
                ${portfolioData?.valueUSD?.toLocaleString() || '0'}
              </p>
            </div>
            <div className="w-12 h-12 bg-neon rounded-full flex items-center justify-center">
              <span className="text-black font-bold text-lg">
                {user?.firstName?.charAt(0) || 'U'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-gray-800 border-b border-gray-700">
        <div className="px-6">
          <nav className="flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-neon text-neon'
                    : 'border-transparent text-gray-400 hover:text-white hover:border-gray-300'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6">
        {activeTab === 'overview' && <OverviewTab portfolioData={portfolioData} marketData={marketData} />}
        {activeTab === 'portfolio' && <PortfolioTab portfolioData={portfolioData} />}
        {activeTab === 'trading' && <TradingTab />}
        {activeTab === 'analytics' && <AnalyticsTab marketData={marketData} />}
        {activeTab === 'compliance' && <ComplianceTab />}
        {activeTab === 'ai-insights' && <AIInsightsTab />}
      </div>
    </div>
  );
}

// Overview Tab Component
function OverviewTab({ portfolioData, marketData }) {
  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total Portfolio Value"
          value={`$${portfolioData?.valueUSD?.toLocaleString() || '0'}`}
          change="+2.4%"
          changeType="positive"
          icon="💼"
        />
        <MetricCard
          title="Today's P&L"
          value={`$${portfolioData?.todayPL?.toLocaleString() || '0'}`}
          change="+$1,234"
          changeType="positive"
          icon="📈"
        />
        <MetricCard
          title="Risk Score"
          value={`${portfolioData?.riskScore || '0'}/10`}
          change="-0.2"
          changeType="positive"
          icon="⚠️"
        />
        <MetricCard
          title="AI Confidence"
          value="94%"
          change="+2%"
          changeType="positive"
          icon="🤖"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gray-800 p-6 rounded-lg">
          <h3 className="text-xl font-semibold mb-4">Portfolio Performance</h3>
          <div className="h-64 bg-gray-700 rounded flex items-center justify-center">
            <p className="text-gray-400">📊 Performance Chart (Coming Soon)</p>
          </div>
        </div>
        <div className="bg-gray-800 p-6 rounded-lg">
          <h3 className="text-xl font-semibold mb-4">Asset Allocation</h3>
          <div className="h-64 bg-gray-700 rounded flex items-center justify-center">
            <p className="text-gray-400">🥧 Pie Chart (Coming Soon)</p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-gray-800 p-6 rounded-lg">
        <h3 className="text-xl font-semibold mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button className="bg-neon text-black py-3 px-4 rounded font-bold hover:bg-neon/90">
            📈 Buy Assets
          </button>
          <button className="bg-gray-700 text-white py-3 px-4 rounded font-bold hover:bg-gray-600">
            📉 Sell Assets
          </button>
          <button className="bg-gray-700 text-white py-3 px-4 rounded font-bold hover:bg-gray-600">
            🔄 Rebalance
          </button>
          <button className="bg-gray-700 text-white py-3 px-4 rounded font-bold hover:bg-gray-600">
            🤖 AI Advice
          </button>
        </div>
      </div>
    </div>
  );
}

// Portfolio Tab Component
function PortfolioTab({ portfolioData }) {
  const mockAssets = [
    { symbol: 'BTC', name: 'Bitcoin', value: 45000, change: '+2.4%', allocation: '35%' },
    { symbol: 'ETH', name: 'Ethereum', value: 3200, change: '+1.8%', allocation: '25%' },
    { symbol: 'AAPL', name: 'Apple Inc.', value: 180, change: '-0.5%', allocation: '20%' },
    { symbol: 'TSLA', name: 'Tesla Inc.', value: 250, change: '+3.2%', allocation: '20%' }
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Portfolio Holdings</h2>
        <button className="bg-neon text-black py-2 px-4 rounded font-bold">
          + Add Asset
        </button>
      </div>

      <div className="bg-gray-800 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-700">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                Asset
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                Value
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                Change
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                Allocation
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {mockAssets.map((asset, index) => (
              <tr key={index} className="hover:bg-gray-700">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center mr-3">
                      <span className="text-xs font-bold">{asset.symbol.charAt(0)}</span>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-white">{asset.symbol}</div>
                      <div className="text-sm text-gray-400">{asset.name}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                  ${asset.value.toLocaleString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`text-sm ${
                    asset.change.startsWith('+') ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {asset.change}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                  {asset.allocation}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <button className="text-neon hover:text-neon/80 mr-3">Trade</button>
                  <button className="text-gray-400 hover:text-white">Details</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Trading Tab Component
function TradingTab() {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Trading Interface</h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gray-800 p-6 rounded-lg">
          <h3 className="text-xl font-semibold mb-4">Place Order</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Asset</label>
              <select className="w-full p-3 bg-gray-700 border border-gray-600 rounded">
                <option>Bitcoin (BTC)</option>
                <option>Ethereum (ETH)</option>
                <option>Apple (AAPL)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Order Type</label>
              <select className="w-full p-3 bg-gray-700 border border-gray-600 rounded">
                <option>Market Order</option>
                <option>Limit Order</option>
                <option>Stop Order</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Quantity</label>
              <input
                type="number"
                className="w-full p-3 bg-gray-700 border border-gray-600 rounded"
                placeholder="0.00"
              />
            </div>
            <button className="w-full bg-neon text-black py-3 rounded font-bold">
              Place Order
            </button>
          </div>
        </div>
        <div className="bg-gray-800 p-6 rounded-lg">
          <h3 className="text-xl font-semibold mb-4">Order Book</h3>
          <div className="h-64 bg-gray-700 rounded flex items-center justify-center">
            <p className="text-gray-400">📊 Order Book (Coming Soon)</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Analytics Tab Component
function AnalyticsTab({ marketData }) {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Market Analytics</h2>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-gray-800 p-6 rounded-lg">
          <h3 className="text-xl font-semibold mb-4">Market Sentiment</h3>
          <div className="text-center">
            <div className="text-4xl mb-2">📊</div>
            <p className="text-2xl font-bold text-green-400">Bullish</p>
            <p className="text-gray-400">Based on AI analysis</p>
          </div>
        </div>
        <div className="bg-gray-800 p-6 rounded-lg">
          <h3 className="text-xl font-semibold mb-4">Top Performers</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>Bitcoin</span>
              <span className="text-green-400">+5.2%</span>
            </div>
            <div className="flex justify-between">
              <span>Ethereum</span>
              <span className="text-green-400">+3.8%</span>
            </div>
            <div className="flex justify-between">
              <span>Tesla</span>
              <span className="text-green-400">+2.1%</span>
            </div>
          </div>
        </div>
        <div className="bg-gray-800 p-6 rounded-lg">
          <h3 className="text-xl font-semibold mb-4">Risk Indicators</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>Volatility</span>
              <span className="text-yellow-400">Medium</span>
            </div>
            <div className="flex justify-between">
              <span>Correlation</span>
              <span className="text-green-400">Low</span>
            </div>
            <div className="flex justify-between">
              <span>Liquidity</span>
              <span className="text-green-400">High</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Compliance Tab Component
function ComplianceTab() {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Compliance & Risk Management</h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gray-800 p-6 rounded-lg">
          <h3 className="text-xl font-semibold mb-4">Compliance Status</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span>KYC Status</span>
              <span className="text-green-400">✅ Verified</span>
            </div>
            <div className="flex items-center justify-between">
              <span>AML Check</span>
              <span className="text-green-400">✅ Passed</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Tax Reporting</span>
              <span className="text-yellow-400">⚠️ Pending</span>
            </div>
          </div>
        </div>
        <div className="bg-gray-800 p-6 rounded-lg">
          <h3 className="text-xl font-semibold mb-4">Risk Alerts</h3>
          <div className="space-y-2">
            <div className="p-3 bg-yellow-900/20 border border-yellow-500 rounded">
              <p className="text-yellow-400 text-sm">High concentration in crypto assets</p>
            </div>
            <div className="p-3 bg-green-900/20 border border-green-500 rounded">
              <p className="text-green-400 text-sm">All transactions within limits</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// AI Insights Tab Component
function AIInsightsTab() {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">AI-Powered Insights</h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gray-800 p-6 rounded-lg">
          <h3 className="text-xl font-semibold mb-4">🤖 AI Recommendations</h3>
          <div className="space-y-4">
            <div className="p-4 bg-blue-900/20 border border-blue-500 rounded">
              <p className="text-blue-400 font-medium">Portfolio Rebalancing</p>
              <p className="text-sm text-gray-300">Consider reducing crypto allocation by 10%</p>
            </div>
            <div className="p-4 bg-green-900/20 border border-green-500 rounded">
              <p className="text-green-400 font-medium">New Opportunity</p>
              <p className="text-sm text-gray-300">ESG stocks showing strong momentum</p>
            </div>
          </div>
        </div>
        <div className="bg-gray-800 p-6 rounded-lg">
          <h3 className="text-xl font-semibold mb-4">📊 Market Predictions</h3>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-400">Next 7 days</p>
              <p className="text-lg font-semibold text-green-400">+2.3% expected</p>
            </div>
            <div>
              <p className="text-sm text-gray-400">Confidence Level</p>
              <p className="text-lg font-semibold text-blue-400">87%</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Metric Card Component
function MetricCard({ title, value, change, changeType, icon }) {
  return (
    <div className="bg-gray-800 p-6 rounded-lg">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-400">{title}</p>
          <p className="text-2xl font-bold text-white">{value}</p>
          <p className={`text-sm ${
            changeType === 'positive' ? 'text-green-400' : 'text-red-400'
          }`}>
            {change}
          </p>
        </div>
        <div className="text-3xl">{icon}</div>
      </div>
    </div>
  );
}
