const axios = require('axios');
const { OPENROUTER_API_KEY } = require('./env');

const openRouterClient = axios.create({
  baseURL: 'https://openrouter.ai/api/v1',
  timeout: 30000,
  headers: {
    Authorization: `Bearer ${OPENROUTER_API_KEY}`,
    'Content-Type': 'application/json',
    'HTTP-Referer': 'https://your-domain.example',
    'X-Title': 'Nairobi 4-Star Hotel Bot'
  }
});

module.exports = openRouterClient;