/**
 * FinAI Nexus Mobile - Dashboard Screen
 * 
 * Main dashboard with portfolio overview, quick actions, and real-time data
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Dimensions,
  Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { LineChart, BarChart, PieChart } from 'react-native-chart-kit';
import LinearGradient from 'react-native-linear-gradient';
import { useQuery } from 'react-query';

// Components
import MetricCard from '../components/MetricCard';
import QuickActionButton from '../components/QuickActionButton';
import NewsCard from '../components/NewsCard';
import AIInsightCard from '../components/AIInsightCard';

// Services
import { PortfolioService } from '../services/PortfolioService';
import { MarketService } from '../services/MarketService';
import { AIService } from '../services/AIService';

// Utils
import { formatCurrency, formatPercentage } from '../utils/formatters';

const { width } = Dimensions.get('window');

const DashboardScreen = ({ navigation }) => {
  const [refreshing, setRefreshing] = useState(false);
  const [portfolioData, setPortfolioData] = useState(null);
  const [marketData, setMarketData] = useState(null);
  const [aiInsights, setAiInsights] = useState(null);

  // Fetch portfolio data
  const { data: portfolio, isLoading: portfolioLoading } = useQuery(
    'portfolio',
    PortfolioService.getPortfolio,
    {
      refetchInterval: 30000, // Refresh every 30 seconds
    }
  );

  // Fetch market data
  const { data: market, isLoading: marketLoading } = useQuery(
    'market',
    MarketService.getMarketData,
    {
      refetchInterval: 60000, // Refresh every minute
    }
  );

  // Fetch AI insights
  const { data: insights, isLoading: insightsLoading } = useQuery(
    'aiInsights',
    AIService.getInsights,
    {
      refetchInterval: 300000, // Refresh every 5 minutes
    }
  );

  useFocusEffect(
    useCallback(() => {
      // Refresh data when screen comes into focus
      if (portfolio) setPortfolioData(portfolio);
      if (market) setMarketData(market);
      if (insights) setAiInsights(insights);
    }, [portfolio, market, insights])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      // Refresh all data
      await Promise.all([
        PortfolioService.refreshPortfolio(),
        MarketService.refreshMarketData(),
        AIService.refreshInsights(),
      ]);
    } catch (error) {
      Alert.alert('Error', 'Failed to refresh data');
    } finally {
      setRefreshing(false);
    }
  }, []);

  const handleQuickAction = (action) => {
    switch (action) {
    case 'buy':
      navigation.navigate('Trading', { action: 'buy' });
      break;
    case 'sell':
      navigation.navigate('Trading', { action: 'sell' });
      break;
    case 'portfolio':
      navigation.navigate('Portfolio');
      break;
    case 'analytics':
      navigation.navigate('Analytics');
      break;
    case 'ai_insights':
      navigation.navigate('AI Insights');
      break;
    case 'web3_connect':
      navigation.navigate('Web3Connect');
      break;
    case 'ar_trading':
      navigation.navigate('ARTrading');
      break;
    case 'voice_trading':
      navigation.navigate('VoiceTrading');
      break;
    default:
      Alert.alert('Coming Soon', 'This feature is coming soon!');
    }
  };

  const renderPortfolioChart = () => {
    if (!portfolioData?.performance) return null;

    const data = {
      labels: ['1M', '3M', '6M', '1Y', 'YTD'],
      datasets: [{
        data: portfolioData.performance,
        color: (opacity = 1) => `rgba(0, 212, 170, ${opacity})`,
        strokeWidth: 3,
      }],
    };

    return (
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>Portfolio Performance</Text>
        <LineChart
          data={data}
          width={width - 40}
          height={200}
          chartConfig={{
            backgroundColor: '#1a1a1a',
            backgroundGradientFrom: '#1a1a1a',
            backgroundGradientTo: '#1a1a1a',
            decimalPlaces: 2,
            color: (opacity = 1) => `rgba(0, 212, 170, ${opacity})`,
            labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
            style: {
              borderRadius: 16,
            },
            propsForDots: {
              r: '6',
              strokeWidth: '2',
              stroke: '#00D4AA',
            },
          }}
          bezier
          style={styles.chart}
        />
      </View>
    );
  };

  const renderAssetAllocation = () => {
    if (!portfolioData?.allocation) return null;

    const data = Object.entries(portfolioData.allocation).map(([key, value]) => ({
      name: key,
      population: value,
      color: getRandomColor(),
      legendFontColor: '#fff',
      legendFontSize: 12,
    }));

    return (
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>Asset Allocation</Text>
        <PieChart
          data={data}
          width={width - 40}
          height={200}
          chartConfig={{
            color: (opacity = 1) => `rgba(0, 212, 170, ${opacity})`,
          }}
          accessor="population"
          backgroundColor="transparent"
          paddingLeft="15"
          center={[10, 0]}
          absolute
        />
      </View>
    );
  };

  const getRandomColor = () => {
    const colors = ['#00D4AA', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7'];
    return colors[Math.floor(Math.random() * colors.length)];
  };

  const renderQuickActions = () => (
    <View style={styles.quickActionsContainer}>
      <Text style={styles.sectionTitle}>Quick Actions</Text>
      <View style={styles.quickActionsGrid}>
        <QuickActionButton
          icon="trending-up"
          title="Buy"
          onPress={() => handleQuickAction('buy')}
          color="#00D4AA"
        />
        <QuickActionButton
          icon="trending-down"
          title="Sell"
          onPress={() => handleQuickAction('sell')}
          color="#FF6B6B"
        />
        <QuickActionButton
          icon="account-balance-wallet"
          title="Portfolio"
          onPress={() => handleQuickAction('portfolio')}
          color="#4ECDC4"
        />
        <QuickActionButton
          icon="analytics"
          title="Analytics"
          onPress={() => handleQuickAction('analytics')}
          color="#45B7D1"
        />
        <QuickActionButton
          icon="psychology"
          title="AI Insights"
          onPress={() => handleQuickAction('ai_insights')}
          color="#96CEB4"
        />
        <QuickActionButton
          icon="account-balance"
          title="Web3"
          onPress={() => handleQuickAction('web3_connect')}
          color="#FFEAA7"
        />
        <QuickActionButton
          icon="view-in-ar"
          title="AR Trading"
          onPress={() => handleQuickAction('ar_trading')}
          color="#DDA0DD"
        />
        <QuickActionButton
          icon="mic"
          title="Voice"
          onPress={() => handleQuickAction('voice_trading')}
          color="#98D8C8"
        />
      </View>
    </View>
  );

  const renderAIInsights = () => {
    if (!aiInsights) return null;

    return (
      <View style={styles.insightsContainer}>
        <Text style={styles.sectionTitle}>AI Insights</Text>
        {aiInsights.map((insight, index) => (
          <AIInsightCard
            key={index}
            insight={insight}
            onPress={() => navigation.navigate('AI Insights')}
          />
        ))}
      </View>
    );
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Header */}
      <LinearGradient
        colors={['#00D4AA', '#4ECDC4']}
        style={styles.header}
      >
        <Text style={styles.welcomeText}>Welcome back!</Text>
        <Text style={styles.portfolioValue}>
          {portfolioData ? formatCurrency(portfolioData.totalValue) : '$0.00'}
        </Text>
        <Text style={styles.portfolioChange}>
          {portfolioData?.change ? formatPercentage(portfolioData.change) : '+0.00%'} today
        </Text>
      </LinearGradient>

      {/* Metrics */}
      <View style={styles.metricsContainer}>
        <MetricCard
          title="Total Value"
          value={portfolioData?.totalValue ? formatCurrency(portfolioData.totalValue) : '$0.00'}
          change={portfolioData?.change ? formatPercentage(portfolioData.change) : '+0.00%'}
          icon="account-balance-wallet"
          color="#00D4AA"
        />
        <MetricCard
          title="Today's P&L"
          value={portfolioData?.todayPL ? formatCurrency(portfolioData.todayPL) : '$0.00'}
          change={portfolioData?.todayPLChange ? formatPercentage(portfolioData.todayPLChange) : '+0.00%'}
          icon="trending-up"
          color="#4ECDC4"
        />
        <MetricCard
          title="Risk Score"
          value={portfolioData?.riskScore ? `${portfolioData.riskScore}/10` : '0/10'}
          change={portfolioData?.riskChange ? `${portfolioData.riskChange > 0 ? '+' : ''}${portfolioData.riskChange}` : '+0'}
          icon="warning"
          color="#FF6B6B"
        />
        <MetricCard
          title="AI Confidence"
          value={aiInsights?.confidence ? `${aiInsights.confidence}%` : '0%'}
          change={aiInsights?.confidenceChange ? `${aiInsights.confidenceChange > 0 ? '+' : ''}${aiInsights.confidenceChange}%` : '+0%'}
          icon="psychology"
          color="#96CEB4"
        />
      </View>

      {/* Charts */}
      {renderPortfolioChart()}
      {renderAssetAllocation()}

      {/* Quick Actions */}
      {renderQuickActions()}

      {/* AI Insights */}
      {renderAIInsights()}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  header: {
    padding: 20,
    paddingTop: 40,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  welcomeText: {
    fontSize: 16,
    color: '#fff',
    opacity: 0.9,
  },
  portfolioValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 5,
  },
  portfolioChange: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.8,
    marginTop: 5,
  },
  metricsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 20,
    justifyContent: 'space-between',
  },
  chartContainer: {
    margin: 20,
    backgroundColor: '#2a2a2a',
    borderRadius: 16,
    padding: 16,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
  },
  chart: {
    borderRadius: 16,
  },
  quickActionsContainer: {
    margin: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  insightsContainer: {
    margin: 20,
  },
});

export default DashboardScreen;
