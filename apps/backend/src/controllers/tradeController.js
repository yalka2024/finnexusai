// apps/backend/src/controllers/tradeController.js
const Trade = require('../models/Trade');
const blockchainService = require('../services/blockchainService');

exports.executeTrade = async(req, res) => {
  try {
    const { portfolioId, asset, amount, tradeType } = req.body;
    const trade = await Trade.create({
      userId: req.user.id,
      portfolioId,
      asset,
      amount,
      tradeType,
      status: 'pending'
    });
    const txHash = await blockchainService.executeTrade(trade);
    trade.status = 'completed';
    trade.txHash = txHash;
    await trade.save();
    res.status(201).json(trade);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.getTrades = async(req, res) => {
  try {
    const trades = await Trade.findAll({ where: { userId: req.user.id } });
    res.status(200).json(trades);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};
