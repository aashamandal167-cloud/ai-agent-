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
  // Customer ne story sun li
  // -----------------------------
  if (
    state.stage === "STORY" &&
    (
      message === "ha" ||
      message === "haan" ||
      message === "ha karo" ||
      message === "hanji" ||
      message === "h" ||
      message === "yes" ||
      message === "ok" ||
      message === "okay" ||
      message === "batao" ||
      message === "sunao" ||
      message === "continue"
    )
  ) {
    state.stage = "DEMO";
    return;
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
