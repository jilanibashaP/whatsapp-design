// Load environment variables FIRST
require('./config/env');

const http = require('http');
const app = require('./app');
const { initSocket } = require('./config/socket');
const sequelize = require('./config/db');
const { PORT = 3000 } = process.env;

const server = http.createServer(app);

initSocket(server);

// Connect to Database
sequelize.authenticate()
  .then(() => {
    console.log('✓ Database connection established successfully');
    
    // Sync models with database (creates tables if they don't exist)
    return sequelize.sync({ alter: false }); // Set to true to update existing tables
  })
  .then(() => {
    console.log('✓ Database models synchronized');
    
    server.listen(PORT, () => {
      // eslint-disable-next-line no-console
      console.log(`Server running on http://localhost:${PORT}`);
    });
  })
  .catch(err => {
    console.error('✗ Unable to connect to the database:', err);
    process.exit(1);
  });
