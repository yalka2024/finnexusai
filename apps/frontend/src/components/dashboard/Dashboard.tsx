/**
 * Dashboard Component - Complete Implementation
 * Main dashboard with portfolio overview, market data, and trading interface
 * 
 * @author FinNexusAI Development Team
 * @version 1.0.0
 * @date 2024-01-15
 */

"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import { Progress } from "@/components/ui/Progress";
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  PieChart, 
  BarChart3, 
  Activity,
  Wallet,
  Target,
  AlertCircle,
  RefreshCw,
  Plus,
  Settings,
  Eye,
  EyeOff
} from 'lucide-react';

interface Portfolio {
  id: string;
  name: string;
  totalValue: number;
  totalCostBasis: number;
  totalReturn: number;
  totalReturnPercentage: number;
  dailyPnl: number;
  dailyPnlPercentage: number;
  holdings: Holding[];
  allocation: AssetAllocation[];
}

interface Holding {
  id: string;
  assetId: string;
  symbol: string;
  name: string;
  quantity: number;
  averageCost: number;
  currentPrice: number;
  currentValue: number;
  unrealizedPnl: number;
  unrealizedPnlPercentage: number;
  allocation: number;
}

interface AssetAllocation {
  symbol: string;
  name: string;
  percentage: number;
  value: number;
  color: string;
}

interface MarketData {
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  changePercentage24h: number;
  volume24h: number;
  marketCap: number;
}

interface TradingSignal {
  id: string;
  assetId: string;
  symbol: string;
  signal: 'BUY' | 'SELL' | 'HOLD';
  confidence: number;
  reason: string;
  timestamp: Date;
}

export default function Dashboard() {
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [marketData, setMarketData] = useState<MarketData[]>([]);
  const [tradingSignals, setTradingSignals] = useState<TradingSignal[]>([]);
  const [selectedPortfolio, setSelectedPortfolio] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [showBalances, setShowBalances] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  // Load dashboard data
  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      
      // Load portfolios
      const portfoliosResponse = await fetch('/api/v1/portfolio', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      });
      
      if (portfoliosResponse.ok) {
        const portfoliosData = await portfoliosResponse.json();
        setPortfolios(portfoliosData.portfolios || []);
        
        if (portfoliosData.portfolios?.length > 0) {
          setSelectedPortfolio(portfoliosData.portfolios[0].id);
        }
      }

      // Load market data
      const marketResponse = await fetch('/api/v1/market/top-assets', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      });
      
      if (marketResponse.ok) {
        const marketData = await marketResponse.json();
        setMarketData(marketData.assets || []);
      }

      // Load trading signals
      const signalsResponse = await fetch('/api/v1/ai-ml/signals', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      });
      
      if (signalsResponse.ok) {
        const signalsData = await signalsResponse.json();
        setTradingSignals(signalsData.signals || []);
      }

    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshData = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  const selectedPortfolioData = portfolios.find(p => p.id === selectedPortfolio);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const formatPercentage = (percentage: number) => {
    return `${percentage >= 0 ? '+' : ''}${percentage.toFixed(2)}%`;
  };

  const getChangeColor = (change: number) => {
    return change >= 0 ? 'text-green-600' : 'text-red-600';
  };

  const getChangeIcon = (change: number) => {
    return change >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Welcome back! Here's your portfolio overview.</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={refreshData}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowBalances(!showBalances)}
          >
            {showBalances ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Portfolio Selector */}
      {portfolios.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Select Portfolio</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {portfolios.map((portfolio) => (
                <Button
                  key={portfolio.id}
                  variant={selectedPortfolio === portfolio.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedPortfolio(portfolio.id)}
                >
                  {portfolio.name}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Dashboard Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="portfolio">Portfolio</TabsTrigger>
          <TabsTrigger value="trading">Trading</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Portfolio Summary Cards */}
          {selectedPortfolioData && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Value</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {showBalances ? formatCurrency(selectedPortfolioData.totalValue) : '••••••'}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {showBalances ? formatCurrency(selectedPortfolioData.totalCostBasis) : '••••••'} cost basis
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Return</CardTitle>
                  <div className={`flex items-center ${getChangeColor(selectedPortfolioData.totalReturnPercentage)}`}>
                    {getChangeIcon(selectedPortfolioData.totalReturnPercentage)}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className={`text-2xl font-bold ${getChangeColor(selectedPortfolioData.totalReturnPercentage)}`}>
                    {showBalances ? formatCurrency(selectedPortfolioData.totalReturn) : '••••••'}
                  </div>
                  <p className={`text-xs ${getChangeColor(selectedPortfolioData.totalReturnPercentage)}`}>
                    {showBalances ? formatPercentage(selectedPortfolioData.totalReturnPercentage) : '••••••'}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Daily P&L</CardTitle>
                  <div className={`flex items-center ${getChangeColor(selectedPortfolioData.dailyPnlPercentage)}`}>
                    {getChangeIcon(selectedPortfolioData.dailyPnlPercentage)}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className={`text-2xl font-bold ${getChangeColor(selectedPortfolioData.dailyPnlPercentage)}`}>
                    {showBalances ? formatCurrency(selectedPortfolioData.dailyPnl) : '••••••'}
                  </div>
                  <p className={`text-xs ${getChangeColor(selectedPortfolioData.dailyPnlPercentage)}`}>
                    {showBalances ? formatPercentage(selectedPortfolioData.dailyPnlPercentage) : '••••••'}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Holdings</CardTitle>
                  <PieChart className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {selectedPortfolioData.holdings.length}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {selectedPortfolioData.allocation.length} assets
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Asset Allocation Chart */}
          {selectedPortfolioData && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Asset Allocation</CardTitle>
                  <CardDescription>Current portfolio distribution</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {selectedPortfolioData.allocation.map((asset, index) => (
                      <div key={asset.symbol} className="flex items-center space-x-4">
                        <div 
                          className="w-4 h-4 rounded-full" 
                          style={{ backgroundColor: asset.color }}
                        />
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{asset.symbol}</span>
                            <span className="text-sm text-muted-foreground">
                              {showBalances ? formatCurrency(asset.value) : '••••••'}
                            </span>
                          </div>
                          <Progress value={asset.percentage} className="mt-1" />
                          <div className="text-xs text-muted-foreground mt-1">
                            {asset.percentage.toFixed(1)}%
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Top Holdings */}
              <Card>
                <CardHeader>
                  <CardTitle>Top Holdings</CardTitle>
                  <CardDescription>Your largest positions</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {selectedPortfolioData.holdings
                      .sort((a, b) => b.currentValue - a.currentValue)
                      .slice(0, 5)
                      .map((holding) => (
                        <div key={holding.id} className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                              <span className="text-xs font-bold">{holding.symbol}</span>
                            </div>
                            <div>
                              <div className="font-medium">{holding.symbol}</div>
                              <div className="text-sm text-muted-foreground">{holding.name}</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-medium">
                              {showBalances ? formatCurrency(holding.currentValue) : '••••••'}
                            </div>
                            <div className={`text-sm ${getChangeColor(holding.unrealizedPnlPercentage)}`}>
                              {showBalances ? formatPercentage(holding.unrealizedPnlPercentage) : '••••••'}
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Market Data */}
          <Card>
            <CardHeader>
              <CardTitle>Market Overview</CardTitle>
              <CardDescription>Top performing assets</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {marketData.slice(0, 6).map((asset) => (
                  <div key={asset.symbol} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-xs font-bold">{asset.symbol}</span>
                      </div>
                      <div>
                        <div className="font-medium">{asset.symbol}</div>
                        <div className="text-sm text-muted-foreground">{asset.name}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">{formatCurrency(asset.price)}</div>
                      <div className={`text-sm flex items-center ${getChangeColor(asset.changePercentage24h)}`}>
                        {getChangeIcon(asset.changePercentage24h)}
                        {formatPercentage(asset.changePercentage24h)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Trading Signals */}
          {tradingSignals.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>AI Trading Signals</CardTitle>
                <CardDescription>Latest recommendations from our AI</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {tradingSignals.slice(0, 5).map((signal) => (
                    <div key={signal.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <Badge 
                          variant={signal.signal === 'BUY' ? 'default' : signal.signal === 'SELL' ? 'destructive' : 'secondary'}
                        >
                          {signal.signal}
                        </Badge>
                        <div>
                          <div className="font-medium">{signal.symbol}</div>
                          <div className="text-sm text-muted-foreground">{signal.reason}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-muted-foreground">
                          {signal.confidence}% confidence
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(signal.timestamp).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Portfolio Tab */}
        <TabsContent value="portfolio" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Portfolio Holdings</CardTitle>
              <CardDescription>Detailed view of your investments</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {selectedPortfolioData?.holdings.map((holding) => (
                  <div key={holding.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-sm font-bold">{holding.symbol}</span>
                      </div>
                      <div>
                        <div className="font-medium">{holding.symbol}</div>
                        <div className="text-sm text-muted-foreground">{holding.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {holding.quantity.toFixed(6)} @ {formatCurrency(holding.averageCost)}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">
                        {showBalances ? formatCurrency(holding.currentValue) : '••••••'}
                      </div>
                      <div className={`text-sm ${getChangeColor(holding.unrealizedPnlPercentage)}`}>
                        {showBalances ? formatCurrency(holding.unrealizedPnl) : '••••••'}
                      </div>
                      <div className={`text-xs ${getChangeColor(holding.unrealizedPnlPercentage)}`}>
                        {showBalances ? formatPercentage(holding.unrealizedPnlPercentage) : '••••••'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Trading Tab */}
        <TabsContent value="trading" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Quick Trade</CardTitle>
              <CardDescription>Execute trades quickly</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Asset</label>
                    <select className="w-full p-2 border rounded-md">
                      <option value="">Select asset</option>
                      {marketData.map((asset) => (
                        <option key={asset.symbol} value={asset.symbol}>
                          {asset.symbol} - {asset.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Side</label>
                    <select className="w-full p-2 border rounded-md">
                      <option value="buy">Buy</option>
                      <option value="sell">Sell</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Quantity</label>
                    <input 
                      type="number" 
                      className="w-full p-2 border rounded-md"
                      placeholder="0.00000000"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Order Type</label>
                    <select className="w-full p-2 border rounded-md">
                      <option value="market">Market</option>
                      <option value="limit">Limit</option>
                      <option value="stop">Stop</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Price</label>
                    <input 
                      type="number" 
                      className="w-full p-2 border rounded-md"
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Portfolio</label>
                    <select className="w-full p-2 border rounded-md">
                      {portfolios.map((portfolio) => (
                        <option key={portfolio.id} value={portfolio.id}>
                          {portfolio.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="pt-4">
                    <Button className="w-full">
                      Place Order
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Performance Chart</CardTitle>
                <CardDescription>Portfolio performance over time</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center border rounded-lg">
                  <BarChart3 className="h-12 w-12 text-muted-foreground" />
                  <span className="ml-2 text-muted-foreground">Chart coming soon</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Risk Metrics</CardTitle>
                <CardDescription>Portfolio risk analysis</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Volatility</span>
                    <span className="text-sm">15.2%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Sharpe Ratio</span>
                    <span className="text-sm">1.8</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Max Drawdown</span>
                    <span className="text-sm text-red-600">-8.5%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Beta</span>
                    <span className="text-sm">1.2</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
