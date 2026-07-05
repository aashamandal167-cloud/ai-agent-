export function updateStage(state, userMessage) {

  const message = userMessage.toLowerCase().trim();

  // -----------------------------
  // DISCOVERY → STORY
  // -----------------------------

  if (
    state.stage === "DISCOVERY" &&
    state.factsCount >= 4
  ) {

    state.stage = "STORY";
    return;

  }

  // -----------------------------
  // STORY → DEMO
  // -----------------------------

  if (
    state.stage === "STORY" &&
    (
      message.includes("ha") ||
      message.includes("haan") ||
      message.includes("hanji") ||
      message.includes("ji") ||
      message.includes("theek") ||
      message.includes("ok") ||
      message.includes("okay") ||
      message.includes("yes") ||
      message.includes("sure") ||
      message.includes("bataiye") ||
      message.includes("continue") ||
      message.includes("sunao")
    )
  ) {

    state.stage = "DEMO";
    return;

  }

  // -----------------------------
  // DEMO → DEAL
  // -----------------------------

  if (
    state.stage === "DEMO" &&
    (
      message.includes("achha") ||
      message.includes("accha") ||
      message.includes("nice") ||
      message.includes("good") ||
      message.includes("mast") ||
      message.includes("pasand") ||
      message.includes("beautiful") ||
      message.includes("awesome")
    )
  ) {

    state.stage = "DEAL";
    return;

  }

  // -----------------------------
  // DEAL → NEGOTIATION
  // -----------------------------

  if (
    state.stage === "DEAL" &&
    (
      message.includes("price") ||
      message.includes("kitna") ||
      message.includes("cost") ||
      message.includes("charge")
    )
  ) {

    state.stage = "NEGOTIATION";
    return;

  }

  // -----------------------------
  // NEGOTIATION → PAYMENT
  // -----------------------------

  if (
    state.stage === "NEGOTIATION" &&
    (
      message.includes("deal") ||
      message.includes("ready") ||
      message.includes("thik hai") ||
      message.includes("banaiye") ||
      message.includes("kar dijiye")
    )
  ) {

    state.stage = "PAYMENT";
    return;

  }

  // -----------------------------
  // PAYMENT → FOLLOWUP
  // -----------------------------

  if (
    state.stage === "PAYMENT" &&
    (
      message.includes("payment") ||
      message.includes("paid") ||
      message.includes("done") ||
      message.includes("screenshot")
    )
  ) {

    state.stage = "FOLLOWUP";
    return;

  }

      }
