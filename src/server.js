const http = require('http');
const app = require('./app');
const { initSocket } = require('./config/socket');
const { PORT = 3000 } = process.env;

const server = http.createServer(app);

initSocket(server);

server.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Server running on http://localhost:${PORT}`);
});
