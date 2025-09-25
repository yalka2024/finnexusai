const logger = require('../../utils/logger');
/**
 * FinAI Nexus - Internationalization Component
 * 
 * Advanced multilingual support featuring:
 * - English, Arabic, Mandarin support
 * - RTL (Right-to-Left) layout support
 * - Dynamic language switching
 * - Cultural adaptation
 * - Financial terminology localization
 */

import React, { useState, useEffect, createContext, useContext } from 'react';

// Translation context
const TranslationContext = createContext();

// Translation hook
export const useTranslation = () => {
  const context = useContext(TranslationContext);
  if (!context) {
    throw new Error('useTranslation must be used within a TranslationProvider');
  }
  return context;
};

// Translation provider component
export const TranslationProvider = ({ children }) => {
  const [currentLanguage, setCurrentLanguage] = useState('en');
  const [translations, setTranslations] = useState({});
  const [isRTL, setIsRTL] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadTranslations(currentLanguage);
  }, [currentLanguage]);

  const loadTranslations = async (language) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/translations/${language}`);
      const data = await response.json();
      setTranslations(data.translations || {});
      
      // Set RTL for Arabic
      setIsRTL(language === 'ar');
      
      // Update document direction
      document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
      document.documentElement.lang = language;
    } catch (error) {
      logger.error('Error loading translations:', error);
      // Fallback to default translations
      setTranslations(getDefaultTranslations(language));
    } finally {
      setIsLoading(false);
    }
  };

  const getDefaultTranslations = (language) => {
    const defaultTranslations = {
      en: {
        // Navigation
        'nav.dashboard': 'Dashboard',
        'nav.portfolio': 'Portfolio',
        'nav.trading': 'Trading',
        'nav.analytics': 'Analytics',
        'nav.compliance': 'Compliance',
        'nav.ai_insights': 'AI Insights',
        
        // Common
        'common.loading': 'Loading...',
        'common.error': 'Error',
        'common.success': 'Success',
        'common.cancel': 'Cancel',
        'common.confirm': 'Confirm',
        'common.save': 'Save',
        'common.edit': 'Edit',
        'common.delete': 'Delete',
        'common.close': 'Close',
        
        // Authentication
        'auth.login': 'Login',
        'auth.logout': 'Logout',
        'auth.signup': 'Sign Up',
        'auth.forgot_password': 'Forgot Password',
        'auth.reset_password': 'Reset Password',
        'auth.email': 'Email',
        'auth.password': 'Password',
        'auth.confirm_password': 'Confirm Password',
        'auth.first_name': 'First Name',
        'auth.last_name': 'Last Name',
        
        // Dashboard
        'dashboard.welcome': 'Welcome to FinAI Nexus',
        'dashboard.total_value': 'Total Value',
        'dashboard.day_change': '24h Change',
        'dashboard.top_asset': 'Top Asset',
        'dashboard.risk_score': 'Risk Score',
        'dashboard.recent_transactions': 'Recent Transactions',
        
        // Portfolio
        'portfolio.overview': 'Portfolio Overview',
        'portfolio.assets': 'Assets',
        'portfolio.allocation': 'Allocation',
        'portfolio.performance': 'Performance',
        'portfolio.rebalance': 'Rebalance',
        
        // Trading
        'trading.buy': 'Buy',
        'trading.sell': 'Sell',
        'trading.swap': 'Swap',
        'trading.earn_yield': 'Earn Yield',
        'trading.order_book': 'Order Book',
        'trading.price_chart': 'Price Chart',
        
        // Analytics
        'analytics.market_sentiment': 'Market Sentiment',
        'analytics.top_traders': 'Top Traders',
        'analytics.leaderboard': 'Leaderboard',
        'analytics.performance_metrics': 'Performance Metrics',
        
        // Compliance
        'compliance.status': 'Compliance Status',
        'compliance.alerts': 'Alerts',
        'compliance.reports': 'Reports',
        'compliance.audit_trail': 'Audit Trail',
        
        // AI Insights
        'ai.insights': 'AI Insights',
        'ai.recommendations': 'Recommendations',
        'ai.predictions': 'Predictions',
        'ai.risk_assessment': 'Risk Assessment',
        
        // Financial Terms
        'finance.bitcoin': 'Bitcoin',
        'finance.ethereum': 'Ethereum',
        'finance.portfolio': 'Portfolio',
        'finance.investment': 'Investment',
        'finance.risk': 'Risk',
        'finance.return': 'Return',
        'finance.volatility': 'Volatility',
        'finance.yield': 'Yield',
        'finance.liquidity': 'Liquidity',
        'finance.diversification': 'Diversification',
        
        // Time and Date
        'time.now': 'Now',
        'time.today': 'Today',
        'time.yesterday': 'Yesterday',
        'time.this_week': 'This Week',
        'time.this_month': 'This Month',
        'time.this_year': 'This Year',
        
        // Status
        'status.active': 'Active',
        'status.inactive': 'Inactive',
        'status.pending': 'Pending',
        'status.completed': 'Completed',
        'status.failed': 'Failed',
        'status.success': 'Success',
        
        // Actions
        'action.view': 'View',
        'action.edit': 'Edit',
        'action.delete': 'Delete',
        'action.create': 'Create',
        'action.update': 'Update',
        'action.submit': 'Submit',
        'action.cancel': 'Cancel',
        'action.confirm': 'Confirm',
        'action.approve': 'Approve',
        'action.reject': 'Reject'
      },
      
      ar: {
        // Navigation
        'nav.dashboard': 'لوحة التحكم',
        'nav.portfolio': 'المحفظة',
        'nav.trading': 'التداول',
        'nav.analytics': 'التحليلات',
        'nav.compliance': 'الامتثال',
        'nav.ai_insights': 'رؤى الذكاء الاصطناعي',
        
        // Common
        'common.loading': 'جاري التحميل...',
        'common.error': 'خطأ',
        'common.success': 'نجح',
        'common.cancel': 'إلغاء',
        'common.confirm': 'تأكيد',
        'common.save': 'حفظ',
        'common.edit': 'تعديل',
        'common.delete': 'حذف',
        'common.close': 'إغلاق',
        
        // Authentication
        'auth.login': 'تسجيل الدخول',
        'auth.logout': 'تسجيل الخروج',
        'auth.signup': 'إنشاء حساب',
        'auth.forgot_password': 'نسيت كلمة المرور',
        'auth.reset_password': 'إعادة تعيين كلمة المرور',
        'auth.email': 'البريد الإلكتروني',
        'auth.password': 'كلمة المرور',
        'auth.confirm_password': 'تأكيد كلمة المرور',
        'auth.first_name': 'الاسم الأول',
        'auth.last_name': 'الاسم الأخير',
        
        // Dashboard
        'dashboard.welcome': 'مرحباً بك في فين نيكسوس للذكاء الاصطناعي',
        'dashboard.total_value': 'القيمة الإجمالية',
        'dashboard.day_change': 'التغيير في 24 ساعة',
        'dashboard.top_asset': 'أفضل أصل',
        'dashboard.risk_score': 'نقاط المخاطر',
        'dashboard.recent_transactions': 'المعاملات الأخيرة',
        
        // Portfolio
        'portfolio.overview': 'نظرة عامة على المحفظة',
        'portfolio.assets': 'الأصول',
        'portfolio.allocation': 'التوزيع',
        'portfolio.performance': 'الأداء',
        'portfolio.rebalance': 'إعادة التوازن',
        
        // Trading
        'trading.buy': 'شراء',
        'trading.sell': 'بيع',
        'trading.swap': 'تبديل',
        'trading.earn_yield': 'كسب العائد',
        'trading.order_book': 'سجل الطلبات',
        'trading.price_chart': 'مخطط الأسعار',
        
        // Analytics
        'analytics.market_sentiment': 'مشاعر السوق',
        'analytics.top_traders': 'أفضل المتداولين',
        'analytics.leaderboard': 'لوحة المتصدرين',
        'analytics.performance_metrics': 'مقاييس الأداء',
        
        // Compliance
        'compliance.status': 'حالة الامتثال',
        'compliance.alerts': 'التنبيهات',
        'compliance.reports': 'التقارير',
        'compliance.audit_trail': 'مسار التدقيق',
        
        // AI Insights
        'ai.insights': 'رؤى الذكاء الاصطناعي',
        'ai.recommendations': 'التوصيات',
        'ai.predictions': 'التوقعات',
        'ai.risk_assessment': 'تقييم المخاطر',
        
        // Financial Terms
        'finance.bitcoin': 'بيتكوين',
        'finance.ethereum': 'إيثريوم',
        'finance.portfolio': 'المحفظة',
        'finance.investment': 'الاستثمار',
        'finance.risk': 'المخاطر',
        'finance.return': 'العائد',
        'finance.volatility': 'التقلب',
        'finance.yield': 'العائد',
        'finance.liquidity': 'السيولة',
        'finance.diversification': 'التنويع',
        
        // Time and Date
        'time.now': 'الآن',
        'time.today': 'اليوم',
        'time.yesterday': 'أمس',
        'time.this_week': 'هذا الأسبوع',
        'time.this_month': 'هذا الشهر',
        'time.this_year': 'هذا العام',
        
        // Status
        'status.active': 'نشط',
        'status.inactive': 'غير نشط',
        'status.pending': 'معلق',
        'status.completed': 'مكتمل',
        'status.failed': 'فشل',
        'status.success': 'نجح',
        
        // Actions
        'action.view': 'عرض',
        'action.edit': 'تعديل',
        'action.delete': 'حذف',
        'action.create': 'إنشاء',
        'action.update': 'تحديث',
        'action.submit': 'إرسال',
        'action.cancel': 'إلغاء',
        'action.confirm': 'تأكيد',
        'action.approve': 'موافقة',
        'action.reject': 'رفض'
      },
      
      zh: {
        // Navigation
        'nav.dashboard': '仪表板',
        'nav.portfolio': '投资组合',
        'nav.trading': '交易',
        'nav.analytics': '分析',
        'nav.compliance': '合规',
        'nav.ai_insights': 'AI洞察',
        
        // Common
        'common.loading': '加载中...',
        'common.error': '错误',
        'common.success': '成功',
        'common.cancel': '取消',
        'common.confirm': '确认',
        'common.save': '保存',
        'common.edit': '编辑',
        'common.delete': '删除',
        'common.close': '关闭',
        
        // Authentication
        'auth.login': '登录',
        'auth.logout': '退出',
        'auth.signup': '注册',
        'auth.forgot_password': '忘记密码',
        'auth.reset_password': '重置密码',
        'auth.email': '邮箱',
        'auth.password': '密码',
        'auth.confirm_password': '确认密码',
        'auth.first_name': '名字',
        'auth.last_name': '姓氏',
        
        // Dashboard
        'dashboard.welcome': '欢迎使用FinAI Nexus',
        'dashboard.total_value': '总价值',
        'dashboard.day_change': '24小时变化',
        'dashboard.top_asset': '顶级资产',
        'dashboard.risk_score': '风险评分',
        'dashboard.recent_transactions': '最近交易',
        
        // Portfolio
        'portfolio.overview': '投资组合概览',
        'portfolio.assets': '资产',
        'portfolio.allocation': '配置',
        'portfolio.performance': '表现',
        'portfolio.rebalance': '重新平衡',
        
        // Trading
        'trading.buy': '买入',
        'trading.sell': '卖出',
        'trading.swap': '交换',
        'trading.earn_yield': '赚取收益',
        'trading.order_book': '订单簿',
        'trading.price_chart': '价格图表',
        
        // Analytics
        'analytics.market_sentiment': '市场情绪',
        'analytics.top_traders': '顶级交易者',
        'analytics.leaderboard': '排行榜',
        'analytics.performance_metrics': '表现指标',
        
        // Compliance
        'compliance.status': '合规状态',
        'compliance.alerts': '警报',
        'compliance.reports': '报告',
        'compliance.audit_trail': '审计跟踪',
        
        // AI Insights
        'ai.insights': 'AI洞察',
        'ai.recommendations': '推荐',
        'ai.predictions': '预测',
        'ai.risk_assessment': '风险评估',
        
        // Financial Terms
        'finance.bitcoin': '比特币',
        'finance.ethereum': '以太坊',
        'finance.portfolio': '投资组合',
        'finance.investment': '投资',
        'finance.risk': '风险',
        'finance.return': '回报',
        'finance.volatility': '波动性',
        'finance.yield': '收益率',
        'finance.liquidity': '流动性',
        'finance.diversification': '多元化',
        
        // Time and Date
        'time.now': '现在',
        'time.today': '今天',
        'time.yesterday': '昨天',
        'time.this_week': '本周',
        'time.this_month': '本月',
        'time.this_year': '今年',
        
        // Status
        'status.active': '活跃',
        'status.inactive': '非活跃',
        'status.pending': '待处理',
        'status.completed': '已完成',
        'status.failed': '失败',
        'status.success': '成功',
        
        // Actions
        'action.view': '查看',
        'action.edit': '编辑',
        'action.delete': '删除',
        'action.create': '创建',
        'action.update': '更新',
        'action.submit': '提交',
        'action.cancel': '取消',
        'action.confirm': '确认',
        'action.approve': '批准',
        'action.reject': '拒绝'
      }
    };
    
    return defaultTranslations[language] || defaultTranslations.en;
  };

  const t = (key, params = {}) => {
    let translation = translations[key] || key;
    
    // Replace parameters in translation
    Object.keys(params).forEach(param => {
      translation = translation.replace(`{${param}}`, params[param]);
    });
    
    return translation;
  };

  const changeLanguage = (language) => {
    setCurrentLanguage(language);
  };

  const value = {
    t,
    currentLanguage,
    changeLanguage,
    isRTL,
    isLoading,
    availableLanguages: [
      { code: 'en', name: 'English', flag: '🇺🇸' },
      { code: 'ar', name: 'العربية', flag: '🇸🇦' },
      { code: 'zh', name: '中文', flag: '🇨🇳' }
    ]
  };

  return (
    <TranslationContext.Provider value={value}>
      {children}
    </TranslationContext.Provider>
  );
};

// Language switcher component
export const LanguageSwitcher = () => {
  const { currentLanguage, changeLanguage, availableLanguages, isRTL } = useTranslation();

  return (
    <div className={`flex items-center space-x-2 ${isRTL ? 'space-x-reverse' : ''}`}>
      <span className="text-sm text-gray-400">Language:</span>
      <select
        value={currentLanguage}
        onChange={(e) => changeLanguage(e.target.value)}
        className="bg-gray-700 text-white px-3 py-1 rounded border border-gray-600 focus:border-neon focus:outline-none"
      >
        {availableLanguages.map((lang) => (
          <option key={lang.code} value={lang.code}>
            {lang.flag} {lang.name}
          </option>
        ))}
      </select>
    </div>
  );
};

// RTL-aware component wrapper
export const RTLWrapper = ({ children, className = '' }) => {
  const { isRTL } = useTranslation();
  
  return (
    <div className={`${className} ${isRTL ? 'rtl' : 'ltr'}`}>
      {children}
    </div>
  );
};

// Localized number formatter
export const useNumberFormatter = () => {
  const { currentLanguage } = useTranslation();
  
  const formatNumber = (number, options = {}) => {
    const locale = currentLanguage === 'ar' ? 'ar-SA' : 
      currentLanguage === 'zh' ? 'zh-CN' : 'en-US';
    
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: 'USD',
      ...options
    }).format(number);
  };
  
  const formatPercentage = (number, options = {}) => {
    const locale = currentLanguage === 'ar' ? 'ar-SA' : 
      currentLanguage === 'zh' ? 'zh-CN' : 'en-US';
    
    return new Intl.NumberFormat(locale, {
      style: 'percent',
      ...options
    }).format(number);
  };
  
  return { formatNumber, formatPercentage };
};

// Localized date formatter
export const useDateFormatter = () => {
  const { currentLanguage } = useTranslation();
  
  const formatDate = (date, options = {}) => {
    const locale = currentLanguage === 'ar' ? 'ar-SA' : 
      currentLanguage === 'zh' ? 'zh-CN' : 'en-US';
    
    return new Intl.DateTimeFormat(locale, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      ...options
    }).format(new Date(date));
  };
  
  const formatTime = (date, options = {}) => {
    const locale = currentLanguage === 'ar' ? 'ar-SA' : 
      currentLanguage === 'zh' ? 'zh-CN' : 'en-US';
    
    return new Intl.DateTimeFormat(locale, {
      hour: '2-digit',
      minute: '2-digit',
      ...options
    }).format(new Date(date));
  };
  
  return { formatDate, formatTime };
};

export default TranslationProvider;
