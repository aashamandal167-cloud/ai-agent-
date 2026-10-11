/**
 * ==========================================================
 * stageManager.js
 * ==========================================================
 * Raj AI Conversation Stage Manager
 * ==========================================================
 */

const ACCEPT_WORDS = [
  "ha",
  "haan",
  "han",
  "hanji",
  "yes",
  "ok",
  "okay",
  "batao",
  "sunao",
  "continue",
  "show",
  "dikhao",
  "demo",
  "bhejo",
  "send",
  "link",
  "sample",
  "portfolio",
  "website"
];

const PRICE_WORDS = [
  "price",
  "kitna",
  "kitne",
  "cost",
  "charge",
  "rate"
];

const PAYMENT_WORDS = [
  "upi",
  "qr",
  "pay",
  "payment",
  "paid",
  "advance",
  "transfer",
  "sent",
  "done",
  "screenshot",
  "successful"
];

const CATEGORY_WORDS = [
  "template",
  "3d",
  "premium",
  "animated"
];

// ==========================================================
// REJECT_WORDS - IMPORTANT
// These must be CLEAR, EXPLICIT decline phrases only.
// A bare "nahi" or "no" is NOT included here on purpose,
// because "nahi" appears constantly in normal Hinglish
// answers (e.g. "customer nahi aata", "pata nahi") and is
// NOT the same as rejecting the website offer.
// ==========================================================

const REJECT_WORDS = [
  "nahi chahiye",
  "nahi banwana",
  "website nahi",
  "interest nahi",
  "jarurat nahi",
  "zarurat nahi",
  "need nahi",
  "abhi nahi banwana",
  "mana kar diya",
  "rehne dijiye"
];

// Customer ke spelling mistakes bhi chalne chahiye (templet, temlate, etc.)
const PRICE_WORDS_EXTRA = [
  "dam",
  "daam",
  "kimat",
  "keemat",
  "rupya",
  "rupaye",
  "rupees",
  "paisa",
  "paise",
  "discount",
  "budget",
  "kam karo",
  "kuchh kam",
  "kuch kam"
];

// NEGOTIATION mein customer ki "haan, theek hai" jaisi sahmati
const AGREE_WORDS = [
  "ha",
  "haan",
  "han",
  "hanji",
  "yes",
  "ok",
  "okay",
  "chalo",
  "chalega",
  "thik hai",
  "theek hai",
  "thik he",
  "manzoor",
  "manjur",
  "kar do",
  "kardo",
  "bana do",
  "banao",
  "bana dijiye",
  "start karo",
  "shuru karo",
  "dane",
  "done"
];

// Agar customer ab bhi bhaav-taav kar raha hai to "sahmati" mat maano
const STILL_BARGAINING_WORDS = [
  "kam",
  "discount",
  "lekin",
  "but",
  "zyada",
  "mehnga",
  "mehenga",
  "mahnga",
  "nahi",
  "no"
];

function detectCategory(message) {

  // Customer sirf "1", "2" ya "3" bheje
  const numberOnly = message.replace(/[^0-9]/g, "");
  if (/^\s*[123]\s*[.)]?\s*$/.test(message)) {
    if (numberOnly === "1") return "template website";
    if (numberOnly === "2") return "premium 3d website";
    if (numberOnly === "3") return "animated premium website";
  }

  if (message.includes("animat")) return "animated premium website";
  if (/(^|[^a-z0-9])3\s*d([^a-z0-9]|$)/i.test(message)) return "premium 3d website";
  if (message.includes("templ") || message.includes("temlate") || message.includes("tamplate") || message.includes("tempate")) {
    return "template website";
  }
  if (message.includes("premium")) return "premium";

  return null;
}

function hasKeyword(message, keywords) {

  return keywords.some(word => {

    // Word-boundary match - "ha" should match the standalone word "ha"
    // but NOT match inside "aachha", "chahiye", "yahan" etc.
    const pattern = new RegExp(`(^|[^a-zA-Z])${word}([^a-zA-Z]|$)`, "i");
    return pattern.test(message);

  });

}

export function updateStage(state, userMessage, hasAttachedMedia = false) {

  const message = userMessage.toLowerCase().trim();

  // ==========================================
  // DISCOVERY → STORY
  // ==========================================

  if (
    state.stage === "DISCOVERY" &&
    state.problem
  ) {

    state.stage = "STORY";
    state.storyShown = false;
    return;

  }

  // ==========================================
  // STORY → DEMO
  // ==========================================

  if (
    state.stage === "STORY" &&
    state.storyShown &&
    hasKeyword(message, ACCEPT_WORDS)
  ) {

    state.stage = "DEMO";
    state.demoShown = false;
    return;

  }

  // ==========================================
  // DEMO → CATEGORY
  // ==========================================

  if (
    state.stage === "DEMO" &&
    (
      message.includes("achha") ||
      message.includes("accha") ||
      message.includes("good") ||
      message.includes("nice") ||
      message.includes("mast") ||
      message.includes("pasand")
    )
  ) {

    state.stage = "CATEGORY";
    return;

}

  // ==========================================
  // CATEGORY → DEAL
  // ==========================================

  if (
    state.stage === "CATEGORY" &&
    detectCategory(message)
  ) {

    state.selectedCategory = detectCategory(message);

    state.stage = "DEAL";

    return;

  }

  // ==========================================
  // DEAL → NEGOTIATION
  // ==========================================

  if (
    state.stage === "DEAL" &&
    (
      hasKeyword(message, PRICE_WORDS) ||
      hasKeyword(message, PRICE_WORDS_EXTRA) ||
      hasKeyword(message, PAYMENT_WORDS)
    )
  ) {

    state.stage = "NEGOTIATION";

    return;

  }

  // ==========================================
  // NEGOTIATION → PAYMENT
  // ==========================================

  if (
    state.stage === "NEGOTIATION" &&
    (
      message.includes("final") ||
      message.includes("deal") ||
      message.includes("ready") ||
      message.includes("banaiye") ||
      message.includes("kar dijiye") ||
      hasKeyword(message, PAYMENT_WORDS) ||
      (
        hasKeyword(message, AGREE_WORDS) &&
        !hasKeyword(message, STILL_BARGAINING_WORDS)
      )
    )
  ) {

    state.stage = "PAYMENT";

    return;

  }

  // ==========================================
  // PAYMENT → FOLLOWUP
  //
  // IMPORTANT: We do NOT auto-confirm payment just because an image
  // was attached (a customer could attach ANY random screenshot).
  // The real confirmation now happens when the OWNER (Rahul) personally
  // reviews the screenshot (forwarded to his own WhatsApp) and replies
  // to approve it. That approval sets state.ownerApprovedPayment = true
  // from server.js, and THIS is what actually advances the stage.
  // ==========================================

  if (
    state.stage === "PAYMENT" &&
    state.ownerApprovedPayment
  ) {

    state.paymentReceived = true;

    state.stage = "FOLLOWUP";

    return;

  }

  // If customer CLAIMS payment via text only (no media attached),
  // stay in PAYMENT stage and let the brain/extraRule ask for the
  // actual screenshot - do NOT advance the stage here.

  // ==========================================
  // Rejection Handling
  //
  // Only checked AFTER an actual offer/demo/category/price has
  // been presented (DEMO, CATEGORY, DEAL, NEGOTIATION, PAYMENT
  // stages). Never checked during DISCOVERY or STORY, because
  // customers say "nahi" constantly there just answering
  // normal questions - that is NOT a rejection of the website.
  // ==========================================

  const offerStages = ["DEMO", "CATEGORY", "DEAL", "NEGOTIATION", "PAYMENT"];

  if (
    offerStages.includes(state.stage) &&
    hasKeyword(message, REJECT_WORDS)
  ) {

    state.rejected = true;

    state.stage = "FOLLOWUP";

    return;

  }

  // ==========================================
  // Return Current Stage
  // ==========================================

  return state.stage;

}

  
