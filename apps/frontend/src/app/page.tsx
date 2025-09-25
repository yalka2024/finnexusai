'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface User {
  id: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  status: string;
  role: string;
}

interface Portfolio {
  id: string;
  name: string;
  currentBalance: number;
  totalReturn: number;
  totalReturnPercentage: number;
  holdingCount: number;
}

export default function HomePage() {
  const [user, setUser] = useState<User | null>(null);
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);

  // Login form state
  const [loginData, setLoginData] = useState({
    email: 'admin@finainexus.com',
    password: 'admin123'
  });

  // Portfolio form state
  const [portfolioData, setPortfolioData] = useState({
    name: '',
    description: '',
    initialBalance: 10000
  });

  // Check for existing token on mount
  useEffect(() => {
    const savedToken = localStorage.getItem('authToken');
    if (savedToken) {
      setToken(savedToken);
      verifyToken(savedToken);
    }
  }, []);

  const apiCall = async (endpoint: string, options: RequestInit = {}) => {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
    
    const response = await fetch(`${baseUrl}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'API request failed');
    }

    return response.json();
  };

  const handleLogin = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await apiCall('/api/v1/auth/login', {
        method: 'POST',
        body: JSON.stringify(loginData),
      });

      if (response.success) {
        setToken(response.accessToken);
        setUser(response.user);
        localStorage.setItem('authToken', response.accessToken);
        await loadPortfolios();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setToken(null);
    setUser(null);
    setPortfolios([]);
    localStorage.removeItem('authToken');
  };

  const verifyToken = async (tokenToVerify: string) => {
    try {
      const response = await apiCall('/api/v1/auth/verify', {
        headers: { Authorization: `Bearer ${tokenToVerify}` },
      });

      if (response.success) {
        setUser(response.user);
        await loadPortfolios();
      }
    } catch (err) {
      localStorage.removeItem('authToken');
      setToken(null);
    }
  };

  const loadPortfolios = async () => {
    try {
      const response = await apiCall('/api/v1/portfolio');
      if (response.success) {
        setPortfolios(response.portfolios);
      }
    } catch (err) {
      console.error('Failed to load portfolios:', err);
    }
  };

  const createPortfolio = async () => {
    if (!portfolioData.name) {
      setError('Portfolio name is required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await apiCall('/api/v1/portfolio', {
        method: 'POST',
        body: JSON.stringify(portfolioData),
      });

      if (response.success) {
        setPortfolioData({ name: '', description: '', initialBalance: 10000 });
        await loadPortfolios();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create portfolio');
    } finally {
      setLoading(false);
    }
  };

  const getPortfolioValue = (portfolio: Portfolio) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(portfolio.currentBalance);
  };

  const getReturnColor = (returnPercentage: number) => {
    return returnPercentage >= 0 ? 'text-green-600' : 'text-red-600';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              FinNexusAI Platform
            </h1>
            <p className="text-lg text-gray-600">
              AI-Powered Financial Management Platform
            </p>
          </div>

          {/* Error Alert */}
          {error && (
            <Alert className="mb-6 border-red-200 bg-red-50">
              <AlertDescription className="text-red-800">
                {error}
              </AlertDescription>
            </Alert>
          )}

          {/* Main Content */}
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="login">Authentication</TabsTrigger>
              <TabsTrigger value="portfolio">Portfolio Management</TabsTrigger>
              <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            </TabsList>

            {/* Authentication Tab */}
            <TabsContent value="login" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Login to FinNexusAI</CardTitle>
                  <CardDescription>
                    Use the demo credentials to test the platform
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Email</label>
                    <Input
                      type="email"
                      value={loginData.email}
                      onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                      placeholder="admin@finainexus.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Password</label>
                    <Input
                      type="password"
                      value={loginData.password}
                      onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                      placeholder="admin123"
                    />
                  </div>
                  <Button 
                    onClick={handleLogin} 
                    disabled={loading}
                    className="w-full"
                  >
                    {loading ? 'Logging in...' : 'Login'}
                  </Button>
                  
                  {user && (
                    <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                      <p className="text-green-800 font-medium">Logged in successfully!</p>
                      <p className="text-green-600 text-sm">
                        Welcome, {user.firstName} {user.lastName} ({user.email})
                      </p>
                      <Button 
                        onClick={handleLogout}
                        variant="outline"
                        size="sm"
                        className="mt-2"
                      >
                        Logout
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Portfolio Management Tab */}
            <TabsContent value="portfolio" className="space-y-6">
              {!user ? (
                <Card>
                  <CardContent className="p-6 text-center">
                    <p className="text-gray-600">Please login to access portfolio management</p>
                  </CardContent>
                </Card>
              ) : (
                <>
                  {/* Create Portfolio */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Create New Portfolio</CardTitle>
                      <CardDescription>
                        Create a new portfolio to start managing your investments
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Portfolio Name</label>
                          <Input
                            value={portfolioData.name}
                            onChange={(e) => setPortfolioData({ ...portfolioData, name: e.target.value })}
                            placeholder="My Investment Portfolio"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Initial Balance</label>
                          <Input
                            type="number"
                            value={portfolioData.initialBalance}
                            onChange={(e) => setPortfolioData({ ...portfolioData, initialBalance: parseFloat(e.target.value) })}
                            placeholder="10000"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Description</label>
                          <Input
                            value={portfolioData.description}
                            onChange={(e) => setPortfolioData({ ...portfolioData, description: e.target.value })}
                            placeholder="Long-term growth portfolio"
                          />
                        </div>
                      </div>
                      <Button 
                        onClick={createPortfolio} 
                        disabled={loading || !portfolioData.name}
                        className="w-full"
                      >
                        {loading ? 'Creating...' : 'Create Portfolio'}
                      </Button>
                    </CardContent>
                  </Card>

                  {/* Portfolios List */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {portfolios.map((portfolio) => (
                      <Card key={portfolio.id}>
                        <CardHeader>
                          <CardTitle className="text-lg">{portfolio.name}</CardTitle>
                          <CardDescription>
                            {portfolio.holdingCount} holdings
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            <div className="flex justify-between">
                              <span className="text-sm text-gray-600">Current Value:</span>
                              <span className="font-medium">{getPortfolioValue(portfolio)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm text-gray-600">Total Return:</span>
                              <span className={`font-medium ${getReturnColor(portfolio.totalReturnPercentage)}`}>
                                {portfolio.totalReturnPercentage.toFixed(2)}%
                              </span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  {portfolios.length === 0 && (
                    <Card>
                      <CardContent className="p-6 text-center">
                        <p className="text-gray-600">No portfolios found. Create your first portfolio above.</p>
                      </CardContent>
                    </Card>
                  )}
                </>
              )}
            </TabsContent>

            {/* Dashboard Tab */}
            <TabsContent value="dashboard" className="space-y-6">
              {!user ? (
                <Card>
                  <CardContent className="p-6 text-center">
                    <p className="text-gray-600">Please login to view the dashboard</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm font-medium text-gray-600">Total Portfolios</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{portfolios.length}</div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm font-medium text-gray-600">Total Value</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {new Intl.NumberFormat('en-US', {
                          style: 'currency',
                          currency: 'USD',
                        }).format(portfolios.reduce((sum, p) => sum + p.currentBalance, 0))}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm font-medium text-gray-600">Average Return</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {portfolios.length > 0 
                          ? (portfolios.reduce((sum, p) => sum + p.totalReturnPercentage, 0) / portfolios.length).toFixed(2)
                          : 0}%
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm font-medium text-gray-600">User Role</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold capitalize">{user.role}</div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}