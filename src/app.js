const express = require('express');
const cors = require('cors');
const routes = require('./routes');
const errorMiddleware = require('./middlewares/error.middleware');

const app = express();

// Enable CORS for all domains
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: false
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api', routes);

// Health
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// Error handler
app.use(errorMiddleware);

module.exports = app;
