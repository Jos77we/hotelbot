const axios = require("axios");
const fs = require("fs");
const path = require("path");
const logger = require("../utils/logger");

const MODEL = "deepseek/deepseek-r1-0528-qwen3-8b:free";
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";

// Rate limiting configuration
const RATE_LIMIT_DELAY = 30000; // 30 seconds in milliseconds
const MAX_RETRIES = 2; // Maximum number of retries for rate limits

// Track rate limit state
let isRateLimited = false;
let lastRateLimitTime = 0;

// Path for the log file
const LOG_FILE_PATH = path.join(__dirname, "../logs/ai_interactions.json");

/**
 * Ensure log directory and file exist
 */
function ensureLogFile() {
  const logDir = path.dirname(LOG_FILE_PATH);
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
  
  if (!fs.existsSync(LOG_FILE_PATH)) {
    fs.writeFileSync(LOG_FILE_PATH, JSON.stringify([], null, 2));
  }
}

/**
 * Log interaction to JSON file
 */
function logInteraction(step, session, userMessage, devMessage, aiResponse, error = null) {
  try {
    ensureLogFile();
    
    const logEntry = {
      timestamp: new Date().toISOString(),
      step,
      session: session || {},
      userMessage,
      devMessage,
      aiResponse,
      error: error ? error.message : null,
      rateLimited: isRateLimited
    };
    
    const currentLogs = JSON.parse(fs.readFileSync(LOG_FILE_PATH, 'utf8'));
    currentLogs.push(logEntry);
    
    fs.writeFileSync(LOG_FILE_PATH, JSON.stringify(currentLogs, null, 2));
    
    console.log(`Interaction logged at: ${logEntry.timestamp}`);
  } catch (logError) {
    console.error("Failed to log interaction:", logError.message);
  }
}

/**
 * Check if we're currently rate limited and wait if needed
 */
async function handleRateLimit() {
  if (isRateLimited) {
    const timeSinceLimit = Date.now() - lastRateLimitTime;
    const timeToWait = RATE_LIMIT_DELAY - timeSinceLimit;
    
    if (timeToWait > 0) {
      console.log(`⏳ Rate limit active. Waiting ${Math.ceil(timeToWait / 1000)} seconds...`);
      await new Promise(resolve => setTimeout(resolve, timeToWait));
    }
    
    // Reset rate limit state after waiting
    isRateLimited = false;
    console.log("✅ Rate limit period over, continuing...");
  }
}

/**
 * Make API call with retry logic for rate limits
 */
async function makeAPIRequest(requestData, retryCount = 0) {
  try {
    console.log(`🔄 API Request attempt ${retryCount + 1}...`);
    
    const response = await axios.post(
      OPENROUTER_API_URL,
      requestData,
      {
        headers: {
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://serenity-hotel.ai",
          "X-Title": "Serenity Hotel Assistant"
        },
        timeout: 30000
      }
    );
    
    return response;
  } catch (err) {
    // Check if this is a rate limit error (429)
    if (err.response && err.response.status === 429) {
      console.log("🚨 Rate limit detected (429)");
      
      // Set rate limit state
      isRateLimited = true;
      lastRateLimitTime = Date.now();
      
      // Retry if we haven't exceeded max retries
      if (retryCount < MAX_RETRIES) {
        console.log(`⏳ Waiting ${RATE_LIMIT_DELAY / 1000} seconds before retry ${retryCount + 1}/${MAX_RETRIES}...`);
        await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY));
        return makeAPIRequest(requestData, retryCount + 1);
      } else {
        console.log("❌ Max retries exceeded for rate limit");
        throw new Error(`Rate limit exceeded after ${MAX_RETRIES} retries. Please try again later.`);
      }
    }
    
    // For other errors, just re-throw
    throw err;
  }
}

/**
 * Ask AI to rephrase a message naturally and extract fields.
 */
async function generateAIReply({ step, session, userMessage, devMessage }) {
  const systemPrompt = `
You are "Serenity Hotel Assistant", a friendly WhatsApp concierge.
Your job is to write empathetic, concise replies — BUT you never decide flow.
The app controls the steps, you only:
1. Rephrase the developer message into a warm assistant reply.
2. Extract values from the user message (intent, date, yes/no, mpesa, etc.).

Return JSON only:
{
  "assistant_text": "polished reply to user based on devMessage",
  "extracted": {
    "intent"?: "bookings" | "corporate" | "outdoor" | "other",
    "date"?: "YYYY-MM-DD",
    "people"?: number,
    "category"?: "regular" | "mid-size" | "penthouse",
    "pkg"?: "package1" | "package2" | "custom",
    "mpesa"?: string,
    "yesno"?: "yes" | "no"
  }
}

IMPORTANT: Return ONLY valid JSON, with no additional text or explanations.`;

  const userPrompt = `
STEP: ${step}
SESSION_DATA: ${JSON.stringify(session?.data || {})}
USER_MESSAGE: ${userMessage}
DEVELOPER_MESSAGE: ${devMessage}

Now return the JSON only.`;

  console.log("Sending request to OpenRouter API...");
  console.log("API Key present:", !!OPENROUTER_API_KEY);
  console.log("Model:", MODEL);
  console.log("Step:", step);
  console.log("User message:", userMessage);
  console.log("Dev message:", devMessage);

  let aiResponse = {
    assistant_text: "",
    extracted: {}
  };
  let error = null;

  try {
    // Check and handle rate limits before making request
    await handleRateLimit();

    const requestData = {
      model: MODEL,
      temperature: 0.5,
      max_tokens: 300,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" }
    };

    const response = await makeAPIRequest(requestData);

    console.log("OpenRouter API response status:", response.status);
    console.log("OpenRouter API response data:", JSON.stringify(response.data, null, 2));

    const text = response.data?.choices?.[0]?.message?.content?.trim() || "";
    console.log("AI raw response text:", text);

    if (!text) {
      console.error("Empty response from AI");
      aiResponse = {
        assistant_text: devMessage || "Let's continue.",
        extracted: {},
      };
    } else {
      // Try to extract JSON from the response
      let jsonString = text;
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        jsonString = jsonMatch[0];
        console.log("Extracted JSON string:", jsonString);
      }

      try {
        const json = JSON.parse(jsonString);
        console.log("Parsed JSON:", JSON.stringify(json, null, 2));
        
        aiResponse = {
          assistant_text: json.assistant_text || devMessage || "Let's continue with the next step.",
          extracted: json.extracted || {},
        };
      } catch (e) {
        console.error("JSON parse error:", e.message);
        console.error("Text that failed to parse:", jsonString);
        error = e;
        aiResponse = {
          assistant_text: devMessage || "Let's continue.",
          extracted: {},
        };
      }
    }
  } catch (err) {
    console.error("AI API error details:");
    console.error("Error message:", err.message);
    error = err;
    
    if (err.response) {
      console.error("Response status:", err.response.status);
      console.error("Response data:", err.response.data);
    } else if (err.request) {
      console.error("No response received:", err.request);
    }
    
    aiResponse = {
      assistant_text: devMessage || "Let's continue.",
      extracted: {},
    };
  }

  // Log the interaction to JSON file
  logInteraction(step, session, userMessage, devMessage, aiResponse, error);

  return aiResponse;
}

module.exports = { generateAIReply };