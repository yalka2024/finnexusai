// apps/backend/src/services/blockchainService.js
const Web3 = require('web3');
const { blockchainProvider } = require('../config/secrets');

class BlockchainService {
  constructor() {
    this.web3 = new Web3(blockchainProvider);
  }

  async executeTrade(trade) {
    try {
      const contract = new this.web3.eth.Contract(
        JSON.parse(process.env.PORTFOLIO_CONTRACT_ABI),
        process.env.PORTFOLIO_CONTRACT_ADDRESS
      );
      const tx = await contract.methods
        .addAsset(trade.asset, trade.amount)
        .send({ from: process.env.ADMIN_WALLET });
      return tx.transactionHash;
    } catch (error) {
      throw new Error(`Blockchain trade failed: ${  error.message}`);
    }
  }
}

module.exports = new BlockchainService();
