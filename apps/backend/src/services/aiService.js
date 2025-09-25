// apps/backend/src/services/aiService.js
const axios = require('axios');

class AIService {
  async predictPortfolioPerformance(portfolioData) {
    try {
      const response = await axios.post(
        process.env.AI_MODEL_API_URL,
        portfolioData,
        { headers: { Authorization: Bearer  } }
      );
      return response.data.predictions;
    } catch (error) {
      throw new Error(`AI prediction failed: ${  error.message}`);
    }
  }

  async analyzeMarketTrends(data) {
    try {
      const response = await axios.post(
        `${process.env.AI_MODEL_API_URL}/market`,
        data,
        { headers: { Authorization: `Bearer ${process.env.AI_MODEL_API_KEY}` } }
      );
      return response.data.trends;
    } catch (error) {
      throw new Error(`Market analysis failed: ${  error.message}`);
    }
  }
}

module.exports = new AIService();
