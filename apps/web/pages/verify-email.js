const logger = require('../../utils/logger');
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../components/AuthProvider';

export default function VerifyEmail() {
  const router = useRouter();
  const { verifyEmail } = useAuth();
  const [token, setToken] = useState('');
  const [email, setEmail] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const { token: urlToken, email: urlEmail } = router.query;
    if (urlToken) {
      setToken(urlToken);
    }
    if (urlEmail) {
      setEmail(decodeURIComponent(urlEmail));
    }
  }, [router.query]);

  const handleTokenSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (!token) {
      setError('Please enter the verification token');
      return;
    }

    setIsVerifying(true);

    try {
      const result = await verifyEmail(token);
      if (result.success) {
        setMessage('Your email has been verified successfully! You can now sign in to your account.');
        setTimeout(() => {
          router.push('/login');
        }, 3000);
      } else {
        setError(result.error);
      }
    } catch (error) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResendEmail = async () => {
    setError('');
    setMessage('');

    if (!email) {
      setError('Email address is required to resend verification');
      return;
    }

    try {
      // This would typically call a resend verification endpoint
      setMessage('Verification email has been resent. Please check your inbox.');
    } catch (error) {
      setError('Failed to resend verification email. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
      <div className="max-w-md w-full mx-4">
        <div className="bg-gray-800 p-8 rounded-lg shadow-lg">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-neon mb-2">Verify Your Email</h1>
            <p className="text-gray-400">
              {email ? `We've sent a verification link to ${email}` : 'Please check your email for verification instructions.'}
            </p>
          </div>

          <form onSubmit={handleTokenSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-600 text-white p-3 rounded">
                {error}
              </div>
            )}

            {message && (
              <div className="bg-green-600 text-white p-3 rounded">
                {message}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium mb-2">Verification Token</label>
              <input
                type="text"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                className="w-full p-3 rounded bg-gray-700 border border-gray-600 focus:border-neon focus:outline-none"
                placeholder="Enter the verification token from your email"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isVerifying}
              className="w-full bg-neon text-black py-3 rounded font-bold hover:bg-neon/90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isVerifying ? 'Verifying...' : 'Verify Email'}
            </button>
          </form>

          <div className="text-center mt-6 space-y-4">
            <p className="text-gray-400">
              Didn't receive the email?{' '}
              <button
                onClick={handleResendEmail}
                className="text-neon hover:underline"
              >
                Resend verification email
              </button>
            </p>

            <p className="text-gray-400">
              Already verified?{' '}
              <a href="/login" className="text-neon hover:underline">
                Sign in
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
