const axios = require("axios");
require("dotenv").config();

const openRouter = axios.create({
  baseURL: "https://openrouter.ai/api/v1",
  headers: {
    "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
    "X-Title": "Hotel WhatsApp Bot",
    "Content-Type": "application/json"
  },
  timeout: 20000
});

module.exports = openRouter;
