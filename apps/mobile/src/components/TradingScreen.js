/**
 * Trading Screen Component
 * 
 * Main trading interface with offline capabilities,
 * real-time updates, and seamless online/offline transitions
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Dimensions
} from 'react-native';
import NetInfo from '@react-native-netinfo/netinfo';
import { LineChart } from 'react-native-chart-kit';
import { Icon } from 'react-native-elements';
import OfflineSyncManager from '../services/OfflineSyncManager';
import { logger } from '../utils/Logger';

const { width } = Dimensions.get('window');

const TradingScreen = ({ navigation }) => {
  const [isOnline, setIsOnline] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [trades, setTrades] = useState([]);
  const [portfolio, setPortfolio] = useState([]);
  const [marketData, setMarketData] = useState({});
  const [syncStatus, setSyncStatus] = useState({});
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    initializeScreen();
    setupNetworkListener();
    
    return () => {
      // Cleanup
    };
  }, []);

  const initializeScreen = async () => {
    try {
      setIsLoading(true);
      
      // Initialize offline sync manager
      await OfflineSyncManager.initialize();
      
      // Load data
      await loadTradingData();
      await loadPortfolioData();
      await loadMarketData();
      
      setIsLoading(false);
      logger.info('Trading screen initialized');
    } catch (error) {
      logger.error('Failed to initialize trading screen:', error);
      Alert.alert('Error', 'Failed to initialize trading screen');
      setIsLoading(false);
    }
  };

  const setupNetworkListener = () => {
    const unsubscribe = NetInfo.addEventListener(state => {
      const online = state.isConnected && state.isInternetReachable;
      setIsOnline(online);
      
      if (online && !syncStatus.syncInProgress) {
        // Trigger sync when coming online
        triggerSync();
      }
    });

    return unsubscribe;
  };

  const loadTradingData = async () => {
    try {
      const result = await OfflineSyncManager.getOfflineTrades('current_user');
      setTrades(result.trades || []);
      logger.info(`Loaded ${result.trades?.length || 0} trades`);
    } catch (error) {
      logger.error('Failed to load trading data:', error);
    }
  };

  const loadPortfolioData = async () => {
    try {
      const result = await OfflineSyncManager.getOfflinePortfolio('current_user');
      setPortfolio(result.portfolio || []);
      logger.info(`Loaded ${result.portfolio?.length || 0} portfolio items`);
    } catch (error) {
      logger.error('Failed to load portfolio data:', error);
    }
  };

  const loadMarketData = async () => {
    try {
      // Simulate market data
      const mockData = {
        'BTC': { price: 45000, change: 2.5, volume: 1234567 },
        'ETH': { price: 3200, change: -1.2, volume: 987654 },
        'SOL': { price: 180, change: 5.8, volume: 456789 }
      };
      setMarketData(mockData);
      logger.info('Loaded market data');
    } catch (error) {
      logger.error('Failed to load market data:', error);
    }
  };

  const triggerSync = async () => {
    try {
      const result = await OfflineSyncManager.triggerSync();
      setSyncStatus(result);
      logger.info('Sync triggered:', result);
    } catch (error) {
      logger.error('Sync failed:', error);
      Alert.alert('Sync Error', 'Failed to sync data');
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadTradingData();
      await loadPortfolioData();
      await loadMarketData();
      
      if (isOnline) {
        await triggerSync();
      }
    } catch (error) {
      logger.error('Refresh failed:', error);
    } finally {
      setRefreshing(false);
    }
  }, [isOnline]);

  const executeTrade = async (symbol, side, quantity, price) => {
    try {
      const tradeData = {
        trade_id: `trade_${Date.now()}`,
        user_id: 'current_user',
        symbol,
        side,
        quantity,
        price,
        status: 'pending',
        timestamp: Date.now()
      };

      const result = await OfflineSyncManager.saveOfflineTrade(tradeData);
      
      if (result.success) {
        Alert.alert(
          'Trade Executed',
          `${side.toUpperCase()} ${quantity} ${symbol} at $${price}`,
          [{ text: 'OK' }]
        );
        
        // Refresh data
        await loadTradingData();
        await loadPortfolioData();
      }
    } catch (error) {
      logger.error('Trade execution failed:', error);
      Alert.alert('Trade Error', 'Failed to execute trade');
    }
  };

  const showTradeModal = (symbol) => {
    Alert.prompt(
      'Execute Trade',
      `Enter quantity for ${symbol}:`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Buy',
          onPress: (quantity) => {
            const price = marketData[symbol]?.price || 0;
            executeTrade(symbol, 'buy', parseFloat(quantity), price);
          }
        },
        {
          text: 'Sell',
          onPress: (quantity) => {
            const price = marketData[symbol]?.price || 0;
            executeTrade(symbol, 'sell', parseFloat(quantity), price);
          }
        }
      ],
      'plain-text'
    );
  };

  const renderMarketData = () => {
    return Object.entries(marketData).map(([symbol, data]) => (
      <TouchableOpacity
        key={symbol}
        style={styles.marketItem}
        onPress={() => showTradeModal(symbol)}
      >
        <View style={styles.marketHeader}>
          <Text style={styles.symbol}>{symbol}</Text>
          <Text style={[
            styles.change,
            { color: data.change >= 0 ? '#4CAF50' : '#F44336' }
          ]}>
            {data.change >= 0 ? '+' : ''}{data.change.toFixed(2)}%
          </Text>
        </View>
        <Text style={styles.price}>${data.price.toLocaleString()}</Text>
        <Text style={styles.volume}>Vol: {data.volume.toLocaleString()}</Text>
      </TouchableOpacity>
    ));
  };

  const renderRecentTrades = () => {
    return trades.slice(0, 5).map((trade, index) => (
      <View key={index} style={styles.tradeItem}>
        <View style={styles.tradeInfo}>
          <Text style={styles.tradeSymbol}>{trade.symbol}</Text>
          <Text style={styles.tradeSide}>{trade.side.toUpperCase()}</Text>
        </View>
        <View style={styles.tradeDetails}>
          <Text style={styles.tradeQuantity}>{trade.quantity}</Text>
          <Text style={styles.tradePrice}>${trade.price}</Text>
        </View>
        <View style={[
          styles.statusBadge,
          { backgroundColor: trade.sync_status === 'synced' ? '#4CAF50' : '#FF9800' }
        ]}>
          <Text style={styles.statusText}>
            {trade.sync_status === 'synced' ? 'Synced' : 'Pending'}
          </Text>
        </View>
      </View>
    ));
  };

  const renderPortfolio = () => {
    return portfolio.slice(0, 5).map((item, index) => (
      <View key={index} style={styles.portfolioItem}>
        <Text style={styles.portfolioSymbol}>{item.symbol}</Text>
        <Text style={styles.portfolioQuantity}>{item.quantity}</Text>
        <Text style={styles.portfolioValue}>
          ${(item.quantity * item.current_price).toLocaleString()}
        </Text>
      </View>
    ));
  };

  const renderPriceChart = () => {
    const chartData = {
      labels: ['1H', '4H', '1D', '1W', '1M'],
      datasets: [{
        data: [43000, 43500, 44000, 44500, 45000],
        color: (opacity = 1) => `rgba(134, 65, 244, ${opacity})`,
        strokeWidth: 2
      }]
    };

    return (
      <LineChart
        data={chartData}
        width={width - 40}
        height={220}
        yAxisLabel="$"
        chartConfig={{
          backgroundColor: '#1e1e1e',
          backgroundGradientFrom: '#1e1e1e',
          backgroundGradientTo: '#1e1e1e',
          decimalPlaces: 0,
          color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
          labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
          style: { borderRadius: 16 },
          propsForDots: { r: '6', strokeWidth: '2', stroke: '#ffa726' }
        }}
        bezier
        style={styles.chart}
      />
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading Trading Data...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Trading</Text>
        <View style={styles.headerRight}>
          <Icon
            name={isOnline ? 'wifi' : 'wifi-off'}
            type="material"
            color={isOnline ? '#4CAF50' : '#F44336'}
            size={24}
          />
          <TouchableOpacity onPress={triggerSync} style={styles.syncButton}>
            <Icon name="sync" type="material" color="#2196F3" size={24} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Price Chart */}
      {renderPriceChart()}

      {/* Market Data */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Market Data</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {renderMarketData()}
        </ScrollView>
      </View>

      {/* Portfolio */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Portfolio</Text>
        {renderPortfolio()}
      </View>

      {/* Recent Trades */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Trades</Text>
        {renderRecentTrades()}
      </View>

      {/* Sync Status */}
      <View style={styles.syncStatus}>
        <Text style={styles.syncStatusText}>
          {isOnline ? 'Online' : 'Offline'} • 
          {syncStatus.pendingOperations || 0} pending sync
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1e1e1e',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1e1e1e',
  },
  loadingText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#2d2d2d',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  syncButton: {
    marginLeft: 15,
    padding: 5,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
    alignSelf: 'center',
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 15,
  },
  marketItem: {
    backgroundColor: '#2d2d2d',
    padding: 15,
    marginRight: 15,
    borderRadius: 10,
    minWidth: 120,
  },
  marketHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  symbol: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  change: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  price: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 5,
  },
  volume: {
    fontSize: 12,
    color: '#cccccc',
  },
  portfolioItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#2d2d2d',
    padding: 15,
    marginBottom: 10,
    borderRadius: 10,
  },
  portfolioSymbol: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  portfolioQuantity: {
    fontSize: 14,
    color: '#cccccc',
  },
  portfolioValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  tradeItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#2d2d2d',
    padding: 15,
    marginBottom: 10,
    borderRadius: 10,
  },
  tradeInfo: {
    flex: 1,
  },
  tradeSymbol: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  tradeSide: {
    fontSize: 12,
    color: '#cccccc',
  },
  tradeDetails: {
    flex: 1,
    alignItems: 'flex-end',
  },
  tradeQuantity: {
    fontSize: 14,
    color: '#ffffff',
  },
  tradePrice: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 10,
  },
  statusText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  syncStatus: {
    padding: 20,
    alignItems: 'center',
  },
  syncStatusText: {
    fontSize: 12,
    color: '#cccccc',
  },
});

export default TradingScreen;

