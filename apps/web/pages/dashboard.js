const logger = require('../../utils/logger');
import React, { useState, useEffect } from 'react';
import { useAuth } from '../components/AuthProvider';
import { useRouter } from 'next/router';
import Dashboard from '../components/Dashboard';

export default function DashboardPage() {
  const [mounted, setMounted] = useState(false);
  const auth = useAuth();
  const router = useRouter();
  const user = auth?.user;
  const logout = auth?.logout;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && auth && !user) {
      router.push('/login');
    }
  }, [mounted, auth, user, router]);

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-white text-xl">Please log in.</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header with logout */}
      <div className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-neon">FinAI Nexus Dashboard</h1>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-gray-400">Welcome, {user.firstName || user.email}</span>
            <button 
              onClick={logout} 
              className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
      
      {/* Main Dashboard */}
      <Dashboard />
    </div>
  );
}
