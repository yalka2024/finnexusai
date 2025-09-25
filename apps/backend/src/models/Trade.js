// apps/backend/src/models/Trade.js
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const User = require('./User');
const Portfolio = require('./Portfolio');

const Trade = sequelize.define(
  'Trade',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: User,
        key: 'id'
      }
    },
    portfolioId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: Portfolio,
        key: 'id'
      }
    },
    asset: {
      type: DataTypes.STRING,
      allowNull: false
    },
    amount: {
      type: DataTypes.DECIMAL(18, 8),
      allowNull: false
    },
    tradeType: {
      type: DataTypes.ENUM('buy', 'sell'),
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM('pending', 'completed', 'failed'),
      defaultValue: 'pending'
    },
    txHash: {
      type: DataTypes.STRING
    }
  },
  {
    timestamps: true,
    tableName: 'trades'
  }
);

Trade.belongsTo(User, { foreignKey: 'userId' });
Trade.belongsTo(Portfolio, { foreignKey: 'portfolioId' });
module.exports = Trade;
