const logger = require('../../utils/logger');
/**
 * FinAI Nexus - Islamic Finance Mode Component
 * 
 * Shari'ah-compliant financial interface featuring:
 * - Halal investment screening
 * - Islamic financial products
 * - Zakat calculation and tracking
 * - Shari'ah-compliant trading
 * - Islamic banking integration
 */

import React, { useState, useEffect } from 'react';
import { useTranslation } from './Internationalization';

const IslamicFinanceMode = ({ isActive, onToggle }) => {
  const { t } = useTranslation();
  const [islamicMode, setIslamicMode] = useState(isActive);
  const [halalAssets, setHalalAssets] = useState([]);
  const [zakatCalculation, setZakatCalculation] = useState(null);
  const [shariahCompliance, setShariahCompliance] = useState({});
  const [islamicProducts, setIslamicProducts] = useState([]);
  const [zakatHistory, setZakatHistory] = useState([]);

  useEffect(() => {
    if (islamicMode) {
      loadHalalAssets();
      loadZakatCalculation();
      loadShariahCompliance();
      loadIslamicProducts();
      loadZakatHistory();
    }
  }, [islamicMode]);

  const loadHalalAssets = async () => {
    try {
      const response = await fetch('/api/islamic/halal-assets');
      const data = await response.json();
      setHalalAssets(data.assets || []);
    } catch (error) {
      logger.error('Error loading halal assets:', error);
    }
  };

  const loadZakatCalculation = async () => {
    try {
      const response = await fetch('/api/islamic/zakat-calculation');
      const data = await response.json();
      setZakatCalculation(data);
    } catch (error) {
      logger.error('Error loading zakat calculation:', error);
    }
  };

  const loadShariahCompliance = async () => {
    try {
      const response = await fetch('/api/islamic/compliance');
      const data = await response.json();
      setShariahCompliance(data);
    } catch (error) {
      logger.error('Error loading shariah compliance:', error);
    }
  };

  const loadIslamicProducts = async () => {
    try {
      const response = await fetch('/api/islamic/products');
      const data = await response.json();
      setIslamicProducts(data.products || []);
    } catch (error) {
      logger.error('Error loading islamic products:', error);
    }
  };

  const loadZakatHistory = async () => {
    try {
      const response = await fetch('/api/islamic/zakat-history');
      const data = await response.json();
      setZakatHistory(data.history || []);
    } catch (error) {
      logger.error('Error loading zakat history:', error);
    }
  };

  const calculateZakat = (assets) => {
    const nisab = 85; // grams of gold (current value)
    const zakatRate = 0.025; // 2.5%
    
    const totalValue = assets.reduce((sum, asset) => sum + asset.value, 0);
    const isZakatable = totalValue >= nisab;
    const zakatAmount = isZakatable ? totalValue * zakatRate : 0;
    
    return {
      totalValue,
      nisab,
      isZakatable,
      zakatAmount,
      zakatRate: zakatRate * 100
    };
  };

  const getShariahStatus = (asset) => {
    if (asset.shariahCompliant === true) {
      return { status: 'compliant', color: 'green', icon: '✅' };
    } else if (asset.shariahCompliant === false) {
      return { status: 'non-compliant', color: 'red', icon: '❌' };
    } else {
      return { status: 'under-review', color: 'yellow', icon: '⏳' };
    }
  };

  const getIslamicProductIcon = (type) => {
    const icons = {
      'sukuk': '📜',
      'murabaha': '🤝',
      'musharaka': '🤲',
      'ijara': '🏠',
      'wakala': '👥',
      'mudaraba': '💼'
    };
    return icons[type] || '💰';
  };

  const getIslamicProductDescription = (type) => {
    const descriptions = {
      'sukuk': 'Shari\'ah-compliant bonds representing ownership in underlying assets',
      'murabaha': 'Cost-plus financing for purchasing goods',
      'musharaka': 'Partnership-based profit and loss sharing',
      'ijara': 'Lease-based financing for real estate and equipment',
      'wakala': 'Agency-based investment management',
      'mudaraba': 'Profit-sharing investment partnership'
    };
    return descriptions[type] || 'Islamic financial product';
  };

  if (!islamicMode) {
    return (
      <div className="islamic-finance-toggle bg-gray-800 p-6 rounded-lg">
        <div className="text-center">
          <div className="text-6xl mb-4">🕌</div>
          <h2 className="text-2xl font-bold text-neon mb-4">
            {t('islamic.mode_title', 'Islamic Finance Mode')}
          </h2>
          <p className="text-gray-400 mb-6">
            {t('islamic.mode_description', 'Access Shari\'ah-compliant financial products and services')}
          </p>
          <button
            onClick={() => {
              setIslamicMode(true);
              onToggle(true);
            }}
            className="bg-neon text-black px-8 py-3 rounded-lg font-bold hover:bg-neon/90 transition-colors"
          >
            {t('islamic.enable_mode', 'Enable Islamic Finance Mode')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="islamic-finance-mode bg-gray-800 p-6 rounded-lg">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <div className="text-4xl">🕌</div>
          <div>
            <h2 className="text-2xl font-bold text-neon">
              {t('islamic.mode_title', 'Islamic Finance Mode')}
            </h2>
            <p className="text-gray-400">
              {t('islamic.mode_active', 'Shari\'ah-compliant financial services')}
            </p>
          </div>
        </div>
        <button
          onClick={() => {
            setIslamicMode(false);
            onToggle(false);
          }}
          className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
        >
          {t('common.disable', 'Disable')}
        </button>
      </div>

      {/* Shariah Compliance Status */}
      <div className="mb-6 p-4 bg-gray-700 rounded-lg">
        <h3 className="text-lg font-semibold text-white mb-3">
          {t('islamic.compliance_status', 'Shari\'ah Compliance Status')}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl mb-2">✅</div>
            <div className="text-sm text-gray-400">Compliant Assets</div>
            <div className="text-lg font-bold text-green-400">
              {shariahCompliance.compliant || 0}
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl mb-2">❌</div>
            <div className="text-sm text-gray-400">Non-Compliant</div>
            <div className="text-lg font-bold text-red-400">
              {shariahCompliance.nonCompliant || 0}
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl mb-2">⏳</div>
            <div className="text-sm text-gray-400">Under Review</div>
            <div className="text-lg font-bold text-yellow-400">
              {shariahCompliance.underReview || 0}
            </div>
          </div>
        </div>
      </div>

      {/* Halal Assets */}
      <div className="mb-6">
        <h3 className="text-xl font-semibold text-white mb-4">
          {t('islamic.halal_assets', 'Halal Investment Assets')}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {halalAssets.map((asset) => {
            const shariahStatus = getShariahStatus(asset);
            return (
              <div
                key={asset.id}
                className={`p-4 rounded-lg border-2 ${
                  shariahStatus.status === 'compliant'
                    ? 'border-green-500 bg-green-500/10'
                    : shariahStatus.status === 'non-compliant'
                      ? 'border-red-500 bg-red-500/10'
                      : 'border-yellow-500 bg-yellow-500/10'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <span className="text-2xl">{asset.icon}</span>
                    <div>
                      <h4 className="font-semibold text-white">{asset.name}</h4>
                      <p className="text-sm text-gray-400">{asset.symbol}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-white">
                      ${asset.price?.toLocaleString()}
                    </div>
                    <div className="text-sm text-gray-400">
                      {asset.change > 0 ? '+' : ''}{asset.change}%
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-lg">{shariahStatus.icon}</span>
                    <span className={`text-sm font-medium text-${shariahStatus.color}-400`}>
                      {shariahStatus.status.toUpperCase()}
                    </span>
                  </div>
                  <button
                    className={`px-3 py-1 rounded text-sm font-medium ${
                      shariahStatus.status === 'compliant'
                        ? 'bg-green-600 text-white hover:bg-green-700'
                        : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                    }`}
                    disabled={shariahStatus.status !== 'compliant'}
                  >
                    {t('islamic.invest', 'Invest')}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Islamic Financial Products */}
      <div className="mb-6">
        <h3 className="text-xl font-semibold text-white mb-4">
          {t('islamic.products', 'Islamic Financial Products')}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {islamicProducts.map((product) => (
            <div
              key={product.id}
              className="p-4 bg-gray-700 rounded-lg border border-gray-600 hover:border-neon transition-colors"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <span className="text-3xl">{getIslamicProductIcon(product.type)}</span>
                  <div>
                    <h4 className="font-semibold text-white">{product.name}</h4>
                    <p className="text-sm text-gray-400 capitalize">{product.type}</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-neon">
                    {product.expectedReturn}%
                  </div>
                  <div className="text-sm text-gray-400">Expected Return</div>
                </div>
              </div>
              <p className="text-sm text-gray-300 mb-4">
                {getIslamicProductDescription(product.type)}
              </p>
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-400">
                  Min: ${product.minInvestment?.toLocaleString()}
                </div>
                <button className="bg-neon text-black px-4 py-2 rounded hover:bg-neon/90 font-medium">
                  {t('islamic.invest', 'Invest')}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Zakat Calculator */}
      <div className="mb-6">
        <h3 className="text-xl font-semibold text-white mb-4">
          {t('islamic.zakat_calculator', 'Zakat Calculator')}
        </h3>
        <div className="bg-gray-700 p-6 rounded-lg">
          {zakatCalculation ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-lg font-semibold text-white mb-4">
                  {t('islamic.zakat_summary', 'Zakat Summary')}
                </h4>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Total Assets:</span>
                    <span className="text-white font-bold">
                      ${zakatCalculation.totalValue?.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Nisab (Gold):</span>
                    <span className="text-white font-bold">
                      ${zakatCalculation.nisab?.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Zakat Rate:</span>
                    <span className="text-white font-bold">
                      {zakatCalculation.zakatRate}%
                    </span>
                  </div>
                  <div className="flex justify-between text-lg">
                    <span className="text-gray-400">Zakat Due:</span>
                    <span className={`font-bold ${
                      zakatCalculation.isZakatable ? 'text-neon' : 'text-gray-400'
                    }`}>
                      ${zakatCalculation.zakatAmount?.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
              <div>
                <h4 className="text-lg font-semibold text-white mb-4">
                  {t('islamic.zakat_status', 'Zakat Status')}
                </h4>
                <div className="text-center">
                  <div className={`text-6xl mb-4 ${
                    zakatCalculation.isZakatable ? 'text-neon' : 'text-gray-400'
                  }`}>
                    {zakatCalculation.isZakatable ? '💰' : '✅'}
                  </div>
                  <div className={`text-lg font-bold ${
                    zakatCalculation.isZakatable ? 'text-neon' : 'text-gray-400'
                  }`}>
                    {zakatCalculation.isZakatable
                      ? t('islamic.zakat_due', 'Zakat is Due')
                      : t('islamic.zakat_not_due', 'Zakat Not Due')}
                  </div>
                  <p className="text-sm text-gray-400 mt-2">
                    {zakatCalculation.isZakatable
                      ? t('islamic.zakat_explanation', 'Your assets exceed the nisab threshold')
                      : t('islamic.zakat_explanation_not', 'Your assets are below the nisab threshold')}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center text-gray-400">
              {t('islamic.loading_zakat', 'Loading zakat calculation...')}
            </div>
          )}
        </div>
      </div>

      {/* Zakat History */}
      <div className="mb-6">
        <h3 className="text-xl font-semibold text-white mb-4">
          {t('islamic.zakat_history', 'Zakat Payment History')}
        </h3>
        <div className="bg-gray-700 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-600">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">
                    {t('islamic.date', 'Date')}
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">
                    {t('islamic.amount', 'Amount')}
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">
                    {t('islamic.recipient', 'Recipient')}
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">
                    {t('islamic.status', 'Status')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-600">
                {zakatHistory.map((payment, index) => (
                  <tr key={index} className="hover:bg-gray-600">
                    <td className="px-4 py-3 text-sm text-gray-300">
                      {new Date(payment.date).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-sm text-white font-medium">
                      ${payment.amount.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-300">
                      {payment.recipient}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        payment.status === 'completed'
                          ? 'bg-green-600 text-white'
                          : payment.status === 'pending'
                            ? 'bg-yellow-600 text-white'
                            : 'bg-red-600 text-white'
                      }`}>
                        {payment.status.toUpperCase()}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Islamic Finance Principles */}
      <div className="mb-6">
        <h3 className="text-xl font-semibold text-white mb-4">
          {t('islamic.principles', 'Islamic Finance Principles')}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            {
              principle: 'Riba (Interest)',
              description: 'Prohibition of interest-based transactions',
              icon: '🚫'
            },
            {
              principle: 'Gharar (Uncertainty)',
              description: 'Avoidance of excessive uncertainty and speculation',
              icon: '⚠️'
            },
            {
              principle: 'Maysir (Gambling)',
              description: 'Prohibition of gambling and pure speculation',
              icon: '🎲'
            },
            {
              principle: 'Halal Business',
              description: 'Investment only in Shari\'ah-compliant businesses',
              icon: '✅'
            },
            {
              principle: 'Social Responsibility',
              description: 'Consideration of social and environmental impact',
              icon: '🌍'
            },
            {
              principle: 'Asset-Backed',
              description: 'All investments must be backed by real assets',
              icon: '🏠'
            }
          ].map((principle, index) => (
            <div key={index} className="p-4 bg-gray-700 rounded-lg">
              <div className="flex items-center space-x-3 mb-3">
                <span className="text-2xl">{principle.icon}</span>
                <h4 className="font-semibold text-white">{principle.principle}</h4>
              </div>
              <p className="text-sm text-gray-300">{principle.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default IslamicFinanceMode;
