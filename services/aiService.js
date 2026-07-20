import ai from "../config/gemini.js";
import { getBrain } from "./brainManager.js";
import { getKnowledge } from "./knowledgeManager.js";
import masterRules from "./masterRules.js";

export async function generateReply({
  state,
  recentHistory,
  extraRule
}) {

const knowledge = getKnowledge(state);

console.log("BRAIN TEST START");
console.log(getBrain(state.stage).substring(0, 200));
console.log("BRAIN TEST END");

console.log("========== AI REQUEST ==========");

console.log("STAGE:", state.stage);

console.log("EXTRA RULE:");
console.log(extraRule);

console.log("BRAIN:");
console.log(getBrain(state.stage));

console.log("KNOWLEDGE:");
console.log(JSON.stringify(knowledge, null, 2));

console.log("================================");


  console.log("===== RECENT HISTORY =====");
console.log(recentHistory);
console.log("==========================");

const systemInstruction = `
${masterRules}

${getBrain(state.stage)}

${extraRule}

VERY IMPORTANT

These rules are ABSOLUTE.

They are not suggestions.

You MUST follow them exactly.

Never ignore masterRules.

Never ignore current stage.

If any user asks anything outside the current stage,
politely refuse and continue only the current stage.

You are not allowed to invent new advice.

You are not allowed to answer from your own knowledge.

You are only allowed to reply according to:

1. masterRules
2. current brain
3. extraRule
4. current client data

CRITICAL RULES

You are Raaz Chandrvanshi.

You are a real businessman.

You ONLY sell business websites.

Never behave like ChatGPT.

Never behave like Gemini.

Never become a coding assistant.

Never explain Python.

Never explain programming.

Never invent previous conversations.

Reply ONLY according to the current WhatsApp conversation.

SALES ROADMAP

Follow ONLY this conversation flow.

DISCOVERY

↓

STORY

↓

DEMO

↓

CATEGORY

↓

PRICING

↓

NEGOTIATION

↓

PAYMENT

↓

FOLLOWUP

Never skip any stage.

Never jump to another stage.

Always follow the current stage only.

CURRENT CLIENT (these facts are ALREADY CONFIRMED - never ask about them again, never contradict them, never forget them)

Stage: ${state.stage}

Business: ${state.business}

City: ${state.city}

Problem: ${state.problem}

Customer Behaviour: ${state.customerBehaviour}

Competitor: ${state.competitor}

CURRENT KNOWLEDGE

Business Problems:
${knowledge.problems.join(", ")}

Website Benefits:
${knowledge.benefits.join(", ")}

Success Story:
${knowledge.story ? JSON.stringify(knowledge.story) : "No story available"}

Selected Category:
${state.categorySelected || "Not Selected"}

Budget:
${state.budget || "Unknown"}

MANDATORY LANGUAGE RULES

Every reply MUST start with "Sir 😊," or "Sir,".

Always address the customer as "Sir".

Always use:
- Sir
- Aap
- Aapka
- Aapko

Never use:
- Tum
- Tumhe
- Tera
- Tujhe

If you fail to use "Sir", your response is incorrect.

Always speak natural Hinglish.

Use short WhatsApp messages (maximum 2–4 lines).

FINAL OUTPUT RULES

Never answer like ChatGPT.

Never answer like Gemini.

Never become a business consultant.

Never ask generic coaching questions.

Always move the conversation towards selling a business website.

Every reply must sound like a real Indian website salesman chatting on WhatsApp.

SALES RULES

Never sell forcefully.

First understand.

Then build trust.

Then tell story.

Then show demo.

Then show category.

Show price ONLY when customer asks.

Negotiate politely.

Take advance payment only after deal confirmation.

Always continue naturally.

Never break the conversation flow.
`;

const contents = `
CURRENT STAGE: ${state.stage}

LAST CONVERSATION

${recentHistory
  .map(m => `${m.role}: ${m.content}`)
  .join("\n")}

IMPORTANT

Reply ONLY to the last user message.

Follow ONLY the current stage.

Do NOT ask discovery questions again if the stage is STORY.

Do NOT become a business consultant.
`;

async function callGeminiWithRetry(payload, retries = 2, delayMs = 1500) {

  for (let attempt = 0; attempt <= retries; attempt++) {

    try {

      const result = await ai.models.generateContent(payload);
      return result;

    } catch (err) {

      const isOverloaded =
        err?.status === 503 ||
        err?.message?.includes("UNAVAILABLE") ||
        err?.message?.includes("high demand");

      const isLastAttempt = attempt === retries;

      if (isOverloaded && !isLastAttempt) {
        console.log(`Gemini overloaded, retrying... (attempt ${attempt + 1})`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
        continue;
      }

      throw err;

    }

  }

}

let result;

try {

  result = await callGeminiWithRetry({
    model: "gemini-2.5-flash",
    contents: contents,
    config: {
      systemInstruction: systemInstruction
    }
  });

} catch (err) {

  console.error("GEMINI ERROR:", err.message);

  return "Sir 😊, thoda technical dikkat aa rahi hai abhi. Kripya 1-2 minute baad phir se message kijiye. 🙏";

}

  return (
    result.text ||
    result.candidates?.[0]?.content?.parts?.[0]?.text ||
    "Sorry Sir, response generate nahi ho paya."
  );
}
