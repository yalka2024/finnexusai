const { Pool } = require('pg');
const { MongoClient } = require('mongodb');

// PostgreSQL connection
const pgPool = new Pool({
  user: 'nexus',
  host: 'localhost',
  database: 'finai',
  password: 'nexuspass',
  port: 5432,
});

// MongoDB connection
const mongoClient = new MongoClient('mongodb://localhost:27017', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function connectMongo() {
  if (!mongoClient.isConnected()) await mongoClient.connect();
  return mongoClient.db('finai_market');
}

module.exports = { pgPool, connectMongo };
