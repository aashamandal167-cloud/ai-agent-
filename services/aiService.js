import ai from "../config/gemini.js";
import { getBrain } from "./brainManager.js";
import { getKnowledge } from "./knowledgeManager.js";

export async function generateReply({
  state,
  recentHistory,
  extraRule
}) {

  const result = await ai.models.generateContent({
    model: "gemini-2.5-flash",

    systemInstruction: `
${getBrain(state.stage)}

${extraRule}

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

CURRENT CLIENT

Stage: ${state.stage}

Business: ${state.business}

City: ${state.city}

Problem: ${state.problem}

Customer Behaviour: ${state.customerBehaviour}

Competitor: ${state.competitor}

Always speak natural Hinglish.

Use short WhatsApp messages.

Always use:

Sir
Aap
Aapka
Aapko

Never use:

Tum
Tumhe
Tera
Tujhe
`,

    contents: recentHistory
      .map(m => `${m.role}: ${m.content}`)
      .join("\n")
  });

  return (
    result.text ||
    result.candidates?.[0]?.content?.parts?.[0]?.text ||
    "Sorry Sir, response generate nahi ho paya."
  );
    }
