const twilioClient = require("../config/twilio");
// const { TWILIO_WHATSAPP_NUMBER } = require("../config/env");
const logger = require("../utils/logger");

// ✅ Send plain text
async function sendText(toNumber, body) {
  try {
    if (!twilioClient) throw new Error("Twilio client not initialized");

    const message = await twilioClient.messages.create({
      from: "whatsapp:+14155238886",
      to: toNumber,
      body,
    });

    logger.info(`Text sent to ${toNumber}: ${message.sid}`);
    return message;
  } catch (err) {
    logger.error(`sendText error: ${err.message}`);
  }
}

// ✅ Send template
async function sendTemplate(toNumber, templateId) {
  try {
    if (!twilioClient) throw new Error("Twilio client not initialized");

    const message = await twilioClient.messages.create({
      from: "whatsapp:+14155238886",
      to: toNumber,
      contentSid: templateId, // your Twilio template ID
    });

    logger.info(`Template sent to ${toNumber}: ${message.sid}`);
    return message;
  } catch (err) {
    logger.error(`sendTemplate error: ${err.message}`);
  }
}

module.exports = {
  sendText,
  sendTemplate,
};