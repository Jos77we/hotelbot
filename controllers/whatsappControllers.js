// src/controllers/whatsappController.js
const logger = require("../utils/logger");
const { handleIncomingMessage } = require("../services/bookingService");

async function whatsappWebhook(req, res) {
  try {
    const from = req.body.From;
    const body = (req.body.Body || "").trim();

    logger.info(`Incoming from ${from}: ${body}`);
    await handleIncomingMessage(from, body);

    // We reply 200 OK since we're sending outbound messages via REST API
    res.status(200).end();
  } catch (err) {
    logger.error("WhatsApp webhook error: " + err.message);
    res.status(200).end();// avoid Twilio retries; we already logged it
  }
}

module.exports = { whatsappWebhook };