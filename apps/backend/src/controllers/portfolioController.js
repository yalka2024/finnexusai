// apps/backend/src/controllers/portfolioController.js
const Portfolio = require('../models/Portfolio');
const aiService = require('../services/aiService');

exports.createPortfolio = async(req, res) => {
  try {
    const { name, assets } = req.body;
    const portfolio = await Portfolio.create({
      userId: req.user.id,
      name,
      assets
    });
    res.status(201).json(portfolio);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.getPortfolio = async(req, res) => {
  try {
    const portfolio = await Portfolio.findOne({
      where: { id: req.params.id, userId: req.user.id }
    });
    if (!portfolio) throw new Error('Portfolio not found');
    const predictions = await aiService.predictPortfolioPerformance(portfolio);
    res.status(200).json({ portfolio, predictions });
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
};
