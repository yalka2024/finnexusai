// apps/backend/src/models/Portfolio.js
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const User = require('./User');

const Portfolio = sequelize.define(
  'Portfolio',
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
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    assets: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: {}
    }
  },
  {
    timestamps: true,
    tableName: 'portfolios'
  }
);

Portfolio.belongsTo(User, { foreignKey: 'userId' });
module.exports = Portfolio;
