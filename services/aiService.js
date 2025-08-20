const openRouterClient = require('../config/openRouter');
const logger = require('../utils/logger');

// Minimal, defensive AI parse (optional/fallback)
exports.analyzeUserText = async (text) => {
  try {
    const prompt = `
You are an assistant for a Nairobi 4-star hotel. Analyze the user's message and return a compact JSON with:
- intent: one of ["main_menu", "bookings", "corporate", "outdoor", "unknown"]
- room_category: one of ["regular", "mid-size", "penthouse", null]
- date: ISO yyyy-mm-dd or null
- people: integer or null
- wants_payment: boolean
- confirm_booking: boolean

User: "${text}"`;

    const { data } = await openRouterClient.post('/chat/completions', {
      model: 'openrouter/auto',
      messages: [
        { role: 'system', content: 'You are a helpful hotel booking assistant.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.2
    });

    const content = data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content
      ? data.choices[0].message.content : '{}';

    const parsed = JSON.parse(stripFences(content));
    return parsed;
  } catch (e) {
    logger.error('AI parse error', e);
    return { intent: 'unknown', room_category: null, date: null, people: null, wants_payment: false, confirm_booking: false };
  }
};

function stripFences(s) {
  return (s || '').replace(/```json|```/g, '').trim();
}