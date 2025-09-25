const logger = require('../../utils/logger');
import React, { useState, useEffect } from 'react';
import { useAuth } from '../components/AuthProvider';
import { useRouter } from 'next/router';

export default function Login() {
  const [mounted, setMounted] = useState(false);
  const auth = useAuth();
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!mounted || !auth) return;
    
    try {
      const result = await auth.login(username, password);
      if (result.success) {
        router.push('/dashboard');
      } else {
        setError(result.error || 'Login failed');
      }
    } catch (error) {
      setError('An unexpected error occurred');
    }
  };

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900">
      <form onSubmit={handleSubmit} className="bg-gray-800 p-8 rounded shadow-lg w-full max-w-md">
        <h2 className="text-2xl text-neon mb-4">Sign In</h2>
        
        {error && (
          <div className="bg-red-600 text-white p-3 rounded mb-4">
            {error}
          </div>
        )}
        
        <input
          type="email"
          placeholder="Email"
          value={username}
          onChange={e => setUsername(e.target.value)}
          className="block w-full mb-4 p-3 rounded bg-gray-700 text-white border border-gray-600 focus:border-neon focus:outline-none"
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          className="block w-full mb-4 p-3 rounded bg-gray-700 text-white border border-gray-600 focus:border-neon focus:outline-none"
          required
        />
        <button 
          type="submit" 
          className="w-full bg-neon text-black py-3 rounded font-bold hover:bg-neon/90"
          disabled={auth?.loading}
        >
          {auth?.loading ? 'Signing In...' : 'Sign In'}
        </button>
        
        <div className="text-center mt-4">
          <a href="/forgot-password" className="text-neon hover:underline text-sm">
            Forgot Password?
          </a>
        </div>
        
        <div className="text-center mt-4">
          <p className="text-gray-400 text-sm">
            Don't have an account?{' '}
            <a href="/signup" className="text-neon hover:underline">
              Sign up
            </a>
          </p>
        </div>
      </form>
    </div>
  );
}
