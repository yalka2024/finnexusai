/**
 * Offline Trading Interface Component
 * 
 * Provides full trading capabilities when offline,
 * with automatic sync when connection is restored
 */

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { 
  Button 
} from '@/components/ui/button';
import { 
  Input 
} from '@/components/ui/input';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  Badge 
} from '@/components/ui/badge';
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from '@/components/ui/tabs';
import { 
  Alert, 
  AlertDescription 
} from '@/components/ui/alert';
import { 
  Progress 
} from '@/components/ui/progress';
import { 
  Separator 
} from '@/components/ui/separator';
import {
  TrendingUp,
  TrendingDown,
  Wifi,
  WifiOff,
  Sync,
  CheckCircle,
  Clock,
  AlertCircle,
  DollarSign,
  BarChart3,
  PieChart,
  Activity,
  Download,
  Upload,
  RefreshCw
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import OfflineStorageManager from '@/services/OfflineStorageManager';

const OfflineTradingInterface = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isLoading, setIsLoading] = useState(false);
  const [trades, setTrades] = useState([]);
  const [portfolio, setPortfolio] = useState([]);
  const [marketData, setMarketData] = useState({});
  const [syncStatus, setSyncStatus] = useState({});
  const [storageStats, setStorageStats] = useState({});
  const [newTrade, setNewTrade] = useState({
    symbol: '',
    side: 'buy',
    quantity: '',
    price: '',
    orderType: 'market'
  });

  useEffect(() => {
    initializeComponent();
    setupNetworkListener();
    
    return () => {
      // Cleanup
    };
  }, []);

  const initializeComponent = async () => {
    try {
      setIsLoading(true);
      
      // Initialize offline storage manager
      await OfflineStorageManager.initialize();
      
      // Load data
      await loadTradingData();
      await loadPortfolioData();
      await loadMarketData();
      await loadStorageStats();
      
      setIsLoading(false);
      toast.success('Offline trading interface initialized');
    } catch (error) {
      console.error('Failed to initialize offline trading interface:', error);
      toast.error('Failed to initialize offline trading interface');
      setIsLoading(false);
    }
  };

  const setupNetworkListener = () => {
    const handleOnline = () => {
      setIsOnline(true);
      toast.success('Connection restored - syncing data');
      triggerSync();
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast.warning('Connection lost - trading offline');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  };

  const loadTradingData = async () => {
    try {
      const result = await OfflineStorageManager.getTrades('current_user');
      setTrades(result.trades || []);
    } catch (error) {
      console.error('Failed to load trading data:', error);
    }
  };

  const loadPortfolioData = async () => {
    try {
      const result = await OfflineStorageManager.getPortfolio('current_user');
      setPortfolio(result.portfolio || []);
    } catch (error) {
      console.error('Failed to load portfolio data:', error);
    }
  };

  const loadMarketData = async () => {
    try {
      // Simulate market data
      const mockData = {
        'BTC': { price: 45000, change: 2.5, volume: 1234567 },
        'ETH': { price: 3200, change: -1.2, volume: 987654 },
        'SOL': { price: 180, change: 5.8, volume: 456789 },
        'ADA': { price: 0.45, change: 1.2, volume: 234567 },
        'DOT': { price: 6.8, change: -0.8, volume: 345678 }
      };
      setMarketData(mockData);
    } catch (error) {
      console.error('Failed to load market data:', error);
    }
  };

  const loadStorageStats = async () => {
    try {
      const result = await OfflineStorageManager.getStorageStats();
      setStorageStats(result.stats || {});
    } catch (error) {
      console.error('Failed to load storage stats:', error);
    }
  };

  const triggerSync = async () => {
    try {
      await OfflineStorageManager.syncPendingOperations();
      await loadTradingData();
      await loadPortfolioData();
      await loadStorageStats();
      toast.success('Data synced successfully');
    } catch (error) {
      console.error('Sync failed:', error);
      toast.error('Sync failed');
    }
  };

  const executeTrade = async () => {
    try {
      if (!newTrade.symbol || !newTrade.quantity) {
        toast.error('Please fill in all required fields');
        return;
      }

      const tradeData = {
        tradeId: `trade_${Date.now()}`,
        userId: 'current_user',
        symbol: newTrade.symbol,
        side: newTrade.side,
        quantity: parseFloat(newTrade.quantity),
        price: parseFloat(newTrade.price) || marketData[newTrade.symbol]?.price || 0,
        status: 'pending',
        timestamp: Date.now()
      };

      const result = await OfflineStorageManager.saveTrade(tradeData);
      
      if (result.success) {
        toast.success(
          `${newTrade.side.toUpperCase()} ${newTrade.quantity} ${newTrade.symbol} at $${tradeData.price}`
        );
        
        // Reset form
        setNewTrade({
          symbol: '',
          side: 'buy',
          quantity: '',
          price: '',
          orderType: 'market'
        });
        
        // Refresh data
        await loadTradingData();
        await loadPortfolioData();
        await loadStorageStats();
      }
    } catch (error) {
      console.error('Trade execution failed:', error);
      toast.error('Failed to execute trade');
    }
  };

  const exportData = async () => {
    try {
      await OfflineStorageManager.exportData();
      toast.success('Data exported successfully');
    } catch (error) {
      console.error('Export failed:', error);
      toast.error('Export failed');
    }
  };

  const clearData = async () => {
    if (window.confirm('Are you sure you want to clear all offline data?')) {
      try {
        await OfflineStorageManager.clearAllData();
        await loadTradingData();
        await loadPortfolioData();
        await loadStorageStats();
        toast.success('All offline data cleared');
      } catch (error) {
        console.error('Clear data failed:', error);
        toast.error('Failed to clear data');
      }
    }
  };

  const renderConnectionStatus = () => (
    <Alert className={isOnline ? 'border-green-500' : 'border-red-500'}>
      <div className="flex items-center space-x-2">
        {isOnline ? (
          <>
            <Wifi className="h-4 w-4 text-green-500" />
            <span className="text-green-500">Online</span>
          </>
        ) : (
          <>
            <WifiOff className="h-4 w-4 text-red-500" />
            <span className="text-red-500">Offline</span>
          </>
        )}
      </div>
      <AlertDescription>
        {isOnline 
          ? 'Connected to the internet. Data will sync automatically.'
          : 'Working offline. Trades will be synced when connection is restored.'
        }
      </AlertDescription>
    </Alert>
  );

  const renderStorageStats = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <BarChart3 className="h-5 w-5" />
          <span>Offline Storage</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{storageStats.trades || 0}</div>
            <div className="text-sm text-gray-500">Trades</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{storageStats.portfolio || 0}</div>
            <div className="text-sm text-gray-500">Portfolio Items</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">{storageStats.marketData || 0}</div>
            <div className="text-sm text-gray-500">Market Data</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">{storageStats.syncQueue || 0}</div>
            <div className="text-sm text-gray-500">Pending Sync</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const renderNewTradeForm = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <TrendingUp className="h-5 w-5" />
          <span>Execute Trade</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium">Symbol</label>
            <Select value={newTrade.symbol} onValueChange={(value) => setNewTrade({...newTrade, symbol: value})}>
              <SelectTrigger>
                <SelectValue placeholder="Select symbol" />
              </SelectTrigger>
              <SelectContent>
                {Object.keys(marketData).map(symbol => (
                  <SelectItem key={symbol} value={symbol}>{symbol}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium">Side</label>
            <Select value={newTrade.side} onValueChange={(value) => setNewTrade({...newTrade, side: value})}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="buy">Buy</SelectItem>
                <SelectItem value="sell">Sell</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium">Quantity</label>
            <Input
              type="number"
              placeholder="0.00"
              value={newTrade.quantity}
              onChange={(e) => setNewTrade({...newTrade, quantity: e.target.value})}
            />
          </div>
          <div>
            <label className="text-sm font-medium">Price (Optional)</label>
            <Input
              type="number"
              placeholder="0.00"
              value={newTrade.price}
              onChange={(e) => setNewTrade({...newTrade, price: e.target.value})}
            />
          </div>
        </div>
        
        <Button 
          onClick={executeTrade} 
          className="w-full"
          disabled={!newTrade.symbol || !newTrade.quantity}
        >
          Execute Trade
        </Button>
      </CardContent>
    </Card>
  );

  const renderMarketData = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Activity className="h-5 w-5" />
          <span>Market Data</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {Object.entries(marketData).map(([symbol, data]) => (
            <div key={symbol} className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="font-semibold">{symbol}</div>
                <Badge variant={data.change >= 0 ? 'default' : 'destructive'}>
                  {data.change >= 0 ? '+' : ''}{data.change.toFixed(2)}%
                </Badge>
              </div>
              <div className="text-right">
                <div className="font-semibold">${data.price.toLocaleString()}</div>
                <div className="text-sm text-gray-500">Vol: {data.volume.toLocaleString()}</div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );

  const renderRecentTrades = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Clock className="h-5 w-5" />
          <span>Recent Trades</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {trades.slice(0, 5).map((trade, index) => (
            <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="font-semibold">{trade.symbol}</div>
                <Badge variant={trade.side === 'buy' ? 'default' : 'destructive'}>
                  {trade.side.toUpperCase()}
                </Badge>
              </div>
              <div className="text-right">
                <div className="font-semibold">{trade.quantity}</div>
                <div className="text-sm text-gray-500">${trade.price}</div>
              </div>
              <div className="flex items-center space-x-1">
                {trade.syncStatus === 'synced' ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <Clock className="h-4 w-4 text-yellow-500" />
                )}
                <span className="text-xs text-gray-500">
                  {trade.syncStatus === 'synced' ? 'Synced' : 'Pending'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );

  const renderPortfolio = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <PieChart className="h-5 w-5" />
          <span>Portfolio</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {portfolio.slice(0, 5).map((item, index) => (
            <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
              <div className="font-semibold">{item.symbol}</div>
              <div className="text-right">
                <div className="font-semibold">{item.quantity}</div>
                <div className="text-sm text-gray-500">
                  ${(item.quantity * item.currentPrice).toLocaleString()}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <div className="text-lg font-semibold">Loading Offline Trading Interface...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Offline Trading</h1>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={triggerSync} disabled={!isOnline}>
            <Sync className="h-4 w-4 mr-2" />
            Sync
          </Button>
          <Button variant="outline" onClick={exportData}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button variant="outline" onClick={clearData}>
            <Upload className="h-4 w-4 mr-2" />
            Clear
          </Button>
        </div>
      </div>

      {renderConnectionStatus()}

      <Tabs defaultValue="trading" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="trading">Trading</TabsTrigger>
          <TabsTrigger value="portfolio">Portfolio</TabsTrigger>
          <TabsTrigger value="market">Market</TabsTrigger>
          <TabsTrigger value="storage">Storage</TabsTrigger>
        </TabsList>

        <TabsContent value="trading" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {renderNewTradeForm()}
            {renderRecentTrades()}
          </div>
        </TabsContent>

        <TabsContent value="portfolio" className="space-y-6">
          {renderPortfolio()}
        </TabsContent>

        <TabsContent value="market" className="space-y-6">
          {renderMarketData()}
        </TabsContent>

        <TabsContent value="storage" className="space-y-6">
          {renderStorageStats()}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default OfflineTradingInterface;

