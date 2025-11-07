const express = require('express');
const routes = require('./routes');
const errorMiddleware = require('./middlewares/error.middleware');

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api', routes);

// Health
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// Error handler
app.use(errorMiddleware);

module.exports = app;
