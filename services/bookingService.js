// // src/services/bookingService.js
// const {
//   HOTEL_NAME,
//   TEMPLATE_IDS,
//   MAIN_OPTIONS,
//   ROOM_OPTIONS,
//   PACKAGE_OPTIONS,
//   ROOM_CATEGORIES,
//   MAIN_MENU_TEXT,
//   ROOM_MENU_TEXT,
//   PACKAGES_TEXT
// } = require("../utils/constants");
// const logger = require("../utils/logger");
// const { sendTemplate, sendText } = require("./messageService");
// const aiService = require("./aiService");

// // Simple in-memory sessions
// const sessions = {}; // { [from]: { step: string, data: object } }

// function initSession() {
//   return { step: "MAIN_MENU", data: {} };
// }

// function resetToMain(s) {
//   s.step = "MAIN_MENU";
//   s.data = {};
// }

// function greeting() {
//   return `Karibu ${HOTEL_NAME} 🏨 — how can we assist you today?`;
// }

// function equalsAny(str, arr) {
//   const low = (str || "").toString().trim().toLowerCase();
//   return arr.some((a) => low === a);
// }

// function isYes(str) { return equalsAny(str, ["yes", "y", "yeah", "proceed", "ok", "okay"]); }
// function isNo(str)  { return equalsAny(str, ["no", "n", "nope", "back", "cancel"]); }

// function normalizeCategoryByCode(code) {
//   return ROOM_OPTIONS[code] || null;
// }

// function lookupAvailabilityPrice(cat) {
//   const c = ROOM_CATEGORIES[cat];
//   return { available: c?.units ?? 0, price: c?.price ?? 0 };
// }

// function fmt(n) { return (n || 0).toLocaleString("en-KE"); }

// function title(s) {
//   return (s || "").split("-").map(p => p.charAt(0).toUpperCase() + p.slice(1)).join("-");
// }

// function sanitizeMsisdn(s) {
//   // Accept "07XXXXXXXX", "7XXXXXXXX", "+2547XXXXXXXX", or "2547XXXXXXXX"
//   const digits = (s || "").replace(/\D/g, "");
//   if (digits.length === 9 && digits.startsWith("7")) return `+254${digits}`;
//   if (digits.length === 10 && digits.startsWith("07")) return `+254${digits.slice(1)}`;
//   if (digits.length === 12 && digits.startsWith("2547")) return `+${digits}`;
//   if (digits.length === 13 && digits.startsWith("2547")) return `+${digits}`;
//   return null;
// }

// function assignRoomNumber(cat) {
//   // Dummy allocator (replace with DB + decrement)
//   const prefix = { "regular": "R", "mid-size": "M", "penthouse": "P" }[cat] || "R";
//   const random = Math.floor(100 + Math.random() * 900);
//   return `${prefix}${random}`;
// }

// function normalizeDate(msg, aiDate) {
//   const m = (aiDate || "").toString().trim();
//   if (m && /^\d{4}-\d{2}-\d{2}$/.test(m)) return m;
//   const inline = (msg || "").match(/\d{4}-\d{2}-\d{2}/);
//   if (inline) return inline[0];
//   return null;
// }

// function extractOutdoorType(text) {
//   const t = (text || "").toLowerCase();
//   if (t.includes("pool")) return "pool party";
//   if (t.includes("garden")) return "garden event";
//   if (t.includes("lunch")) return "outdoor lunch";
//   if (t.includes("wedding")) return "outdoor wedding";
//   return "outdoor event";
// }

// function corpPriceFor(pkg, people) {
//   const base = pkg === "package2" ? 3500 : 2000; // per person
//   return base * Math.max(people, 1);
// }

// function corpCustomEstimator(people, notes) {
//   const pp = (notes || "").toLowerCase().includes("three meals") ? 3800 : 2800;
//   return pp * Math.max(people, 1);
// }

// function outdoorDepositFor(people) {
//   if (people <= 20) return 10000;
//   if (people <= 50) return 20000;
//   return 40000;
// }

// // Public entry
// async function handleIncomingMessage(from, messageRaw) {
//   const msg = (messageRaw || "").trim();

//   if (!sessions[from]) {
//     sessions[from] = initSession();
//   }
//   const s = sessions[from];

//   // Global shortcuts -> reset and show main template
//   if (equalsAny(msg, ["menu", "main", "hi", "hello", "start"])) {
//     resetToMain(s);
//     await sendText(from, greeting());
//     await sendTemplate(from, TEMPLATE_IDS.MAIN_MENU);
//     return;
//   }

//   // Optional AI-assist to infer intent/date/people/etc
//   let ai = {};
//   try {
//     ai = await aiService.analyzeUserText(msg);
//   } catch (e) {
//     logger.warn("AI analysis failed (continuing without it): " + e.message);
//   }

//   /* =========================
//      MAIN MENU (Template)
//      ========================= */
//   if (s.step === "MAIN_MENU") {
//     const choice = MAIN_OPTIONS[msg];

//     if (choice === "bookings_and_availability" || ai.intent === "bookings") {
//       s.step = "BOOK_SELECT_CATEGORY";
//       // Use ROOM MENU template
//       await sendTemplate(from, TEMPLATE_IDS.ROOM_MENU);
//       return;
//     } else if (choice === "event_booking" || ai.intent === "corporate") {
//       s.step = "CORP_ASK_DATE";
//       await sendText(from, "Please share the date for your conference or event (YYYY-MM-DD).");
//       return;
//     } else if (choice === "outdoor_service" || ai.intent === "outdoor") {
//       s.step = "OUTDOOR_ASK_DATE_TYPE";
//       await sendText(from, "Tell me the date (YYYY-MM-DD) and type of outdoor event (e.g., garden lunch, pool party).");
//       return;
//     } else {
//       // Invalid -> re-show main template
//       await sendText(from, "I can help with bookings and events.");
//       await sendTemplate(from, TEMPLATE_IDS.MAIN_MENU);
//       return;
//     }
//   }

//   /* =========================
//      A) BOOKINGS & AVAILABILITY
//      ========================= */
//   if (s.step === "BOOK_SELECT_CATEGORY") {
//     // Expect numeric codes from template (101/102/103)
//     const cat = normalizeCategoryByCode(msg);
//     if (!cat) {
//       await sendText(from, "Please choose a room category from the menu.");
//       await sendTemplate(from, TEMPLATE_IDS.ROOM_MENU);
//       return;
//     }

//     s.data.roomCategory = cat;

//     const { available, price } = lookupAvailabilityPrice(cat);
//     s.data.unitsAvailable = available;
//     s.data.price = price;

//     s.step = "BOOK_CONFIRM_PROCEED";
//     await sendText(from,
//       `Category: *${title(cat)}*\nAvailable units: *${available}*\nWould you like to proceed to book? (yes/no)`
//     );
//     return;
//   }

//   if (s.step === "BOOK_CONFIRM_PROCEED") {
//     if (isYes(msg)) {
//       s.step = "BOOK_SHOW_PRICE_ASK_MPESA";
//       await sendText(from,
//         `The price for *${title(s.data.roomCategory)}* is *KES ${fmt(s.data.price)}* per night.\nPlease enter your M-Pesa number to continue (format: 07XXXXXXXX).`
//       );
//       return;
//     } else if (isNo(msg)) {
//       resetToMain(s);
//       await sendText(from, "No problem. Would you like anything else?");
//       await sendTemplate(from, TEMPLATE_IDS.MAIN_MENU);
//       return;
//     } else {
//       await sendText(from, "Please reply *yes* to proceed or *no* to go back to the main menu.");
//       return;
//     }
//   }

//   if (s.step === "BOOK_SHOW_PRICE_ASK_MPESA") {
//     const mpesa = sanitizeMsisdn(msg);
//     if (!mpesa) {
//       await sendText(from, "That doesn't look like a valid M-Pesa number. Please provide it in the format 07XXXXXXXX.");
//       return;
//     }

//     s.data.mpesa = mpesa;
//     s.step = "BOOK_INITIATE_PAYMENT";
//     // TODO integrate Daraja STK push
//     await sendText(from, `Initiating M-Pesa prompt for *KES ${fmt(s.data.price)}*...\nReply *paid* once you approve the prompt.`);
//     return;
//   }

//   if (s.step === "BOOK_INITIATE_PAYMENT") {
//     if (equalsAny(msg, ["paid", "done", "confirmed"])) {
//       // TODO verify payment + decrement units + persist booking
//       const assignedRoom = assignRoomNumber(s.data.roomCategory);
//       s.data.roomNumber = assignedRoom;

//       resetToMain(s);
//       await sendText(from,
//         `✅ Payment confirmed.\nYour room number is *${assignedRoom}*.\n\nThank you for choosing ${HOTEL_NAME}!`
//       );
//       await sendTemplate(from, TEMPLATE_IDS.MAIN_MENU);
//       return;
//     } else {
//       await sendText(from, "When you approve the M-Pesa prompt, reply with *paid* to confirm.");
//       return;
//     }
//   }

//   /* =========================
//      B) CORPORATE / EVENTS
//      ========================= */
//   if (s.step === "CORP_ASK_DATE") {
//     const date = normalizeDate(msg, ai.date);
//     if (!date) {
//       await sendText(from, "Please provide a valid date (YYYY-MM-DD).");
//       return;
//     }
//     s.data.date = date;

//     // TODO check real calendar (stub open=true)
//     const open = true;
//     if (open) {
//       s.step = "CORP_ASK_PEOPLE";
//       await sendText(from, `Great! *${date}* is open. How many people are you expecting?`);
//       return;
//     } else {
//       s.step = "CORP_OFFER_RESCHEDULE";
//       await sendText(from, `Unfortunately, *${date}* is fully booked. Would you like to reschedule? (yes/no)`);
//       return;
//     }
//   }

//   if (s.step === "CORP_OFFER_RESCHEDULE") {
//     if (isYes(msg)) {
//       s.step = "CORP_ASK_DATE";
//       await sendText(from, "Please provide an alternative date (YYYY-MM-DD).");
//       return;
//     } else if (isNo(msg)) {
//       resetToMain(s);
//       await sendText(from, "Okay, returning to the main menu.");
//       await sendTemplate(from, TEMPLATE_IDS.MAIN_MENU);
//       return;
//     } else {
//       await sendText(from, "Please reply *yes* to reschedule or *no* to return to the main menu.");
//       return;
//     }
//   }

//   if (s.step === "CORP_ASK_PEOPLE") {
//     const num = parseInt(msg, 10) || ai.people || null;
//     if (!num || num < 1) {
//       await sendText(from, "Please enter a valid number of people.");
//       return;
//     }
//     s.data.people = num;

//     // Show details + send Package Menu template
//     await sendText(from,
//       "Here are our packages:\n\n" +
//       "• *Package 1* — conference hall, snacks, internet access\n" +
//       "• *Package 2* — conference hall, three meals and snacks, internet access\n" +
//       "• *Custom* — tailor your own package"
//     );
//     s.step = "CORP_SHOW_PACKAGES";
//     await sendTemplate(from, TEMPLATE_IDS.PACKAGE_MENU);
//     return;
//   }

//   if (s.step === "CORP_SHOW_PACKAGES") {
//     const pick = PACKAGE_OPTIONS[msg];

//     if (pick === "package1") {
//       s.data.package = "package1";
//       s.data.amount = corpPriceFor("package1", s.data.people);
//       s.step = "CORP_ASK_MPESA";
//       await sendText(from, `You chose *Package 1*.\nTotal: *KES ${fmt(s.data.amount)}*\nPlease provide your M-Pesa number (07XXXXXXXX).`);
//       return;
//     } else if (pick === "package2") {
//       s.data.package = "package2";
//       s.data.amount = corpPriceFor("package2", s.data.people);
//       s.step = "CORP_ASK_MPESA";
//       await sendText(from, `You chose *Package 2*.\nTotal: *KES ${fmt(s.data.amount)}*\nPlease provide your M-Pesa number (07XXXXXXXX).`);
//       return;
//     } else if (pick === "custom") {
//       s.data.package = "custom";
//       s.step = "CORP_CUSTOM_DETAILS";
//       await sendText(from, "Please describe what you would like to have (meals, AV, snacks, duration, etc.).");
//       return;
//     } else {
//       await sendText(from, "Please select a valid option.");
//       await sendTemplate(from, TEMPLATE_IDS.PACKAGE_MENU);
//       return;
//     }
//   }

//   if (s.step === "CORP_CUSTOM_DETAILS") {
//     s.data.customNotes = msg;
//     s.data.amount = corpCustomEstimator(s.data.people, msg);
//     s.step = "CORP_ASK_MPESA";
//     await sendText(from, `Custom package prepared.\nEstimated total: *KES ${fmt(s.data.amount)}*.\nPlease provide your M-Pesa number (07XXXXXXXX).`);
//     return;
//   }

//   if (s.step === "CORP_ASK_MPESA") {
//     const mpesa = sanitizeMsisdn(msg);
//     if (!mpesa) {
//       await sendText(from, "That doesn't look like a valid M-Pesa number. Please provide it in the format 07XXXXXXXX.");
//       return;
//     }
//     s.data.mpesa = mpesa;

//     s.step = "CORP_PAYMENT_PROMPT";
//     await sendText(from, `Initiating M-Pesa prompt for *KES ${fmt(s.data.amount)}*...\nReply *paid* once you approve the prompt.`);
//     return;
//   }

//   if (s.step === "CORP_PAYMENT_PROMPT") {
//     if (equalsAny(msg, ["paid", "done", "confirmed"])) {
//       // TODO verify & schedule reminder
//       const eventDate = s.data.date;
//       resetToMain(s);
//       await sendText(from,
//         `✅ Payment confirmed.\nYour event on *${eventDate}* is booked.\nWe'll send a reminder ahead of time.\n\nThank you for choosing ${HOTEL_NAME}!`
//       );
//       await sendTemplate(from, TEMPLATE_IDS.MAIN_MENU);
//       return;
//     } else {
//       await sendText(from, "When you approve the M-Pesa prompt, reply with *paid* to confirm.");
//       return;
//     }
//   }

//   /* =========================
//      C) OUTDOOR SERVICES
//      ========================= */
//   if (s.step === "OUTDOOR_ASK_DATE_TYPE") {
//     const date = normalizeDate(msg, ai.date);
//     if (!date) {
//       await sendText(from, "Please provide the date first (YYYY-MM-DD) and the type of event.");
//       return;
//     }

//     s.data.date = date;
//     s.data.outdoorType = extractOutdoorType(msg);

//     s.step = "OUTDOOR_ASK_PEOPLE";
//     await sendText(from, "How many people will be catered for?");
//     return;
//   }

//   if (s.step === "OUTDOOR_ASK_PEOPLE") {
//     const num = parseInt(msg, 10) || ai.people || null;
//     if (!num || num < 1) {
//       await sendText(from, "Please enter a valid number of people.");
//       return;
//     }
//     s.data.people = num;

//     // TODO real availability check
//     const open = true;
//     if (!open) {
//       s.step = "OUTDOOR_OFFER_RESCHEDULE";
//       await sendText(from, `Unfortunately, *${s.data.date}* is booked. Would you like to reschedule? (yes/no)`);
//       return;
//     }

//     s.step = "OUTDOOR_RESERVE_OR_AGENT";
//     await sendText(from, `Good news! *${s.data.date}* is available for a *${s.data.outdoorType}*.\nReply *reserve* to set a reservation.`);
//     return;
//   }

//   if (s.step === "OUTDOOR_OFFER_RESCHEDULE") {
//     if (isYes(msg)) {
//       s.step = "OUTDOOR_ASK_DATE_TYPE";
//       await sendText(from, "Please provide the new date and the event type.");
//       return;
//     } else if (isNo(msg)) {
//       resetToMain(s);
//       await sendText(from, "Okay, returning to main menu.");
//       await sendTemplate(from, TEMPLATE_IDS.MAIN_MENU);
//       return;
//     } else {
//       await sendText(from, "Please reply *yes* to reschedule or *no* to return to main menu.");
//       return;
//     }
//   }

//   if (s.step === "OUTDOOR_RESERVE_OR_AGENT") {
//     if (equalsAny(msg, ["reserve", "yes"])) {
//       s.data.amount = outdoorDepositFor(s.data.people);
//       s.step = "OUTDOOR_PAYMENT_MPESA";
//       await sendText(from, `To secure your reservation, a deposit of *KES ${fmt(s.data.amount)}* is required.\nPlease provide your M-Pesa number (07XXXXXXXX).`);
//       return;
//     } else {
//       resetToMain(s);
//       await sendText(from, "Okay. Returning to main menu.");
//       await sendTemplate(from, TEMPLATE_IDS.MAIN_MENU);
//       return;
//     }
//   }

//   if (s.step === "OUTDOOR_PAYMENT_MPESA") {
//     const mpesa = sanitizeMsisdn(msg);
//     if (!mpesa) {
//       await sendText(from, "That doesn't look like a valid M-Pesa number. Please provide it in the format 07XXXXXXXX.");
//       return;
//     }
//     s.data.mpesa = mpesa;

//     s.step = "OUTDOOR_PAYMENT_PROMPT";
//     await sendText(from, `Initiating M-Pesa prompt for *KES ${fmt(s.data.amount)}*...\nReply *paid* once you approve the prompt.`);
//     return;
//   }

//   if (s.step === "OUTDOOR_PAYMENT_PROMPT") {
//     if (equalsAny(msg, ["paid", "done", "confirmed"])) {
//       resetToMain(s);
//       await sendText(from,
//         `✅ Deposit received.\nYou will be referred to an agent who will capture detailed requirements for your *${s.data.outdoorType}* on *${s.data.date}*.\n\nThank you for choosing ${HOTEL_NAME}!`
//       );
//       await sendTemplate(from, TEMPLATE_IDS.MAIN_MENU);
//       return;
//     } else {
//       await sendText(from, "When you approve the M-Pesa prompt, reply with *paid* to confirm.");
//       return;
//     }
//   }

//   // Fallback
//   await sendText(from, "I didn’t catch that.");
//   await sendTemplate(from, TEMPLATE_IDS.MAIN_MENU);
// }

// module.exports = {
//   handleIncomingMessage
// };

// src/services/bookingService.js
const {
  HOTEL_NAME,
  TEMPLATE_IDS,
  MAIN_OPTIONS,
  ROOM_OPTIONS,
  PACKAGE_OPTIONS,
  ROOM_CATEGORIES,
} = require("../utils/constants");

const logger = require("../utils/logger");
const { sendTemplate, sendText } = require("./messageService");
const { generateAIReply } = require("./aiService");

// -------- Session store (in-memory; replace with DB/Redis in prod) --------
const sessions = {}; // { [from]: { step: string, data: object } }

function initSession() {
  return { step: "MAIN_MENU", data: {} };
}
function getSession(from) {
  if (!sessions[from]) sessions[from] = initSession();
  return sessions[from];
}
function resetToMain(s) {
  s.step = "MAIN_MENU";
  s.data = {};
}

// ----------------------------- Utilities ----------------------------------
function equalsAny(str, arr) {
  const low = (str || "").toString().trim().toLowerCase();
  return arr.some((a) => low === a);
}
function isYes(str) {
  return equalsAny(str, ["yes", "y", "yeah", "proceed", "ok", "okay", "sure"]);
}
function isNo(str) {
  return equalsAny(str, ["no", "n", "nope", "back", "cancel"]);
}
function fmt(n) {
  return (n || 0).toLocaleString("en-KE");
}
function title(s) {
  return (s || "")
    .split("-")
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join("-");
}
function sanitizeMsisdn(s) {
  // Accept "07XXXXXXXX", "7XXXXXXXX", "+2547XXXXXXXX", or "2547XXXXXXXX"
  const digits = (s || "").replace(/\D/g, "");
  if (digits.length === 9 && digits.startsWith("7")) return `+254${digits}`;
  if (digits.length === 10 && digits.startsWith("07")) return `+254${digits.slice(1)}`;
  if (digits.length === 12 && digits.startsWith("2547")) return `+${digits}`;
  if (digits.length === 13 && digits.startsWith("2547")) return `+${digits}`;
  return null;
}
function assignRoomNumber(cat) {
  const prefix = { regular: "R", "mid-size": "M", penthouse: "P" }[cat] || "R";
  const random = Math.floor(100 + Math.random() * 900);
  return `${prefix}${random}`;
}
function normalizeDate(msg) {
  const inline = (msg || "").match(/\d{4}-\d{2}-\d{2}/);
  return inline ? inline[0] : null;
}
function extractOutdoorType(text) {
  const t = (text || "").toLowerCase();
  if (t.includes("pool")) return "pool party";
  if (t.includes("garden")) return "garden event";
  if (t.includes("lunch")) return "outdoor lunch";
  if (t.includes("wedding")) return "outdoor wedding";
  return "outdoor event";
}
function corpPriceFor(pkg, people) {
  const base = pkg === "package2" ? 3500 : 2000; // per person
  return base * Math.max(people, 1);
}
function corpCustomEstimator(people, notes) {
  const pp = (notes || "").toLowerCase().includes("three meals") ? 3800 : 2800;
  return pp * Math.max(people, 1);
}
function outdoorDepositFor(people) {
  if (people <= 20) return 10000;
  if (people <= 50) return 20000;
  return 40000;
}
function lookupAvailabilityPrice(cat) {
  const c = ROOM_CATEGORIES[cat];
  return { available: c?.units ?? 0, price: c?.price ?? 0 };
}

// --------------------- AI sentence (one call per turn) ---------------------
/**
 * Compose a short instruction for the AI to phrase a single WhatsApp message.
 * We DO NOT let the AI choose templates or steps. It just writes the sentence.
 */
async function aiSay(from, s, instruction, includeData = {}) {
  const hint = [
    instruction,
    includeData && Object.keys(includeData).length
      ? `DATA: ${JSON.stringify(includeData)}`
      : "",
    "Keep it warm, concise, and on-topic for this exact step.",
  ]
    .filter(Boolean)
    .join("\n");

  const ai = await generateAIReply({
    step: s.step,
    session: s,
    userMessage: hint,
  });

  const text =
    (ai && typeof ai.assistant_text === "string" && ai.assistant_text.trim()) ||
    "Thanks—let’s continue.";

  await sendText(from, text);
}

// ---------------------------- Main handler --------------------------------
async function handleIncomingMessage(from, messageRaw) {
  const msg = (messageRaw || "").trim();
  const s = getSession(from);

  // -------- Global shortcuts --------
  if (equalsAny(msg, ["menu", "main", "hi", "hello", "start", "hey"])) {
    resetToMain(s);
    await aiSay(
      from,
      s,
      `Greet the guest and tell them they can pick a service from the main menu that I will now send. Mention ${HOTEL_NAME} by name.`
    );
    await sendTemplate(from, TEMPLATE_IDS.MAIN_MENU);
    return;
  }

  // -------------------------- FLOW: MAIN MENU -----------------------------
  if (s.step === "MAIN_MENU") {
    let choice = MAIN_OPTIONS[msg]; // "bookings_and_availability" | "event_booking" | "outdoor_service"

    // Light intent heuristic (let typed words work too)
    if (!choice) {
      const low = msg.toLowerCase();
      if (/(book|room|availability)/i.test(low)) choice = "bookings_and_availability";
      else if (/(event|conference|corporate|meeting)/i.test(low)) choice = "event_booking";
      else if (/(outdoor|garden|pool|wedding|lunch)/i.test(low)) choice = "outdoor_service";
    }

    if (choice === "bookings_and_availability") {
      s.step = "BOOK_SELECT_CATEGORY";
      await aiSay(
        from,
        s,
        "Ask the guest to choose a room category from the menu I will send now. Keep it to one friendly sentence."
      );
      await sendTemplate(from, TEMPLATE_IDS.ROOM_MENU);
      return;
    }

    if (choice === "event_booking") {
      s.step = "CORP_ASK_DATE";
      await aiSay(from, s, "Ask for the event/conference date in YYYY-MM-DD format.");
      return;
    }

    if (choice === "outdoor_service") {
      s.step = "OUTDOOR_ASK_DATE_TYPE";
      await aiSay(
        from,
        s,
        "Ask for the date (YYYY-MM-DD) and the type of outdoor event (e.g., garden lunch, pool party)."
      );
      return;
    }

    // Unknown input -> re-show main
    await aiSay(
      from,
      s,
      "Briefly explain you can help with room bookings, corporate events, or outdoor services, and ask them to pick from the main menu I will send."
    );
    await sendTemplate(from, TEMPLATE_IDS.MAIN_MENU);
    return;
  }

  // ------------------- FLOW A: BOOKINGS & AVAILABILITY --------------------
  if (s.step === "BOOK_SELECT_CATEGORY") {
    // Accept 101/102/103 or words like "regular"
    let cat = ROOM_OPTIONS[msg];
    if (!cat) {
      const low = msg.toLowerCase();
      if (/(regular|standard)/.test(low)) cat = "regular";
      else if (/(mid|mid-size|midsize)/.test(low)) cat = "mid-size";
      else if (/(penthouse|suite|premium)/.test(low)) cat = "penthouse";
    }

    if (!cat) {
      await aiSay(
        from,
        s,
        "They sent an invalid option. Ask them to choose a room category from the menu I will send."
      );
      await sendTemplate(from, TEMPLATE_IDS.ROOM_MENU);
      return;
    }

    s.data.roomCategory = cat;

    const { available, price } = lookupAvailabilityPrice(cat);
    s.data.unitsAvailable = available;
    s.data.price = price;

    s.step = "BOOK_CONFIRM_PROCEED";
    await aiSay(
      from,
      s,
      "Tell the guest the selected category and available units, and ask if they want to proceed (yes/no).",
      { category: title(cat), unitsAvailable: available }
    );
    return;
  }

  if (s.step === "BOOK_CONFIRM_PROCEED") {
    if (isYes(msg)) {
      s.step = "BOOK_ASK_MPESA";
      await aiSay(
        from,
        s,
        "Tell the guest the price per night for the chosen category and ask them to enter their M-Pesa number in 07XXXXXXXX format.",
        { category: title(s.data.roomCategory), price: fmt(s.data.price) }
      );
      return;
    }
    if (isNo(msg)) {
      resetToMain(s);
      await aiSay(
        from,
        s,
        "Acknowledge and ask if they'd like anything else. Say you’ll show the main menu now."
      );
      await sendTemplate(from, TEMPLATE_IDS.MAIN_MENU);
      return;
    }
    await aiSay(from, s, "Ask them to reply yes to proceed or no to return to the main menu.");
    return;
  }

  if (s.step === "BOOK_ASK_MPESA") {
    const mpesa = sanitizeMsisdn(msg);
    if (!mpesa) {
      await aiSay(
        from,
        s,
        "Tell them that number doesn't look valid and ask for the M-Pesa number in 07XXXXXXXX format."
      );
      return;
    }
    s.data.mpesa = mpesa;

    s.step = "BOOK_PAYMENT_PROMPT";
    await aiSay(
      from,
      s,
      "Tell them you are initiating the M-Pesa prompt for the amount and to reply 'paid' once they approve.",
      { amount: fmt(s.data.price) }
    );
    return;
  }

  if (s.step === "BOOK_PAYMENT_PROMPT") {
    if (equalsAny(msg, ["paid", "done", "confirmed"])) {
      const assignedRoom = assignRoomNumber(s.data.roomCategory);
      s.data.roomNumber = assignedRoom;

      resetToMain(s);
      await aiSay(
        from,
        s,
        `Confirm payment received and share the assigned room number. Thank them for choosing ${HOTEL_NAME} and say you’ll show the main menu.`,
        { roomNumber: assignedRoom }
      );
      await sendTemplate(from, TEMPLATE_IDS.MAIN_MENU);
      return;
    }
    await aiSay(from, s, "Remind them to reply 'paid' after approving the M-Pesa prompt.");
    return;
  }

  // ------------------------ FLOW B: CORPORATE / EVENTS --------------------
  if (s.step === "CORP_ASK_DATE") {
    const date = normalizeDate(msg);
    if (!date) {
      await aiSay(from, s, "Ask them again for a valid date in YYYY-MM-DD format.");
      return;
    }
    s.data.date = date;

    const open = true; // stubbed availability
    if (open) {
      s.step = "CORP_ASK_PEOPLE";
      await aiSay(
        from,
        s,
        "Confirm the date is open and ask how many people are expected."
      );
      return;
    } else {
      s.step = "CORP_OFFER_RESCHEDULE";
      await aiSay(
        from,
        s,
        "Inform them the date is fully booked and ask if they’d like to reschedule (yes/no)."
      );
      return;
    }
  }

  if (s.step === "CORP_OFFER_RESCHEDULE") {
    if (isYes(msg)) {
      s.step = "CORP_ASK_DATE";
      await aiSay(from, s, "Ask for an alternative date in YYYY-MM-DD format.");
      return;
    }
    if (isNo(msg)) {
      resetToMain(s);
      await aiSay(from, s, "Acknowledge and say you’ll show the main menu.");
      await sendTemplate(from, TEMPLATE_IDS.MAIN_MENU);
      return;
    }
    await aiSay(from, s, "Ask them to reply yes to reschedule or no to return to main menu.");
    return;
  }

  if (s.step === "CORP_ASK_PEOPLE") {
    const num = parseInt(msg, 10);
    if (!num || num < 1) {
      await aiSay(from, s, "Ask for a valid number of people.");
      return;
    }
    s.data.people = num;

    s.step = "CORP_SHOW_PACKAGES";
    await aiSay(
      from,
      s,
      "Briefly list Package 1, Package 2, and Custom, and ask them to choose from the package menu I will send now."
    );
    await sendTemplate(from, TEMPLATE_IDS.PACKAGE_MENU);
    return;
  }

  if (s.step === "CORP_SHOW_PACKAGES") {
    const pick = PACKAGE_OPTIONS[msg]; // 201|202|203 -> package1|package2|custom
    if (pick === "package1" || pick === "package2") {
      s.data.package = pick;
      s.data.amount = corpPriceFor(pick, s.data.people);
      s.step = "CORP_ASK_MPESA";
      await aiSay(
        from,
        s,
        "Acknowledge their choice, share the total, and ask for their M-Pesa number in 07XXXXXXXX format.",
        { package: pick, total: fmt(s.data.amount) }
      );
      return;
    }
    if (pick === "custom") {
      s.data.package = "custom";
      s.step = "CORP_CUSTOM_DETAILS";
      await aiSay(
        from,
        s,
        "Ask them to describe what they would like (meals, AV, snacks, duration, etc.)."
      );
      return;
    }

    await aiSay(from, s, "Ask them to tap one of the package options from the menu I will send.");
    await sendTemplate(from, TEMPLATE_IDS.PACKAGE_MENU);
    return;
  }

  if (s.step === "CORP_CUSTOM_DETAILS") {
    s.data.customNotes = msg;
    s.data.amount = corpCustomEstimator(s.data.people, msg);
    s.step = "CORP_ASK_MPESA";
    await aiSay(
      from,
      s,
      "Confirm a custom package is prepared, share the estimated total, and ask for the M-Pesa number (07XXXXXXXX).",
      { estimate: fmt(s.data.amount) }
    );
    return;
  }

  if (s.step === "CORP_ASK_MPESA") {
    const mpesa = sanitizeMsisdn(msg);
    if (!mpesa) {
      await aiSay(
        from,
        s,
        "Tell them the number seems invalid and ask for the M-Pesa number in 07XXXXXXXX format."
      );
      return;
    }
    s.data.mpesa = mpesa;

    s.step = "CORP_PAYMENT_PROMPT";
    await aiSay(
      from,
      s,
      "Tell them you are initiating the M-Pesa prompt for the total and ask them to reply 'paid' after approval.",
      { total: fmt(s.data.amount) }
    );
    return;
  }

  if (s.step === "CORP_PAYMENT_PROMPT") {
    if (equalsAny(msg, ["paid", "done", "confirmed"])) {
      const eventDate = s.data.date;
      resetToMain(s);
      await aiSay(
        from,
        s,
        `Confirm payment received and that their event is booked for ${eventDate}. Thank them and say you’ll show the main menu.`
      );
      await sendTemplate(from, TEMPLATE_IDS.MAIN_MENU);
      return;
    }
    await aiSay(from, s, "Remind them to reply 'paid' after approving the M-Pesa prompt.");
    return;
  }

  // ------------------------- FLOW C: OUTDOOR SERVICES ---------------------
  if (s.step === "OUTDOOR_ASK_DATE_TYPE") {
    const date = normalizeDate(msg);
    if (!date) {
      await aiSay(
        from,
        s,
        "Ask them to provide the date first in YYYY-MM-DD format and mention the outdoor event type."
      );
      return;
    }
    s.data.date = date;
    s.data.outdoorType = extractOutdoorType(msg);

    s.step = "OUTDOOR_ASK_PEOPLE";
    await aiSay(from, s, "Acknowledge and ask how many people will be catered for.");
    return;
  }

  if (s.step === "OUTDOOR_ASK_PEOPLE") {
    const num = parseInt(msg, 10);
    if (!num || num < 1) {
      await aiSay(from, s, "Ask for a valid number of people.");
      return;
    }
    s.data.people = num;

    // Stub availability
    const open = true;
    if (!open) {
      s.step = "OUTDOOR_OFFER_RESCHEDULE";
      await aiSay(
        from,
        s,
        `Inform them ${s.data.date} is booked and ask if they’d like to reschedule (yes/no).`
      );
      return;
    }

    s.step = "OUTDOOR_RESERVE_OR_AGENT";
    await aiSay(
      from,
      s,
      `Tell them ${s.data.date} is available for a ${s.data.outdoorType} and ask them to reply 'reserve' to set a reservation.`
    );
    return;
  }

  if (s.step === "OUTDOOR_OFFER_RESCHEDULE") {
    if (isYes(msg)) {
      s.step = "OUTDOOR_ASK_DATE_TYPE";
      await aiSay(from, s, "Ask for the new date (YYYY-MM-DD) and the event type.");
      return;
    }
    if (isNo(msg)) {
      resetToMain(s);
      await aiSay(from, s, "Acknowledge and say you’ll show the main menu.");
      await sendTemplate(from, TEMPLATE_IDS.MAIN_MENU);
      return;
    }
    await aiSay(from, s, "Ask them to reply yes to reschedule or no to return to the main menu.");
    return;
  }

  if (s.step === "OUTDOOR_RESERVE_OR_AGENT") {
    if (equalsAny(msg, ["reserve", "yes"])) {
      s.data.amount = outdoorDepositFor(s.data.people);
      s.step = "OUTDOOR_PAYMENT_MPESA";
      await aiSay(
        from,
        s,
        "Explain a deposit is required to secure the reservation, share the amount, and ask for the M-Pesa number (07XXXXXXXX).",
        { deposit: fmt(s.data.amount) }
      );
      return;
    }
    resetToMain(s);
    await aiSay(from, s, "Acknowledge and say you’ll return to the main menu.");
    await sendTemplate(from, TEMPLATE_IDS.MAIN_MENU);
    return;
  }

  if (s.step === "OUTDOOR_PAYMENT_MPESA") {
    const mpesa = sanitizeMsisdn(msg);
    if (!mpesa) {
      await aiSay(
        from,
        s,
        "Tell them that doesn't look like a valid M-Pesa number and ask again in 07XXXXXXXX format."
      );
      return;
    }
    s.data.mpesa = mpesa;

    s.step = "OUTDOOR_PAYMENT_PROMPT";
    await aiSay(
      from,
      s,
      "Tell them you are initiating the M-Pesa prompt for the deposit and to reply 'paid' once they approve.",
      { deposit: fmt(s.data.amount) }
    );
    return;
  }

  if (s.step === "OUTDOOR_PAYMENT_PROMPT") {
    if (equalsAny(msg, ["paid", "done", "confirmed"])) {
      resetToMain(s);
      await aiSay(
        from,
        s,
        `Confirm deposit received and say you will connect them to an agent to capture details for their ${s.data.outdoorType} on ${s.data.date}. Thank them and say you’ll show the main menu.`
      );
      await sendTemplate(from, TEMPLATE_IDS.MAIN_MENU);
      return;
    }
    await aiSay(from, s, "Remind them to reply 'paid' after approving the M-Pesa prompt.");
    return;
  }

  // ------------------------------ Fallback --------------------------------
  await aiSay(
    from,
    s,
    "Say you didn't quite catch that and invite them to pick from the main menu you will now send."
  );
  await sendTemplate(from, TEMPLATE_IDS.MAIN_MENU);
}

module.exports = { handleIncomingMessage };
