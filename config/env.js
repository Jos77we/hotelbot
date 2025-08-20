require('dotenv').config();

const MUST = [
  'TWILIO_ACCOUNT_SID',
  'TWILIO_AUTH_TOKEN',
  'TWILIO_WHATSAPP_FROM',
  'OPENROUTER_API_KEY',
  'HOTEL_NAME'
];

const missing = MUST.filter(k => !process.env[k]);
if (missing.length) {
  console.warn('[ENV] Missing variables:', missing.join(', '));
}

module.exports = {
  PORT: process.env.PORT || 3000,
  HOTEL_NAME: process.env.HOTEL_NAME || 'LuxeStay Nairobi',
  TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID,
  TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN,
  TWILIO_WHATSAPP_FROM: process.env.TWILIO_WHATSAPP_FROM, // e.g., whatsapp:+14155238886
  OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY
};