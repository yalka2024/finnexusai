/**
 * FinAI Nexus - xAI Grok API Service
 *
 * Integrates with xAI's Grok API for:
 * - Advanced financial reasoning and analysis
 * - Market sentiment analysis
 * - Investment recommendations
 * - Risk assessment and portfolio optimization
 */

const axios = require('axios');
const logger = require('../../utils/logger');

class xAIGrokService {
  constructor() {
    this.apiKey = process.env.XAI_API_KEY || 'your-xai-api-key';
    this.baseURL = 'https://api.x.ai/v1';
    this.model = 'grok-beta';
    this.maxTokens = 4000;
    this.temperature = 0.7;
  }

  /**
   * Generate financial analysis using Grok
   */
  async generateFinancialAnalysis(prompt, context = {}) {
    try {
      const systemPrompt = this.buildFinancialSystemPrompt(context);
      const response = await this.callGrokAPI(systemPrompt, prompt);
      return this.parseFinancialResponse(response);
    } catch (error) {
      logger.error('Error generating financial analysis:', error);
      throw new Error('Failed to generate financial analysis');
    }
  }

  /**
   * Analyze market sentiment
   */
  async analyzeMarketSentiment(marketData, newsData = []) {
    const prompt = `
    Analyze the current market sentiment based on the following data:
    
    Market Data:
    - S&P 500: ${marketData.sp500 || 'N/A'}
    - Bitcoin: $${marketData.bitcoin || 'N/A'}
    - Ethereum: $${marketData.ethereum || 'N/A'}
    - VIX: ${marketData.vix || 'N/A'}
    
    Recent News Headlines:
    ${newsData.slice(0, 5).map(news => `- ${news.title}`).join('\n')}
    
    Provide:
    1. Overall sentiment (Bullish/Bearish/Neutral)
    2. Confidence level (0-100%)
    3. Key factors driving sentiment
    4. Short-term outlook (1-7 days)
    5. Risk factors to watch
    `;

    return await this.generateFinancialAnalysis(prompt, {
      analysisType: 'sentiment',
      marketData,
      newsData
    });
  }

  /**
   * Generate investment recommendations
   */
  async generateInvestmentRecommendations(userProfile, portfolioData, marketConditions) {
    const prompt = `
    Generate personalized investment recommendations for a user with the following profile:
    
    User Profile:
    - Risk Tolerance: ${userProfile.riskTolerance || 'Moderate'}
    - Investment Goals: ${userProfile.investmentGoals?.join(', ') || 'Growth'}
    - Time Horizon: ${userProfile.timeHorizon || '5-10 years'}
    - Current Portfolio Value: $${portfolioData.totalValue || '0'}
    
    Current Portfolio:
    ${portfolioData.holdings?.map(holding =>
    `- ${holding.symbol}: ${holding.allocation}% (${holding.performance}%)`
  ).join('\n') || 'No holdings'}
    
    Market Conditions:
    - Market Sentiment: ${marketConditions.sentiment || 'Neutral'}
    - Interest Rates: ${marketConditions.interestRates || 'N/A'}
    - Inflation: ${marketConditions.inflation || 'N/A'}
    
    Provide:
    1. Top 3 investment opportunities
    2. Portfolio rebalancing suggestions
    3. Risk management recommendations
    4. Sector allocation advice
    5. Specific asset recommendations with reasoning
    `;

    return await this.generateFinancialAnalysis(prompt, {
      analysisType: 'recommendations',
      userProfile,
      portfolioData,
      marketConditions
    });
  }

  /**
   * Assess portfolio risk
   */
  async assessPortfolioRisk(portfolioData, marketData) {
    const prompt = `
    Assess the risk profile of the following portfolio:
    
    Portfolio Holdings:
    ${portfolioData.holdings?.map(holding =>
    `- ${holding.symbol}: ${holding.allocation}% (Volatility: ${holding.volatility || 'N/A'})`
  ).join('\n') || 'No holdings'}
    
    Market Data:
    - Current VIX: ${marketData.vix || 'N/A'}
    - Correlation Matrix: ${JSON.stringify(marketData.correlations || {})}
    - Sector Exposure: ${JSON.stringify(portfolioData.sectorExposure || {})}
    
    Provide:
    1. Overall risk score (1-10)
    2. Concentration risk analysis
    3. Correlation risk assessment
    4. Sector concentration analysis
    5. Specific risk factors
    6. Risk mitigation strategies
    `;

    return await this.generateFinancialAnalysis(prompt, {
      analysisType: 'risk',
      portfolioData,
      marketData
    });
  }

  /**
   * Generate ESG analysis
   */
  async generateESGAnalysis(portfolioData, esgData) {
    const prompt = `
    Analyze the ESG (Environmental, Social, Governance) profile of the following portfolio:
    
    Portfolio Holdings:
    ${portfolioData.holdings?.map(holding =>
    `- ${holding.symbol}: ${holding.allocation}%`
  ).join('\n') || 'No holdings'}
    
    ESG Scores:
    ${esgData.scores?.map(score =>
    `- ${score.symbol}: E:${score.environmental}, S:${score.social}, G:${score.governance}`
  ).join('\n') || 'No ESG data'}
    
    Provide:
    1. Overall ESG score (1-100)
    2. Environmental impact analysis
    3. Social responsibility assessment
    4. Governance quality evaluation
    5. ESG improvement recommendations
    6. Sustainable investment opportunities
    `;

    return await this.generateFinancialAnalysis(prompt, {
      analysisType: 'esg',
      portfolioData,
      esgData
    });
  }

  /**
   * Generate trading insights
   */
  async generateTradingInsights(marketData, technicalIndicators, userPreferences) {
    const prompt = `
    Generate trading insights based on current market conditions:
    
    Market Data:
    - Current Price: $${marketData.currentPrice || 'N/A'}
    - 24h Change: ${marketData.change24h || 'N/A'}%
    - Volume: ${marketData.volume || 'N/A'}
    - Market Cap: $${marketData.marketCap || 'N/A'}
    
    Technical Indicators:
    - RSI: ${technicalIndicators.rsi || 'N/A'}
    - MACD: ${technicalIndicators.macd || 'N/A'}
    - Moving Averages: ${JSON.stringify(technicalIndicators.movingAverages || {})}
    - Support/Resistance: ${JSON.stringify(technicalIndicators.supportResistance || {})}
    
    User Preferences:
    - Trading Style: ${userPreferences.tradingStyle || 'Conservative'}
    - Time Frame: ${userPreferences.timeFrame || 'Daily'}
    - Risk Level: ${userPreferences.riskLevel || 'Medium'}
    
    Provide:
    1. Trading signal (Buy/Sell/Hold)
    2. Entry/Exit points
    3. Stop-loss recommendations
    4. Position sizing advice
    5. Market timing insights
    6. Risk management tips
    `;

    return await this.generateFinancialAnalysis(prompt, {
      analysisType: 'trading',
      marketData,
      technicalIndicators,
      userPreferences
    });
  }

  /**
   * Call xAI Grok API
   */
  async callGrokAPI(systemPrompt, userPrompt) {
    try {
      const response = await axios.post(
        `${this.baseURL}/chat/completions`,
        {
          model: this.model,
          messages: [
            {
              role: 'system',
              content: systemPrompt
            },
            {
              role: 'user',
              content: userPrompt
            }
          ],
          max_tokens: this.maxTokens,
          temperature: this.temperature,
          stream: false
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data.choices[0].message.content;
    } catch (error) {
      logger.error('xAI Grok API Error:', error.response?.data || error.message);
      throw new Error('Failed to call xAI Grok API');
    }
  }

  /**
   * Build financial system prompt
   */
  buildFinancialSystemPrompt(context) {
    return `You are FinAI Nexus, an advanced AI financial advisor powered by xAI Grok. You provide expert financial analysis, investment recommendations, and market insights.

Your capabilities include:
- Advanced financial reasoning and analysis
- Market sentiment analysis
- Portfolio optimization
- Risk assessment
- ESG analysis
- Trading insights
- Investment recommendations

Guidelines:
1. Always provide data-driven analysis
2. Include specific metrics and percentages
3. Explain your reasoning clearly
4. Consider risk factors and market conditions
5. Provide actionable recommendations
6. Maintain professional and clear communication
7. Focus on user's specific needs and risk tolerance

Context: ${JSON.stringify(context, null, 2)}

Respond in a structured format with clear sections and actionable insights.`;
  }

  /**
   * Parse financial response
   */
  parseFinancialResponse(response) {
    try {
      // Try to extract structured data from the response
      const analysis = {
        summary: '',
        recommendations: [],
        riskFactors: [],
        metrics: {},
        confidence: 0,
        timestamp: new Date().toISOString()
      };

      // Basic parsing - in production, you'd want more sophisticated parsing
      const lines = response.split('\n');
      let currentSection = 'summary';

      for (const line of lines) {
        const trimmedLine = line.trim();

        if (trimmedLine.includes('Recommendation') || trimmedLine.includes('Suggestion')) {
          currentSection = 'recommendations';
        } else if (trimmedLine.includes('Risk') || trimmedLine.includes('Warning')) {
          currentSection = 'riskFactors';
        } else if (trimmedLine.includes('Confidence') || trimmedLine.includes('%')) {
          const confidenceMatch = trimmedLine.match(/(\d+)%/);
          if (confidenceMatch) {
            analysis.confidence = parseInt(confidenceMatch[1]);
          }
        }

        if (currentSection === 'summary' && trimmedLine) {
          analysis.summary += `${trimmedLine  } `;
        } else if (currentSection === 'recommendations' && trimmedLine) {
          analysis.recommendations.push(trimmedLine);
        } else if (currentSection === 'riskFactors' && trimmedLine) {
          analysis.riskFactors.push(trimmedLine);
        }
      }

      return {
        ...analysis,
        rawResponse: response
      };
    } catch (error) {
      logger.error('Error parsing financial response:', error);
      return {
        summary: response,
        recommendations: [],
        riskFactors: [],
        metrics: {},
        confidence: 50,
        timestamp: new Date().toISOString(),
        rawResponse: response
      };
    }
  }

  /**
   * Health check for xAI Grok service
   */
  async healthCheck() {
    try {
      const response = await this.callGrokAPI(
        'You are a health check system.',
        'Respond with "OK" if you are functioning properly.'
      );

      return {
        status: 'healthy',
        response: response,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
}

module.exports = xAIGrokService;
