import {
  discoveryBrain,
  emotionBrain,
  storyBrain,
  demoBrain,
  negotiationBrain,
  dealBrain,
  paymentBrain,
  objectionBrain,
  followupBrain
} from "../brains/index.js";

export function getBrain(stage) {

  switch (stage) {

    case "DISCOVERY":
      return discoveryBrain;

    case "STORY":
      return `
${emotionBrain}

${storyBrain}
`;

    case "DEMO":
      return demoBrain;

    case "NEGOTIATION":
      return negotiationBrain;

    case "DEAL":
      return dealBrain;

    case "PAYMENT":
      return paymentBrain;

    case "OBJECTION":
      return objectionBrain;

    case "FOLLOWUP":
      return followupBrain;

    default:
      return discoveryBrain;

  }

}
