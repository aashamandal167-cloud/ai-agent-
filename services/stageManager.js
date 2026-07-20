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

function hasKeyword(message, keywords) {

  return keywords.some(word =>
    message.includes(word)
  );

}

export function updateStage(state, userMessage) {

  const message = userMessage.toLowerCase().trim();

  // ==========================================
  // DISCOVERY → STORY
  // ==========================================

  if (
    state.stage === "DISCOVERY" &&
    state.business &&
    state.city &&
    state.problem &&
    state.customerBehaviour &&
    state.competitor
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
    hasKeyword(message, CATEGORY_WORDS)
  ) {

    state.selectedCategory = message;

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
      hasKeyword(message, PAYMENT_WORDS)
    )
  ) {

    state.stage = "PAYMENT";

    return;

  }

  // ==========================================
  // PAYMENT → FOLLOWUP
  // ==========================================

  if (
    state.stage === "PAYMENT" &&
    (
      message.includes("paid") ||
      message.includes("done") ||
      message.includes("payment") ||
      message.includes("transfer") ||
      message.includes("screenshot") ||
      message.includes("success") ||
      message.includes("successful")
    )
  ) {

    state.paymentReceived = true;

    state.stage = "FOLLOWUP";

    return;

  }

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
    
