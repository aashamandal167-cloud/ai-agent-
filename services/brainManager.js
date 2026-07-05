import discoveryBrain from "../brains/discoveryBrain.js";
import storyBrain from "../brains/storyBrain.js";
import demoBrain from "../brains/demoBrain.js";
import dealBrain from "../brains/dealBrain.js";
import negotiationBrain from "../brains/negotiationBrain.js";
import paymentBrain from "../brains/paymentBrain.js";
import followupBrain from "../brains/followupBrain.js";

export function getBrain(stage) {

  switch (stage) {

    case "DISCOVERY":
      return discoveryBrain;

    case "STORY":
      return storyBrain;

    case "DEMO":
      return demoBrain;

    case "DEAL":
      return dealBrain;

    case "NEGOTIATION":
      return negotiationBrain;

    case "PAYMENT":
      return paymentBrain;

    case "FOLLOWUP":
      return followupBrain;

    default:
      return discoveryBrain;

  }

}
