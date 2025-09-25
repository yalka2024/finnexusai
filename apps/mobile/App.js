/**
 * FinAI Nexus Mobile App
 * 
 * React Native mobile application for FinAI Nexus platform
 * Features: Trading, Portfolio Management, AI Insights, Web3 Integration
 */

import React, { useEffect, useState } from 'react';
import {
  SafeAreaView,
  StatusBar,
  StyleSheet,
  View,
  Text,
  Alert,
  Platform,
  PermissionsAndroid,
} from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Provider } from 'react-redux';
import { QueryClient, QueryClientProvider } from 'react-query';
import FlashMessage from 'react-native-flash-message';

// Store
import { store } from './src/store/store';

// Screens
import SplashScreen from './src/screens/SplashScreen';
import LoginScreen from './src/screens/LoginScreen';
import SignupScreen from './src/screens/SignupScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import PortfolioScreen from './src/screens/PortfolioScreen';
import TradingScreen from './src/screens/TradingScreen';
import AnalyticsScreen from './src/screens/AnalyticsScreen';
import ComplianceScreen from './src/screens/ComplianceScreen';
import AIInsightsScreen from './src/screens/AIInsightsScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import Web3ConnectScreen from './src/screens/Web3ConnectScreen';
import ARTradingScreen from './src/screens/ARTradingScreen';
import VoiceTradingScreen from './src/screens/VoiceTradingScreen';
import IslamicFinanceScreen from './src/screens/IslamicFinanceScreen';

// Services
import { AuthService } from './src/services/AuthService';
import { Web3Service } from './src/services/Web3Service';
import { AIService } from './src/services/AIService';
import { NotificationService } from './src/services/NotificationService';

// Utils
import { requestPermissions } from './src/utils/permissions';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();
const queryClient = new QueryClient();

// Main Tab Navigator
function MainTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          switch (route.name) {
          case 'Dashboard':
            iconName = 'dashboard';
            break;
          case 'Portfolio':
            iconName = 'account-balance-wallet';
            break;
          case 'Trading':
            iconName = 'trending-up';
            break;
          case 'Analytics':
            iconName = 'analytics';
            break;
          case 'AI Insights':
            iconName = 'psychology';
            break;
          case 'Profile':
            iconName = 'person';
            break;
          default:
            iconName = 'help';
          }

          return <Icon name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#00D4AA',
        tabBarInactiveTintColor: '#666',
        tabBarStyle: {
          backgroundColor: '#1a1a1a',
          borderTopColor: '#333',
          height: Platform.OS === 'ios' ? 90 : 70,
          paddingBottom: Platform.OS === 'ios' ? 25 : 10,
        },
        headerStyle: {
          backgroundColor: '#1a1a1a',
          borderBottomColor: '#333',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      })}
    >
      <Tab.Screen 
        name="Dashboard" 
        component={DashboardScreen}
        options={{ title: 'Dashboard' }}
      />
      <Tab.Screen 
        name="Portfolio" 
        component={PortfolioScreen}
        options={{ title: 'Portfolio' }}
      />
      <Tab.Screen 
        name="Trading" 
        component={TradingScreen}
        options={{ title: 'Trading' }}
      />
      <Tab.Screen 
        name="Analytics" 
        component={AnalyticsScreen}
        options={{ title: 'Analytics' }}
      />
      <Tab.Screen 
        name="AI Insights" 
        component={AIInsightsScreen}
        options={{ title: 'AI Insights' }}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen}
        options={{ title: 'Profile' }}
      />
    </Tab.Navigator>
  );
}

// Main App Component
function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      // Request permissions
      await requestPermissions();

      // Initialize services
      await AuthService.initialize();
      await Web3Service.initialize();
      await AIService.initialize();
      await NotificationService.initialize();

      // Check authentication status
      const authStatus = await AuthService.checkAuthStatus();
      setIsAuthenticated(authStatus.isAuthenticated);
      setUser(authStatus.user);

      setIsLoading(false);
    } catch (error) {
      console.error('Error initializing app:', error);
      Alert.alert('Error', 'Failed to initialize app. Please restart.');
      setIsLoading(false);
    }
  };

  const handleLogin = async (credentials) => {
    try {
      const result = await AuthService.login(credentials);
      if (result.success) {
        setIsAuthenticated(true);
        setUser(result.user);
      } else {
        Alert.alert('Login Failed', result.error);
      }
    } catch (error) {
      Alert.alert('Error', 'Login failed. Please try again.');
    }
  };

  const handleLogout = async () => {
    try {
      await AuthService.logout();
      setIsAuthenticated(false);
      setUser(null);
    } catch (error) {
      Alert.alert('Error', 'Logout failed. Please try again.');
    }
  };

  if (isLoading) {
    return <SplashScreen />;
  }

  return (
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <SafeAreaView style={styles.container}>
          <StatusBar barStyle="light-content" backgroundColor="#1a1a1a" />
          
          <NavigationContainer>
            <Stack.Navigator
              screenOptions={{
                headerStyle: {
                  backgroundColor: '#1a1a1a',
                  borderBottomColor: '#333',
                },
                headerTintColor: '#fff',
                headerTitleStyle: {
                  fontWeight: 'bold',
                },
              }}
            >
              {!isAuthenticated ? (
                // Authentication Screens
                <>
                  <Stack.Screen 
                    name="Login" 
                    options={{ headerShown: false }}
                  >
                    {(props) => (
                      <LoginScreen 
                        {...props} 
                        onLogin={handleLogin}
                      />
                    )}
                  </Stack.Screen>
                  <Stack.Screen 
                    name="Signup" 
                    component={SignupScreen}
                    options={{ title: 'Create Account' }}
                  />
                </>
              ) : (
                // Main App Screens
                <>
                  <Stack.Screen 
                    name="Main" 
                    component={MainTabNavigator}
                    options={{ headerShown: false }}
                  />
                  <Stack.Screen 
                    name="Settings" 
                    component={SettingsScreen}
                    options={{ title: 'Settings' }}
                  />
                  <Stack.Screen 
                    name="Web3Connect" 
                    component={Web3ConnectScreen}
                    options={{ title: 'Connect Wallet' }}
                  />
                  <Stack.Screen 
                    name="ARTrading" 
                    component={ARTradingScreen}
                    options={{ title: 'AR Trading' }}
                  />
                  <Stack.Screen 
                    name="VoiceTrading" 
                    component={VoiceTradingScreen}
                    options={{ title: 'Voice Trading' }}
                  />
                  <Stack.Screen 
                    name="IslamicFinance" 
                    component={IslamicFinanceScreen}
                    options={{ title: 'Islamic Finance' }}
                  />
                </>
              )}
            </Stack.Navigator>
          </NavigationContainer>

          <FlashMessage position="top" />
        </SafeAreaView>
      </QueryClientProvider>
    </Provider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
});

export default App;