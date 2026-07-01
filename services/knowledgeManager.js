import businessProblems from "../knowledge/businessProblems.js";
import websiteBenefits from "../knowledge/websiteBenefits.js";
import successStories from "../knowledge/successStories.js";
import objections from "../knowledge/objections.js";
import pricingKnowledge from "../knowledge/pricingKnowledge.js";
import industries from "../knowledge/industries.js";

export function getKnowledge(state) {

  const business = state.business;

  return {
    problems: businessProblems[business] || [],
    benefits: websiteBenefits[business] || [],
    story: successStories[business] || null,
    objections,
    pricing: pricingKnowledge,
    industries
  };

      }
