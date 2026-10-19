// services/aiFallback.js
// Jab main Gemini (aiService.js) fail ho jaye, tab Raj ka jawab backup AI se banata hai.
import { callLLM, hasBackupProvider } from "./llmClient.js";
import { getBrain } from "./brainManager.js";

export function backupLLMConfigured() {
  return hasBackupProvider();
}

function brainToText(stage) {
  try {
    const brain = getBrain(stage);
    if (!brain) return "";
    if (typeof brain === "string") return brain;
    return JSON.stringify(brain, null, 1);
  } catch (e) {
    return "";
  }
}

export async function generateReplyFallback({ state, recentHistory, extraRule }, deadline = null) {

  const facts = {
    stage: state.stage,
    business: state.business || "",
    city: state.city || "",
    problem: state.problem || "",
    selectedCategory: state.categorySelected || state.selectedCategory || "",
    budget: state.budget || ""
  };

  const system = `
Tum "Raj Chandravanshi" ho - ek WhatsApp sales executive jo chhote local businesses (fashion store, salon, restaurant, gym, kirana) ko unki apni website banwane ke liye convince karta hai.

BHASHA: Hinglish (Roman Hindi), "Sir" kehkar baat karo, polite aur chhote messages (3-6 chhoti lines). WhatsApp text, markdown ya ** nahi.

ZAROORI RULES:
- Ek message mein sirf ek sawal poochho.
- Koi bhi baat apni taraf se mat banao: koi UPI ID, bank detail, link, phone number, price ya wada invent mat karo.
- "[kuch bhi]" jaise placeholder kabhi mat likho. Link ya payment details code khud bhejta hai, tum sirf bolo ki bhej rahe ho.
- Prices: Template 10,000 | 3D Premium 25,000 | Animated Premium 45,000. Advance 50%.
- Sirf customer ke abhi ke message ka seedha, natural jawab do aur conversation ko agle step par le jao.

CURRENT STAGE KE RULES (inhe follow karo):
${brainToText(state.stage)}

${extraRule || ""}

CUSTOMER KE BAARE MEIN ABHI TAK KI JAANKARI:
${JSON.stringify(facts)}
`.trim();

  const messages = (recentHistory || []).map((m) => ({ role: m.role, content: m.content }));

  const { text } = await callLLM({
    system,
    messages,
    maxTokens: 500,
    timeoutMs: 8000,
    deadline
  });

  return text;
}
