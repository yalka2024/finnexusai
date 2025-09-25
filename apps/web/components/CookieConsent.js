const logger = require('../../utils/logger');
/**
 * Cookie Consent Component
 * 
 * GDPR/CCPA compliant cookie consent management
 */

import React, { useState, useEffect } from 'react';

const CookieConsent = () => {
  const [showBanner, setShowBanner] = useState(false);
  const [preferences, setPreferences] = useState({
    necessary: true, // Always required
    analytics: false,
    marketing: false,
    personalization: false,
    social: false
  });
  const [showPreferences, setShowPreferences] = useState(false);

  useEffect(() => {
    // Check if user has already given consent
    const consent = localStorage.getItem('cookieConsent');
    if (!consent) {
      setShowBanner(true);
    } else {
      const savedPreferences = JSON.parse(consent);
      setPreferences(savedPreferences);
      // Apply saved preferences
      applyCookiePreferences(savedPreferences);
    }
  }, []);

  const applyCookiePreferences = (prefs) => {
    // Apply analytics cookies
    if (prefs.analytics) {
      // Enable Google Analytics, Mixpanel, etc.
      window.gtag && window.gtag('consent', 'update', {
        'analytics_storage': 'granted'
      });
    } else {
      // Disable analytics
      window.gtag && window.gtag('consent', 'update', {
        'analytics_storage': 'denied'
      });
    }

    // Apply marketing cookies
    if (prefs.marketing) {
      // Enable marketing tracking
      window.fbq && window.fbq('consent', 'grant');
    } else {
      // Disable marketing tracking
      window.fbq && window.fbq('consent', 'revoke');
    }

    // Apply personalization cookies
    if (prefs.personalization) {
      // Enable AI personalization
      localStorage.setItem('aiPersonalization', 'enabled');
    } else {
      localStorage.removeItem('aiPersonalization');
    }

    // Apply social media cookies
    if (prefs.social) {
      // Enable social media widgets
      localStorage.setItem('socialWidgets', 'enabled');
    } else {
      localStorage.removeItem('socialWidgets');
    }
  };

  const handleAcceptAll = () => {
    const allAccepted = {
      necessary: true,
      analytics: true,
      marketing: true,
      personalization: true,
      social: true
    };
    
    setPreferences(allAccepted);
    localStorage.setItem('cookieConsent', JSON.stringify(allAccepted));
    localStorage.setItem('cookieConsentDate', new Date().toISOString());
    applyCookiePreferences(allAccepted);
    setShowBanner(false);
  };

  const handleAcceptNecessary = () => {
    const necessaryOnly = {
      necessary: true,
      analytics: false,
      marketing: false,
      personalization: false,
      social: false
    };
    
    setPreferences(necessaryOnly);
    localStorage.setItem('cookieConsent', JSON.stringify(necessaryOnly));
    localStorage.setItem('cookieConsentDate', new Date().toISOString());
    applyCookiePreferences(necessaryOnly);
    setShowBanner(false);
  };

  const handleSavePreferences = () => {
    localStorage.setItem('cookieConsent', JSON.stringify(preferences));
    localStorage.setItem('cookieConsentDate', new Date().toISOString());
    applyCookiePreferences(preferences);
    setShowBanner(false);
    setShowPreferences(false);
  };

  const handlePreferenceChange = (category) => {
    if (category === 'necessary') return; // Can't change necessary cookies
    
    setPreferences(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  const handleWithdrawConsent = () => {
    localStorage.removeItem('cookieConsent');
    localStorage.removeItem('cookieConsentDate');
    setShowBanner(true);
    setShowPreferences(false);
  };

  if (!showBanner) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <button
          onClick={() => setShowBanner(true)}
          className="bg-gray-800 text-white px-4 py-2 rounded-lg shadow-lg hover:bg-gray-700 text-sm"
        >
          Cookie Settings
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
        {!showPreferences ? (
          // Main consent banner
          <div className="p-6">
            <div className="flex items-start justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Cookie Consent</h2>
              <button
                onClick={() => setShowBanner(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <p className="text-gray-700 mb-6">
              We use cookies to enhance your experience, analyze site usage, and assist in our marketing efforts. 
              By clicking "Accept All", you consent to our use of cookies. You can manage your preferences at any time.
            </p>

            <div className="mb-6">
              <h3 className="font-semibold text-gray-900 mb-2">Cookie Categories:</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li><strong>Necessary:</strong> Essential for website functionality</li>
                <li><strong>Analytics:</strong> Help us understand how you use our site</li>
                <li><strong>Marketing:</strong> Used to deliver relevant advertisements</li>
                <li><strong>Personalization:</strong> Enable AI-powered features</li>
                <li><strong>Social Media:</strong> Enable social media integration</li>
              </ul>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleAcceptNecessary}
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
              >
                Necessary Only
              </button>
              <button
                onClick={() => setShowPreferences(true)}
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
              >
                Customize
              </button>
              <button
                onClick={handleAcceptAll}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
              >
                Accept All
              </button>
            </div>

            <div className="mt-4 text-xs text-gray-500">
              <p>
                For more information, please read our{' '}
                <a href="/privacy-policy" className="text-blue-600 hover:underline">Privacy Policy</a>
                {' '}and{' '}
                <a href="/cookie-policy" className="text-blue-600 hover:underline">Cookie Policy</a>.
              </p>
            </div>
          </div>
        ) : (
          // Detailed preferences
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Cookie Preferences</h2>
              <button
                onClick={() => setShowPreferences(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            </div>

            <div className="space-y-4 mb-6">
              {/* Necessary Cookies */}
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900">Necessary Cookies</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Essential for website functionality, security, and basic features.
                    </p>
                  </div>
                  <div className="flex items-center">
                    <span className="text-sm text-gray-500 mr-3">Always Active</span>
                    <div className="w-12 h-6 bg-blue-600 rounded-full flex items-center justify-end pr-1">
                      <div className="w-5 h-5 bg-white rounded-full"></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Analytics Cookies */}
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900">Analytics Cookies</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Help us understand how visitors interact with our website.
                    </p>
                  </div>
                  <button
                    onClick={() => handlePreferenceChange('analytics')}
                    className={`w-12 h-6 rounded-full flex items-center transition-colors ${
                      preferences.analytics ? 'bg-blue-600 justify-end pr-1' : 'bg-gray-300 justify-start pl-1'
                    }`}
                  >
                    <div className="w-5 h-5 bg-white rounded-full"></div>
                  </button>
                </div>
              </div>

              {/* Marketing Cookies */}
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900">Marketing Cookies</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Used to deliver relevant advertisements and track campaign performance.
                    </p>
                  </div>
                  <button
                    onClick={() => handlePreferenceChange('marketing')}
                    className={`w-12 h-6 rounded-full flex items-center transition-colors ${
                      preferences.marketing ? 'bg-blue-600 justify-end pr-1' : 'bg-gray-300 justify-start pl-1'
                    }`}
                  >
                    <div className="w-5 h-5 bg-white rounded-full"></div>
                  </button>
                </div>
              </div>

              {/* Personalization Cookies */}
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900">Personalization Cookies</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Enable AI-powered features and personalized content.
                    </p>
                  </div>
                  <button
                    onClick={() => handlePreferenceChange('personalization')}
                    className={`w-12 h-6 rounded-full flex items-center transition-colors ${
                      preferences.personalization ? 'bg-blue-600 justify-end pr-1' : 'bg-gray-300 justify-start pl-1'
                    }`}
                  >
                    <div className="w-5 h-5 bg-white rounded-full"></div>
                  </button>
                </div>
              </div>

              {/* Social Media Cookies */}
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900">Social Media Cookies</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Enable social media integration and sharing features.
                    </p>
                  </div>
                  <button
                    onClick={() => handlePreferenceChange('social')}
                    className={`w-12 h-6 rounded-full flex items-center transition-colors ${
                      preferences.social ? 'bg-blue-600 justify-end pr-1' : 'bg-gray-300 justify-start pl-1'
                    }`}
                  >
                    <div className="w-5 h-5 bg-white rounded-full"></div>
                  </button>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleWithdrawConsent}
                className="px-6 py-3 text-gray-600 hover:text-gray-800 font-medium"
              >
                Withdraw Consent
              </button>
              <button
                onClick={handleSavePreferences}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
              >
                Save Preferences
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CookieConsent;
