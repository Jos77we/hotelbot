const express = require('express');
const bodyParser = require('body-parser');
const whatsappRoutes = require('../routes/whatsapp');
const logger = require('../utils/logger');

const app = express();

// Twilio posts urlencoded
app.use(bodyParser.urlencoded({ extended: false }));
// app.use(bodyParser.json());

// Healthcheck
app.get('/', (_req, res) => res.status(200).end());

// Routes
app.use('/whatsapp', whatsappRoutes);

// Error handler
app.use((err, req, res, next) => {
  logger.error('Unhandled error', err);
  res.status(500).json({ error: 'Internal Server Error' });
});

module.exports = app;
