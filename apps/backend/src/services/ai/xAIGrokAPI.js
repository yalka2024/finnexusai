/**
 * FinAI Nexus - xAI Grok API Integration
 * 
 * Integrates with xAI's Grok API for advanced language understanding,
 * reasoning, and financial advisory capabilities.
 */

import axios from 'axios';

export class xAIGrokAPI {
  constructor() {
    this.apiKey = process.env.XAI_API_KEY;
    this.baseURL = process.env.XAI_BASE_URL || 'https://api.x.ai/v1';
    this.model = process.env.XAI_MODEL || 'grok-beta';
    
    this.client = axios.create({
      baseURL: this.baseURL,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      }
    });
  }

  /**
   * Generate response using Grok API
   * @param {string} prompt - Input prompt
   * @param {Object} options - Generation options
   * @returns {Promise<Object>} Generated response
   */
  async generateResponse(prompt, options = {}) {
    try {
      const response = await this.client.post('/chat/completions', {
        model: this.model,
        messages: [
          {
            role: 'system',
            content: this.getSystemPrompt()
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: options.maxTokens || 1000,
        temperature: options.temperature || 0.7,
        top_p: options.topP || 0.9,
        frequency_penalty: options.frequencyPenalty || 0.0,
        presence_penalty: options.presencePenalty || 0.0,
        stream: options.stream || false
      });

      return this.parseResponse(response.data);
    } catch (error) {
      console.error('Grok API error:', error);
      throw new Error('Failed to generate response from Grok API');
    }
  }

  /**
   * Generate financial advice using Grok
   * @param {Object} userProfile - User profile and context
   * @param {string} question - Financial question
   * @returns {Promise<Object>} Financial advice
   */
  async generateFinancialAdvice(userProfile, question) {
    const prompt = this.buildFinancialPrompt(userProfile, question);
    
    const response = await this.generateResponse(prompt, {
      temperature: 0.3, // Lower temperature for more consistent advice
      maxTokens: 1500
    });

    return this.parseFinancialAdvice(response);
  }

  /**
   * Generate avatar personality using Grok
   * @param {Object} userProfile - User profile
   * @param {Object} baseTemplate - Base personality template
   * @returns {Promise<Object>} Generated personality
   */
  async generateAvatarPersonality(userProfile, baseTemplate) {
    const prompt = this.buildPersonalityPrompt(userProfile, baseTemplate);
    
    const response = await this.generateResponse(prompt, {
      temperature: 0.8, // Higher temperature for creative personality generation
      maxTokens: 800
    });

    return this.parsePersonality(response);
  }

  /**
   * Generate lesson content using Grok
   * @param {Object} lessonParams - Lesson parameters
   * @returns {Promise<Object>} Generated lesson content
   */
  async generateLessonContent(lessonParams) {
    const prompt = this.buildLessonPrompt(lessonParams);
    
    const response = await this.generateResponse(prompt, {
      temperature: 0.6,
      maxTokens: 2000
    });

    return this.parseLessonContent(response);
  }

  /**
   * Analyze market sentiment using Grok
   * @param {Array} newsArticles - News articles to analyze
   * @param {Object} marketData - Current market data
   * @returns {Promise<Object>} Sentiment analysis
   */
  async analyzeMarketSentiment(newsArticles, marketData) {
    const prompt = this.buildSentimentPrompt(newsArticles, marketData);
    
    const response = await this.generateResponse(prompt, {
      temperature: 0.4,
      maxTokens: 1000
    });

    return this.parseSentimentAnalysis(response);
  }

  /**
   * Generate risk assessment using Grok
   * @param {Object} portfolio - Portfolio data
   * @param {Object} marketConditions - Market conditions
   * @returns {Promise<Object>} Risk assessment
   */
  async generateRiskAssessment(portfolio, marketConditions) {
    const prompt = this.buildRiskPrompt(portfolio, marketConditions);
    
    const response = await this.generateResponse(prompt, {
      temperature: 0.2, // Very low temperature for risk analysis
      maxTokens: 1200
    });

    return this.parseRiskAssessment(response);
  }

  /**
   * Get system prompt for Grok
   */
  getSystemPrompt() {
    return `You are FinAI Nexus, an advanced AI financial advisor powered by xAI's Grok. You provide:

1. **Financial Education**: Clear, accurate explanations of financial concepts
2. **Investment Advice**: Personalized recommendations based on user profiles
3. **Risk Management**: Sophisticated risk assessment and mitigation strategies
4. **Market Analysis**: Real-time insights and trend analysis
5. **Emotional Support**: Empathetic guidance during market volatility
6. **Compliance**: Always ensure advice complies with financial regulations

**Key Principles**:
- Always prioritize user's financial well-being
- Provide clear, actionable advice
- Explain complex concepts in simple terms
- Be transparent about risks and limitations
- Maintain professional and empathetic tone
- Stay updated with latest financial regulations
- Encourage long-term thinking over short-term gains

**Response Format**: Provide structured, JSON-like responses when appropriate, but always include human-readable explanations.`;
  }

  /**
   * Build financial advice prompt
   */
  buildFinancialPrompt(userProfile, question) {
    return `User Profile:
- Age: ${userProfile.age || 'Not specified'}
- Income: ${userProfile.income || 'Not specified'}
- Risk Tolerance: ${userProfile.riskTolerance || 'Not specified'}
- Investment Experience: ${userProfile.experienceLevel || 'Not specified'}
- Financial Goals: ${userProfile.goals?.join(', ') || 'Not specified'}
- Current Portfolio: ${userProfile.portfolio?.summary || 'Not specified'}

Question: ${question}

Please provide comprehensive financial advice considering the user's profile. Include:
1. Direct answer to the question
2. Relevant considerations and risks
3. Actionable next steps
4. Alternative options if applicable
5. Resources for further learning`;
  }

  /**
   * Build personality generation prompt
   */
  buildPersonalityPrompt(userProfile, baseTemplate) {
    return `Create a financial advisor personality for a user with:
- Experience Level: ${userProfile.experienceLevel}
- Risk Tolerance: ${userProfile.riskTolerance}
- Goals: ${userProfile.goals?.join(', ')}
- Base Template: ${baseTemplate.personality}

Generate a personality that includes:
1. Communication style (formal/casual, technical/simple)
2. Teaching approach (step-by-step/overview, visual/verbal)
3. Motivational techniques (encouraging/challenging, supportive/direct)
4. Expertise areas (specific financial topics)
5. Interaction preferences (frequency, tone, format)

Make it engaging, educational, and personalized to the user's needs.`;
  }

  /**
   * Build lesson content prompt
   */
  buildLessonPrompt(lessonParams) {
    return `Create a financial lesson about "${lessonParams.title}" for a ${lessonParams.userLevel} level user.

Lesson Requirements:
- Duration: ${lessonParams.duration}
- Difficulty: ${lessonParams.difficulty}
- Topics: ${lessonParams.topics?.join(', ')}
- Teaching Style: ${lessonParams.teachingStyle}

Include:
1. Learning objectives (3-5 clear goals)
2. Step-by-step content (organized, logical flow)
3. Real-world examples and analogies
4. Interactive questions (5-8 questions)
5. Practical exercises (2-3 hands-on activities)
6. Key takeaways (summary of main points)
7. Next steps (what to learn next)

Make it engaging, practical, and appropriate for the user's level.`;
  }

  /**
   * Build sentiment analysis prompt
   */
  buildSentimentPrompt(newsArticles, marketData) {
    return `Analyze the market sentiment based on these news articles and current market data:

News Articles: ${newsArticles.length} articles
Market Data: ${JSON.stringify(marketData, null, 2)}

Provide:
1. Overall sentiment (bullish/bearish/neutral)
2. Key themes and trends
3. Potential market impacts
4. Risk factors to watch
5. Investment implications
6. Confidence level in the analysis`;
  }

  /**
   * Build risk assessment prompt
   */
  buildRiskPrompt(portfolio, marketConditions) {
    return `Assess the risk profile of this portfolio:

Portfolio: ${JSON.stringify(portfolio, null, 2)}
Market Conditions: ${JSON.stringify(marketConditions, null, 2)}

Provide:
1. Overall risk level (low/medium/high)
2. Specific risk factors identified
3. Risk mitigation strategies
4. Portfolio optimization suggestions
5. Stress test scenarios
6. Monitoring recommendations`;
  }

  /**
   * Parse Grok API response
   */
  parseResponse(data) {
    if (data.choices && data.choices.length > 0) {
      return {
        content: data.choices[0].message.content,
        usage: data.usage,
        model: data.model,
        finishReason: data.choices[0].finish_reason
      };
    }
    throw new Error('Invalid response format from Grok API');
  }

  /**
   * Parse financial advice response
   */
  parseFinancialAdvice(response) {
    try {
      // Try to parse as JSON first
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      // Fall back to text parsing
    }

    // Parse text response
    return {
      advice: response.content,
      confidence: this.extractConfidence(response.content),
      riskLevel: this.extractRiskLevel(response.content),
      actionItems: this.extractActionItems(response.content),
      warnings: this.extractWarnings(response.content)
    };
  }

  /**
   * Parse personality response
   */
  parsePersonality(response) {
    try {
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      // Fall back to text parsing
    }

    return {
      communicationStyle: this.extractCommunicationStyle(response.content),
      teachingApproach: this.extractTeachingApproach(response.content),
      motivationalTechniques: this.extractMotivationalTechniques(response.content),
      expertise: this.extractExpertise(response.content),
      interactionPreferences: this.extractInteractionPreferences(response.content)
    };
  }

  /**
   * Parse lesson content response
   */
  parseLessonContent(response) {
    try {
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      // Fall back to text parsing
    }

    return {
      objectives: this.extractObjectives(response.content),
      content: this.extractContent(response.content),
      examples: this.extractExamples(response.content),
      questions: this.extractQuestions(response.content),
      exercises: this.extractExercises(response.content),
      takeaways: this.extractTakeaways(response.content)
    };
  }

  /**
   * Parse sentiment analysis response
   */
  parseSentimentAnalysis(response) {
    return {
      overallSentiment: this.extractSentiment(response.content),
      themes: this.extractThemes(response.content),
      marketImpacts: this.extractMarketImpacts(response.content),
      riskFactors: this.extractRiskFactors(response.content),
      investmentImplications: this.extractInvestmentImplications(response.content),
      confidence: this.extractConfidence(response.content)
    };
  }

  /**
   * Parse risk assessment response
   */
  parseRiskAssessment(response) {
    return {
      riskLevel: this.extractRiskLevel(response.content),
      riskFactors: this.extractRiskFactors(response.content),
      mitigationStrategies: this.extractMitigationStrategies(response.content),
      optimizationSuggestions: this.extractOptimizationSuggestions(response.content),
      stressTestScenarios: this.extractStressTestScenarios(response.content),
      monitoringRecommendations: this.extractMonitoringRecommendations(response.content)
    };
  }

  /**
   * Text extraction methods
   */
  extractConfidence(text) {
    const confidenceMatch = text.match(/confidence[:\s]*(\d+%)/i);
    return confidenceMatch ? confidenceMatch[1] : 'medium';
  }

  extractRiskLevel(text) {
    const riskMatch = text.match(/risk[:\s]*(low|medium|high)/i);
    return riskMatch ? riskMatch[1].toLowerCase() : 'medium';
  }

  extractActionItems(text) {
    const actionMatch = text.match(/action[:\s]*(.+?)(?:\n|$)/gi);
    return actionMatch ? actionMatch.map(item => item.replace(/action[:\s]*/i, '').trim()) : [];
  }

  extractWarnings(text) {
    const warningMatch = text.match(/warning[:\s]*(.+?)(?:\n|$)/gi);
    return warningMatch ? warningMatch.map(warning => warning.replace(/warning[:\s]*/i, '').trim()) : [];
  }

  extractCommunicationStyle(text) {
    const styleMatch = text.match(/communication[:\s]*(.+?)(?:\n|$)/i);
    return styleMatch ? styleMatch[1].trim() : 'professional';
  }

  extractTeachingApproach(text) {
    const approachMatch = text.match(/teaching[:\s]*(.+?)(?:\n|$)/i);
    return approachMatch ? approachMatch[1].trim() : 'step-by-step';
  }

  extractMotivationalTechniques(text) {
    const motivationMatch = text.match(/motivational[:\s]*(.+?)(?:\n|$)/i);
    return motivationMatch ? motivationMatch[1].trim() : 'encouraging';
  }

  extractExpertise(text) {
    const expertiseMatch = text.match(/expertise[:\s]*(.+?)(?:\n|$)/i);
    return expertiseMatch ? expertiseMatch[1].split(',').map(item => item.trim()) : [];
  }

  extractInteractionPreferences(text) {
    const interactionMatch = text.match(/interaction[:\s]*(.+?)(?:\n|$)/i);
    return interactionMatch ? interactionMatch[1].trim() : 'frequent';
  }

  extractObjectives(text) {
    const objectiveMatch = text.match(/objectives?[:\s]*(.+?)(?:\n\n|\n\s*\n|$)/is);
    return objectiveMatch ? objectiveMatch[1].split('\n').map(obj => obj.trim()).filter(obj => obj) : [];
  }

  extractContent(text) {
    const contentMatch = text.match(/content[:\s]*(.+?)(?:\n\n|\n\s*\n|$)/is);
    return contentMatch ? contentMatch[1].split('\n').map(step => step.trim()).filter(step => step) : [];
  }

  extractExamples(text) {
    const exampleMatch = text.match(/examples?[:\s]*(.+?)(?:\n\n|\n\s*\n|$)/is);
    return exampleMatch ? exampleMatch[1].split('\n').map(example => example.trim()).filter(example => example) : [];
  }

  extractQuestions(text) {
    const questionMatch = text.match(/questions?[:\s]*(.+?)(?:\n\n|\n\s*\n|$)/is);
    return questionMatch ? questionMatch[1].split('\n').map(q => q.trim()).filter(q => q) : [];
  }

  extractExercises(text) {
    const exerciseMatch = text.match(/exercises?[:\s]*(.+?)(?:\n\n|\n\s*\n|$)/is);
    return exerciseMatch ? exerciseMatch[1].split('\n').map(ex => ex.trim()).filter(ex => ex) : [];
  }

  extractTakeaways(text) {
    const takeawayMatch = text.match(/takeaways?[:\s]*(.+?)(?:\n\n|\n\s*\n|$)/is);
    return takeawayMatch ? takeawayMatch[1].split('\n').map(takeaway => takeaway.trim()).filter(takeaway => takeaway) : [];
  }

  extractSentiment(text) {
    const sentimentMatch = text.match(/sentiment[:\s]*(bullish|bearish|neutral)/i);
    return sentimentMatch ? sentimentMatch[1].toLowerCase() : 'neutral';
  }

  extractThemes(text) {
    const themeMatch = text.match(/themes?[:\s]*(.+?)(?:\n\n|\n\s*\n|$)/is);
    return themeMatch ? themeMatch[1].split('\n').map(theme => theme.trim()).filter(theme => theme) : [];
  }

  extractMarketImpacts(text) {
    const impactMatch = text.match(/impacts?[:\s]*(.+?)(?:\n\n|\n\s*\n|$)/is);
    return impactMatch ? impactMatch[1].split('\n').map(impact => impact.trim()).filter(impact => impact) : [];
  }

  extractRiskFactors(text) {
    const riskMatch = text.match(/risk[:\s]*(.+?)(?:\n\n|\n\s*\n|$)/is);
    return riskMatch ? riskMatch[1].split('\n').map(risk => risk.trim()).filter(risk => risk) : [];
  }

  extractInvestmentImplications(text) {
    const implicationMatch = text.match(/implications?[:\s]*(.+?)(?:\n\n|\n\s*\n|$)/is);
    return implicationMatch ? implicationMatch[1].split('\n').map(imp => imp.trim()).filter(imp => imp) : [];
  }

  extractMitigationStrategies(text) {
    const mitigationMatch = text.match(/mitigation[:\s]*(.+?)(?:\n\n|\n\s*\n|$)/is);
    return mitigationMatch ? mitigationMatch[1].split('\n').map(strategy => strategy.trim()).filter(strategy => strategy) : [];
  }

  extractOptimizationSuggestions(text) {
    const optimizationMatch = text.match(/optimization[:\s]*(.+?)(?:\n\n|\n\s*\n|$)/is);
    return optimizationMatch ? optimizationMatch[1].split('\n').map(suggestion => suggestion.trim()).filter(suggestion => suggestion) : [];
  }

  extractStressTestScenarios(text) {
    const stressMatch = text.match(/stress[:\s]*(.+?)(?:\n\n|\n\s*\n|$)/is);
    return stressMatch ? stressMatch[1].split('\n').map(scenario => scenario.trim()).filter(scenario => scenario) : [];
  }

  extractMonitoringRecommendations(text) {
    const monitoringMatch = text.match(/monitoring[:\s]*(.+?)(?:\n\n|\n\s*\n|$)/is);
    return monitoringMatch ? monitoringMatch[1].split('\n').map(rec => rec.trim()).filter(rec => rec) : [];
  }
}

export default xAIGrokAPI;
