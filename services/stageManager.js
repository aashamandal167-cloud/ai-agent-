export function updateStage(state, userMessage) {

  const message = userMessage.toLowerCase().trim();

  // -----------------------------
// DISCOVERY → STORY
// -----------------------------
if (
  state.stage === "DISCOVERY" &&
  state.business &&
  state.city &&
  state.problem &&
  state.customerBehaviour &&
  state.competitor
) {

  console.log("DISCOVERY COMPLETE ✅");

  state.stage = "STORY";

  state.storyShown = false;

  return;

}

// -----------------------------
// STORY → DEMO
// -----------------------------
if (state.stage === "STORY") {

  const acceptWords = [
    "ha",
    "haan",
    "hanji",
    "yes",
    "ok",
    "okay",
    "continue",
    "batao",
    "sunao",
    "dikhao",
    "show",
    "demo",
    "send",
    "bhejo"
  ];

  const accepted = acceptWords.some(word =>
    message.includes(word)
  );

  if (state.storyShown && accepted) {

    console.log("STORY COMPLETE ✅");

    state.stage = "DEMO";
    state.demoShown = false;

    return;
  }

}

  // -----------------------------
  // DEMO → DEAL
  // Demo pasand aa gaya
  // -----------------------------
  if (
    state.stage === "DEMO" &&
    (
      message.includes("achha") ||
      message.includes("accha") ||
      message.includes("pasand") ||
      message.includes("nice") ||
      message.includes("good") ||
      message.includes("mast") ||
      message.includes("website banwana hai") ||
      message.includes("banwana hai") ||
      message.includes("interested")
    )
  ) {
    state.stage = "DEAL";
    return;
  }

  // -----------------------------
  // DEAL → NEGOTIATION
  // Customer price puchta hai
  // -----------------------------
  if (
    state.stage === "DEAL" &&
    (
      message.includes("price") ||
      message.includes("kitna") ||
      message.includes("cost") ||
      message.includes("charge") ||
      message.includes("rate")
    )
  ) {
    state.stage = "NEGOTIATION";
    return;
  }

  // -----------------------------
  // NEGOTIATION → PAYMENT
  // Deal confirm
  // -----------------------------
  if (
    state.stage === "NEGOTIATION" &&
    (
      message.includes("thik hai") ||
      message.includes("theek hai") ||
      message.includes("deal") ||
      message.includes("ready") ||
      message.includes("banaiye") ||
      message.includes("kar dijiye") ||
      message.includes("final")
    )
  ) {
    state.stage = "PAYMENT";
    return;
  }

  // -----------------------------
  // PAYMENT → FOLLOWUP
  // Payment complete
  // -----------------------------
  if (
    state.stage === "PAYMENT" &&
    (
      message.includes("payment") ||
      message.includes("paid") ||
      message.includes("done") ||
      message.includes("screenshot") ||
      message.includes("bhej diya")
    )
  ) {
    state.stage = "FOLLOWUP";
    return;
  }

}
