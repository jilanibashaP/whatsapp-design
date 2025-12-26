const { Sequelize } = require('sequelize');
const env = require('./env');

// Validate required environment variables
if (!env.DB_NAME) {
  throw new Error('DB_NAME is required in .env file');
}
if (!env.DB_USER) {
  throw new Error('DB_USER is required in .env file');
}
if (!env.DB_PASSWORD) {
  throw new Error('DB_PASSWORD is required in .env file');
}

// Ensure password is a string
const dbPassword = String(env.DB_PASSWORD || '');

const sequelize = new Sequelize(env.DB_NAME, env.DB_USER, dbPassword, {
  host: env.DB_HOST || 'localhost',
  port: parseInt(env.DB_PORT) || 5432,
  dialect: 'postgres',
  logging: false,
  dialectOptions: {
    // Additional options for better connection handling
    connectTimeout: 10000,
  },
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000
  }
});

module.exports = sequelize;
