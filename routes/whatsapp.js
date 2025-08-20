const express = require('express');
const router = express.Router();
const whatsappController = require('../controllers/whatsappControllers');

// Twilio webhook target: POST /whatsapp
router.post('/', whatsappController.whatsappWebhook);

module.exports = router;