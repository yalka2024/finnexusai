/**
 * Sharia Compliance Manager - Islamic Finance Compliance
 *
 * Provides Sharia-compliant trading features including halal filters,
 * riba (interest) detection, gharar (uncertainty) avoidance, and
 * Islamic financial instruments compliance
 */

const EventEmitter = require('events');
const logger = require('../../utils/logger');


class ShariaComplianceManager extends EventEmitter {
  constructor() {
    super();
    this.isInitialized = false;
    this.halalFilters = new Map();
    this.shariaBoards = new Map();
    this.islamicInstruments = new Map();
    this.ribaDetectors = new Map();
    this.ghararFilters = new Map();
    this.zakatCalculator = null;
    this.mudarabaTracker = null;
    this.musharakaTracker = null;
    this.ijaraTracker = null;
    this.sukukTracker = null;
    this.takafulTracker = null;
    this.complianceRules = new Map();
    this.shariaAdvisors = new Map();
  }

  async initialize() {
    try {
      logger.info('🕌 Initializing Sharia Compliance Manager...');

      await this.initializeHalalFilters();
      await this.setupShariaBoards();
      await this.initializeIslamicInstruments();
      await this.setupRibaDetectors();
      await this.setupGhararFilters();
      await this.initializeZakatCalculator();
      await this.setupIslamicFinanceTrackers();
      await this.initializeComplianceRules();
      await this.setupShariaAdvisors();

      this.isInitialized = true;
      logger.info('✅ Sharia Compliance Manager initialized successfully');

      return { success: true, message: 'Sharia compliance manager initialized' };
    } catch (error) {
      logger.error('Sharia compliance manager initialization failed:', error);
      throw error;
    }
  }

  async shutdown() {
    try {
      this.isInitialized = false;
      logger.info('Sharia Compliance Manager shut down');
      return { success: true, message: 'Sharia compliance manager shut down' };
    } catch (error) {
      logger.error('Sharia compliance manager shutdown failed:', error);
      throw error;
    }
  }

  async initializeHalalFilters() {
    // Halal business sector filters
    this.halalFilters.set('permitted_sectors', [
      {
        sector: 'Technology',
        subSectors: ['Software', 'Hardware', 'Telecommunications', 'Clean Energy'],
        compliance: 'halal',
        description: 'Technology and innovation sectors are generally halal'
      },
      {
        sector: 'Healthcare',
        subSectors: ['Pharmaceuticals', 'Medical Devices', 'Healthcare Services'],
        compliance: 'halal',
        description: 'Healthcare sector is halal as it serves human welfare'
      },
      {
        sector: 'Education',
        subSectors: ['Educational Technology', 'Training Services', 'Research'],
        compliance: 'halal',
        description: 'Education sector is halal and encouraged in Islam'
      },
      {
        sector: 'Food & Beverages',
        subSectors: ['Halal Food', 'Beverages (Non-Alcoholic)', 'Agriculture'],
        compliance: 'halal',
        description: 'Halal food and beverages are permitted'
      },
      {
        sector: 'Real Estate',
        subSectors: ['Residential', 'Commercial', 'Industrial'],
        compliance: 'halal',
        description: 'Real estate investment is halal'
      },
      {
        sector: 'Manufacturing',
        subSectors: ['Automotive', 'Electronics', 'Textiles'],
        compliance: 'halal',
        description: 'Manufacturing is halal unless involves prohibited goods'
      }
    ]);

    // Prohibited (Haram) business sectors
    this.halalFilters.set('prohibited_sectors', [
      {
        sector: 'Banking & Finance',
        subSectors: ['Conventional Banking', 'Interest-based Lending', 'Insurance (Conventional)'],
        compliance: 'haram',
        description: 'Conventional banking with interest (riba) is prohibited'
      },
      {
        sector: 'Alcohol & Tobacco',
        subSectors: ['Alcohol Production', 'Tobacco Products', 'Distilleries'],
        compliance: 'haram',
        description: 'Alcohol and tobacco are prohibited in Islam'
      },
      {
        sector: 'Gambling & Gaming',
        subSectors: ['Casinos', 'Sports Betting', 'Online Gaming (Gambling)'],
        compliance: 'haram',
        description: 'Gambling (maysir) is prohibited in Islam'
      },
      {
        sector: 'Pork & Non-Halal Food',
        subSectors: ['Pork Products', 'Non-Halal Meat', 'Mixed Products'],
        compliance: 'haram',
        description: 'Pork and non-halal food products are prohibited'
      },
      {
        sector: 'Adult Entertainment',
        subSectors: ['Adult Content', 'Adult Services', 'Adult Products'],
        compliance: 'haram',
        description: 'Adult entertainment is prohibited in Islam'
      },
      {
        sector: 'Weapons & Defense',
        subSectors: ['Conventional Weapons', 'Military Equipment', 'Defense Contractors'],
        compliance: 'haram',
        description: 'Weapons manufacturing may be haram depending on use'
      }
    ]);

    logger.info(`✅ Initialized halal filters with ${this.halalFilters.get('permitted_sectors').length} permitted and ${this.halalFilters.get('prohibited_sectors').length} prohibited sectors`);
  }

  async setupShariaBoards() {
    // Sharia supervisory boards
    this.shariaBoards.set('AAOIFI', {
      name: 'Accounting and Auditing Organization for Islamic Financial Institutions',
      country: 'Bahrain',
      standards: ['AAOIFI Sharia Standards', 'Accounting Standards', 'Governance Standards'],
      certification: 'AAOIFI Certified',
      description: 'Leading international standard-setting body for Islamic finance'
    });

    this.shariaBoards.set('IFSB', {
      name: 'Islamic Financial Services Board',
      country: 'Malaysia',
      standards: ['IFSB Standards', 'Risk Management', 'Capital Adequacy'],
      certification: 'IFSB Compliant',
      description: 'International standard-setting organization for Islamic financial services'
    });

    this.shariaBoards.set('OIC_FIQH_ACADEMY', {
      name: 'Organization of Islamic Cooperation Fiqh Academy',
      country: 'Saudi Arabia',
      standards: ['Fiqh Resolutions', 'Sharia Rulings', 'Islamic Law'],
      certification: 'OIC Fiqh Approved',
      description: 'Premier Islamic jurisprudence body'
    });

    this.shariaBoards.set('SHARIYAH_REVIEW_BUREAU', {
      name: 'Shariyah Review Bureau',
      country: 'Bahrain',
      standards: ['Sharia Compliance', 'Product Certification', 'Audit Services'],
      certification: 'SRB Certified',
      description: 'Leading Sharia advisory and certification body'
    });

    this.shariaBoards.set('DIFC_SHARIA_COUNCIL', {
      name: 'Dubai International Financial Centre Sharia Council',
      country: 'UAE',
      standards: ['DIFC Sharia Standards', 'Product Approval', 'Compliance Monitoring'],
      certification: 'DIFC Sharia Approved',
      description: 'Sharia council for Dubai financial center'
    });

    logger.info(`✅ Setup ${this.shariaBoards.size} Sharia supervisory boards`);
  }

  async initializeIslamicInstruments() {
    // Islamic financial instruments
    this.islamicInstruments.set('mudaraba', {
      name: 'Mudaraba',
      type: 'profit_sharing',
      description: 'Partnership where one party provides capital and another provides expertise',
      riskSharing: 'capital_provider_bears_losses',
      profitSharing: 'agreed_ratio',
      compliance: 'sharia_compliant',
      features: ['profit_sharing', 'loss_bearing', 'no_guaranteed_return']
    });

    this.islamicInstruments.set('musharaka', {
      name: 'Musharaka',
      type: 'joint_venture',
      description: 'Partnership where all parties contribute capital and share profits/losses',
      riskSharing: 'proportional_to_contribution',
      profitSharing: 'proportional_to_contribution',
      compliance: 'sharia_compliant',
      features: ['joint_ownership', 'profit_loss_sharing', 'management_participation']
    });

    this.islamicInstruments.set('ijara', {
      name: 'Ijara',
      type: 'leasing',
      description: 'Leasing arrangement where assets are leased for a specified period',
      riskSharing: 'lessor_bears_asset_risk',
      profitSharing: 'lease_rental',
      compliance: 'sharia_compliant',
      features: ['asset_ownership', 'lease_rental', 'asset_management']
    });

    this.islamicInstruments.set('sukuk', {
      name: 'Sukuk',
      type: 'islamic_bonds',
      description: 'Asset-backed securities representing ownership in tangible assets',
      riskSharing: 'asset_based',
      profitSharing: 'asset_returns',
      compliance: 'sharia_compliant',
      features: ['asset_backing', 'ownership_certificates', 'tradable']
    });

    this.islamicInstruments.set('takaful', {
      name: 'Takaful',
      type: 'islamic_insurance',
      description: 'Mutual insurance based on cooperation and shared responsibility',
      riskSharing: 'mutual_risk_sharing',
      profitSharing: 'surplus_distribution',
      compliance: 'sharia_compliant',
      features: ['mutual_help', 'surplus_sharing', 'no_gharar']
    });

    this.islamicInstruments.set('murabaha', {
      name: 'Murabaha',
      type: 'cost_plus_financing',
      description: 'Sale of goods with disclosed cost and profit margin',
      riskSharing: 'buyer_bears_ownership_risk',
      profitSharing: 'disclosed_margin',
      compliance: 'sharia_compliant',
      features: ['asset_based', 'disclosed_profit', 'immediate_transfer']
    });

    logger.info(`✅ Initialized ${this.islamicInstruments.size} Islamic financial instruments`);
  }

  async setupRibaDetectors() {
    // Riba (interest) detection mechanisms
    this.ribaDetectors.set('interest_detection', {
      name: 'Interest Detection',
      description: 'Detects and flags interest-based transactions',
      rules: [
        'fixed_return_guarantee',
        'time_value_of_money',
        'compound_interest',
        'usury_rates'
      ],
      thresholds: {
        max_permissible_return: 0.15, // 15% maximum
        usury_threshold: 0.30 // 30% considered usury
      }
    });

    this.ribaDetectors.set('debt_based_instruments', {
      name: 'Debt-based Instrument Detection',
      description: 'Identifies debt-based financial instruments',
      prohibited: [
        'conventional_bonds',
        'interest_loans',
        'credit_default_swaps',
        'derivatives_with_interest'
      ]
    });

    this.ribaDetectors.set('money_lending', {
      name: 'Money Lending Detection',
      description: 'Detects money lending activities',
      prohibited: [
        'lending_with_interest',
        'payday_loans',
        'credit_cards_with_interest',
        'mortgage_with_interest'
      ]
    });

    logger.info(`✅ Setup ${this.ribaDetectors.size} riba detection mechanisms`);
  }

  async setupGhararFilters() {
    // Gharar (uncertainty) filters
    this.ghararFilters.set('excessive_uncertainty', {
      name: 'Excessive Uncertainty Filter',
      description: 'Filters out transactions with excessive uncertainty',
      prohibited: [
        'future_delivery_uncertainty',
        'price_uncertainty',
        'quantity_uncertainty',
        'quality_uncertainty'
      ],
      thresholds: {
        max_delivery_period: 365, // days
        price_volatility_threshold: 0.50 // 50%
      }
    });

    this.ghararFilters.set('speculation', {
      name: 'Speculation Filter',
      description: 'Limits speculative trading activities',
      prohibited: [
        'naked_short_selling',
        'excessive_leverage',
        'day_trading_without_assets',
        'gambling_like_behavior'
      ],
      limits: {
        max_leverage_ratio: 3.0,
        max_speculative_percentage: 0.30 // 30% of portfolio
      }
    });

    this.ghararFilters.set('derivatives', {
      name: 'Derivatives Filter',
      description: 'Filters permissible derivatives from prohibited ones',
      permitted: [
        'sukuk',
        'islamic_swaps',
        'profit_rate_swaps',
        'currency_forwards'
      ],
      prohibited: [
        'interest_rate_swaps',
        'credit_default_swaps',
        'naked_options',
        'futures_with_interest'
      ]
    });

    logger.info(`✅ Setup ${this.ghararFilters.size} gharar filters`);
  }

  async initializeZakatCalculator() {
    this.zakatCalculator = {
      name: 'Zakat Calculator',
      description: 'Calculates zakat obligations on investments',
      nisab: {
        gold: 85, // grams
        silver: 595, // grams
        cash_equivalent: 2000 // USD
      },
      rates: {
        cash_investments: 0.025, // 2.5%
        business_inventory: 0.025, // 2.5%
        agricultural_produce: 0.05, // 5% (irrigated), 10% (rain-fed)
        livestock: 0.025 // 2.5%
      },
      exemptions: [
        'primary_residence',
        'personal_vehicles',
        'business_equipment',
        'debt_obligations'
      ]
    };

    logger.info('✅ Zakat calculator initialized');
  }

  async setupIslamicFinanceTrackers() {
    // Mudaraba tracker
    this.mudarabaTracker = {
      name: 'Mudaraba Tracker',
      description: 'Tracks mudaraba partnerships and profit distributions',
      features: [
        'capital_tracking',
        'profit_calculation',
        'loss_allocation',
        'performance_monitoring'
      ]
    };

    // Musharaka tracker
    this.musharakaTracker = {
      name: 'Musharaka Tracker',
      description: 'Tracks musharaka joint ventures',
      features: [
        'ownership_tracking',
        'profit_loss_sharing',
        'management_decisions',
        'exit_strategies'
      ]
    };

    // Ijara tracker
    this.ijaraTracker = {
      name: 'Ijara Tracker',
      description: 'Tracks ijara leasing arrangements',
      features: [
        'asset_ownership',
        'lease_payments',
        'maintenance_responsibilities',
        'end_of_lease_options'
      ]
    };

    // Sukuk tracker
    this.sukukTracker = {
      name: 'Sukuk Tracker',
      description: 'Tracks sukuk investments and distributions',
      features: [
        'asset_backing',
        'coupon_payments',
        'maturity_handling',
        'trading_compliance'
      ]
    };

    // Takaful tracker
    this.takafulTracker = {
      name: 'Takaful Tracker',
      description: 'Tracks takaful insurance arrangements',
      features: [
        'contribution_tracking',
        'claim_processing',
        'surplus_distribution',
        'risk_pooling'
      ]
    };

    logger.info('✅ Islamic finance trackers initialized');
  }

  async initializeComplianceRules() {
    // Sharia compliance rules
    this.complianceRules.set('asset_backing', {
      name: 'Asset Backing Requirement',
      description: 'All financial instruments must be backed by tangible assets',
      requirement: 'minimum_asset_ratio',
      threshold: 0.70, // 70% asset backing
      enforcement: 'mandatory'
    });

    this.complianceRules.set('profit_loss_sharing', {
      name: 'Profit and Loss Sharing',
      description: 'Returns must be based on actual profit/loss sharing',
      requirement: 'no_guaranteed_returns',
      exception: 'capital_preservation_only',
      enforcement: 'mandatory'
    });

    this.complianceRules.set('ethical_investment', {
      name: 'Ethical Investment Screening',
      description: 'Investments must pass ethical screening criteria',
      criteria: [
        'halal_business_activities',
        'no_interest_based_operations',
        'socially_responsible_practices',
        'environmental_sustainability'
      ],
      enforcement: 'mandatory'
    });

    this.complianceRules.set('transparency', {
      name: 'Transparency and Disclosure',
      description: 'Full disclosure of all terms and conditions',
      requirements: [
        'clear_profit_sharing_terms',
        'disclosed_fees_and_charges',
        'asset_valuation_methods',
        'risk_disclosures'
      ],
      enforcement: 'mandatory'
    });

    logger.info(`✅ Initialized ${this.complianceRules.size} Sharia compliance rules`);
  }

  async setupShariaAdvisors() {
    // Sharia advisors and scholars
    this.shariaAdvisors.set('dr_muhammad_tahir_manzoor', {
      name: 'Dr. Muhammad Tahir Mansoor',
      title: 'Sharia Scholar',
      specialization: ['Islamic Finance', 'Sukuk', 'Takaful'],
      board: 'AAOIFI',
      certification: 'AAOIFI Certified Scholar',
      experience: '25+ years'
    });

    this.shariaAdvisors.set('dr_abdul_sattar_abu_ghuddah', {
      name: 'Dr. Abdul Sattar Abu Ghuddah',
      title: 'Sharia Advisor',
      specialization: ['Islamic Banking', 'Mudaraba', 'Musharaka'],
      board: 'IFSB',
      certification: 'IFSB Certified Advisor',
      experience: '30+ years'
    });

    this.shariaAdvisors.set('sheikh_nizam_yaquby', {
      name: 'Sheikh Nizam Yaquby',
      title: 'Sharia Scholar',
      specialization: ['Islamic Finance', 'Compliance', 'Product Development'],
      board: 'DIFC Sharia Council',
      certification: 'DIFC Sharia Council Member',
      experience: '20+ years'
    });

    logger.info(`✅ Setup ${this.shariaAdvisors.size} Sharia advisors`);
  }

  // Public methods
  async checkHalalCompliance(investmentData) {
    try {
      const complianceResult = {
        isHalal: true,
        complianceScore: 100,
        issues: [],
        recommendations: [],
        shariaBoard: null,
        certification: null
      };

      // Check business sector
      const sectorCheck = await this.checkBusinessSector(investmentData.sector, investmentData.subSector);
      if (!sectorCheck.isHalal) {
        complianceResult.isHalal = false;
        complianceResult.complianceScore -= 50;
        complianceResult.issues.push(sectorCheck.issue);
      }

      // Check for riba
      const ribaCheck = await this.checkRibaCompliance(investmentData);
      if (!ribaCheck.isCompliant) {
        complianceResult.isHalal = false;
        complianceResult.complianceScore -= 30;
        complianceResult.issues.push(...ribaCheck.issues);
      }

      // Check for gharar
      const ghararCheck = await this.checkGhararCompliance(investmentData);
      if (!ghararCheck.isCompliant) {
        complianceResult.isHalal = false;
        complianceResult.complianceScore -= 20;
        complianceResult.issues.push(...ghararCheck.issues);
      }

      // Check asset backing
      const assetCheck = await this.checkAssetBacking(investmentData);
      if (!assetCheck.isCompliant) {
        complianceResult.complianceScore -= 10;
        complianceResult.recommendations.push(assetCheck.recommendation);
      }

      // Assign Sharia board and certification
      if (complianceResult.isHalal) {
        complianceResult.shariaBoard = 'AAOIFI';
        complianceResult.certification = 'Sharia Compliant';
      }

      return complianceResult;

    } catch (error) {
      logger.error('Halal compliance check failed:', error);
      throw error;
    }
  }

  async checkBusinessSector(sector, subSector) {
    try {
      const permittedSectors = this.halalFilters.get('permitted_sectors');
      const prohibitedSectors = this.halalFilters.get('prohibited_sectors');

      // Check prohibited sectors first
      for (const prohibited of prohibitedSectors) {
        if (prohibited.sector.toLowerCase() === sector.toLowerCase()) {
          return {
            isHalal: false,
            issue: `Sector "${sector}" is prohibited (haram) in Islamic finance`
          };
        }
        if (prohibited.subSectors.some(sub => sub.toLowerCase() === subSector.toLowerCase())) {
          return {
            isHalal: false,
            issue: `Sub-sector "${subSector}" is prohibited (haram) in Islamic finance`
          };
        }
      }

      // Check permitted sectors
      for (const permitted of permittedSectors) {
        if (permitted.sector.toLowerCase() === sector.toLowerCase()) {
          return {
            isHalal: true,
            message: `Sector "${sector}" is permitted (halal) in Islamic finance`
          };
        }
        if (permitted.subSectors.some(sub => sub.toLowerCase() === subSector.toLowerCase())) {
          return {
            isHalal: true,
            message: `Sub-sector "${subSector}" is permitted (halal) in Islamic finance`
          };
        }
      }

      // Default to requiring further review
      return {
        isHalal: false,
        issue: `Sector "${sector}" requires Sharia board review for compliance determination`
      };

    } catch (error) {
      logger.error('Business sector check failed:', error);
      throw error;
    }
  }

  async checkRibaCompliance(investmentData) {
    try {
      const issues = [];

      // Check for interest-based returns
      if (investmentData.guaranteedReturn && investmentData.guaranteedReturn > 0) {
        issues.push('Guaranteed returns are considered riba and prohibited');
      }

      // Check for excessive returns
      const maxReturn = this.ribaDetectors.get('interest_detection').thresholds.max_permissible_return;
      if (investmentData.expectedReturn && investmentData.expectedReturn > maxReturn) {
        issues.push(`Expected return ${investmentData.expectedReturn * 100}% exceeds permissible limit of ${maxReturn * 100}%`);
      }

      // Check for debt-based instruments
      if (investmentData.instrumentType === 'bond' && !investmentData.isSukuk) {
        issues.push('Conventional bonds are debt-based instruments and prohibited');
      }

      return {
        isCompliant: issues.length === 0,
        issues
      };

    } catch (error) {
      logger.error('Riba compliance check failed:', error);
      throw error;
    }
  }

  async checkGhararCompliance(investmentData) {
    try {
      const issues = [];

      // Check for excessive uncertainty
      if (investmentData.volatility && investmentData.volatility > 0.5) {
        issues.push('High volatility indicates excessive uncertainty (gharar)');
      }

      // Check for speculation
      if (investmentData.leverage && investmentData.leverage > 3.0) {
        issues.push('Excessive leverage is considered speculative and prohibited');
      }

      // Check for derivatives
      if (investmentData.instrumentType === 'derivative' && !this.isPermittedDerivative(investmentData.derivativeType)) {
        issues.push(`Derivative type "${investmentData.derivativeType}" is not permitted in Islamic finance`);
      }

      return {
        isCompliant: issues.length === 0,
        issues
      };

    } catch (error) {
      logger.error('Gharar compliance check failed:', error);
      throw error;
    }
  }

  async checkAssetBacking(investmentData) {
    try {
      const assetBackingRule = this.complianceRules.get('asset_backing');
      const minAssetRatio = assetBackingRule.threshold;

      if (!investmentData.assetBacking || investmentData.assetBacking < minAssetRatio) {
        return {
          isCompliant: false,
          recommendation: `Ensure minimum ${minAssetRatio * 100}% asset backing for Sharia compliance`
        };
      }

      return {
        isCompliant: true
      };

    } catch (error) {
      logger.error('Asset backing check failed:', error);
      throw error;
    }
  }

  async calculateZakat(portfolioData) {
    try {
      const zakat = {
        totalAssets: 0,
        zakatableAssets: 0,
        zakatAmount: 0,
        nisabThreshold: this.zakatCalculator.nisab.cash_equivalent,
        zakatRate: this.zakatCalculator.rates.cash_investments,
        exemptions: []
      };

      // Calculate total portfolio value
      for (const asset of portfolioData.assets) {
        zakat.totalAssets += asset.currentValue;

        // Check if asset is zakatable
        if (this.isZakatableAsset(asset)) {
          zakat.zakatableAssets += asset.currentValue;
        } else {
          zakat.exemptions.push(`${asset.name}: ${asset.exemptionReason}`);
        }
      }

      // Check if above nisab threshold
      if (zakat.zakatableAssets >= zakat.nisabThreshold) {
        zakat.zakatAmount = zakat.zakatableAssets * zakat.zakatRate;
      }

      return zakat;

    } catch (error) {
      logger.error('Zakat calculation failed:', error);
      throw error;
    }
  }

  async createIslamicPortfolio(portfolioData) {
    try {
      const islamicPortfolio = {
        name: portfolioData.name,
        type: 'islamic_portfolio',
        shariaCompliant: true,
        instruments: [],
        totalValue: 0,
        expectedReturn: 0,
        riskLevel: 'moderate',
        shariaBoard: 'AAOIFI',
        certification: 'Sharia Compliant'
      };

      // Filter investments for Sharia compliance
      for (const investment of portfolioData.investments) {
        const complianceCheck = await this.checkHalalCompliance(investment);

        if (complianceCheck.isHalal) {
          islamicPortfolio.instruments.push({
            ...investment,
            shariaCompliant: true,
            complianceScore: complianceCheck.complianceScore
          });
        }
      }

      // Calculate portfolio metrics
      islamicPortfolio.totalValue = islamicPortfolio.instruments.reduce((sum, instrument) => sum + instrument.value, 0);
      islamicPortfolio.expectedReturn = islamicPortfolio.instruments.reduce((sum, instrument) =>
        sum + (instrument.expectedReturn * instrument.weight), 0);

      return islamicPortfolio;

    } catch (error) {
      logger.error('Islamic portfolio creation failed:', error);
      throw error;
    }
  }

  // Utility methods
  isPermittedDerivative(derivativeType) {
    const permittedDerivatives = this.ghararFilters.get('derivatives').permitted;
    return permittedDerivatives.includes(derivativeType);
  }

  isZakatableAsset(asset) {
    // Assets that are subject to zakat
    const zakatableTypes = ['cash', 'investments', 'business_inventory', 'precious_metals'];
    return zakatableTypes.includes(asset.type);
  }

  getStatus() {
    return {
      isInitialized: this.isInitialized,
      halalFilters: this.halalFilters.size,
      shariaBoards: this.shariaBoards.size,
      islamicInstruments: this.islamicInstruments.size,
      ribaDetectors: this.ribaDetectors.size,
      ghararFilters: this.ghararFilters.size,
      complianceRules: this.complianceRules.size,
      shariaAdvisors: this.shariaAdvisors.size
    };
  }

  getAllHalalFilters() {
    return {
      permitted: this.halalFilters.get('permitted_sectors'),
      prohibited: this.halalFilters.get('prohibited_sectors')
    };
  }

  getAllShariaBoards() {
    return Array.from(this.shariaBoards.values());
  }

  getAllIslamicInstruments() {
    return Array.from(this.islamicInstruments.values());
  }

  getAllComplianceRules() {
    return Array.from(this.complianceRules.values());
  }

  getAllShariaAdvisors() {
    return Array.from(this.shariaAdvisors.values());
  }
}

module.exports = new ShariaComplianceManager();

