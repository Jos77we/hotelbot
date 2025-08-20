const twilio = require("twilio");
const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN } = require("./env");

let twilioClient = null;

if (TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN) {
  twilioClient = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
} else {
  console.error("[ERROR] Missing Twilio credentials in .env");
}

module.exports = twilioClient;
