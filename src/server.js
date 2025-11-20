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
    
    // Listen on 0.0.0.0 to allow connections from other devices on the network
    server.listen(PORT, '0.0.0.0', () => {
      // eslint-disable-next-line no-console
      console.log(`Server running on http://localhost:${PORT}`);
      console.log(`Network: http://192.168.0.11:${PORT}`);
    });
  })
  .catch(err => {
    console.error('✗ Unable to connect to the database:', err);
    process.exit(1);
  });
