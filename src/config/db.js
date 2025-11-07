const { Sequelize } = require('sequelize');
const env = require('./env');

const sequelize = new Sequelize(env.DB_NAME, env.DB_USER, env.DB_PASSWORD, {
  host: env.DB_HOST || 'localhost',
  port: env.DB_PORT || 5432,
  dialect: 'postgres',
  logging: false
});

module.exports = sequelize;
