export function validateReply(stage, reply) {

  const text = reply.toLowerCase();

  // DISCOVERY
  if (stage === "DISCOVERY") {

    if (
      text.includes("₹") ||
      text.includes("10000") ||
      text.includes("25000") ||
      text.includes("45000") ||
      text.includes("price")
    ) {

      return {
        valid: false,
        reason: "PRICE_NOT_ALLOWED"
      };

    }

  }

  // STORY
  if (stage === "STORY") {

    if (
      text.includes("₹") ||
      text.includes("price")
    ) {

      return {
        valid: false,
        reason: "PRICE_NOT_ALLOWED"
      };

    }

  }

  // DEMO
  if (stage === "DEMO") {

    if (
      text.includes("₹") ||
      text.includes("payment")
    ) {

      return {
        valid: false,
        reason: "PAYMENT_NOT_ALLOWED"
      };

    }

  }

  return {
    valid: true
  };

  }
