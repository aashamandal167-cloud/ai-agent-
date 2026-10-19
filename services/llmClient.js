// services/llmClient.js
// Ek hi jagah se kai AI providers ko try karta hai. Jo pehla chal jaye, uska jawab milta hai.
// Isse ek provider (jaise Gemini free quota) khatam ho jaye to bhi bot nahi rukta.
//
// Render Environment variables (jitne daaloge utne providers use honge):
//   ANTHROPIC_API_KEY            (+ optional ANTHROPIC_MODEL, default claude-haiku-5-5)
//   LLM_API_URL, LLM_API_KEY, LLM_MODEL   (koi bhi OpenAI-compatible: Groq, OpenRouter, OpenAI...)
//   GEMINI_API_KEY               (+ optional GEMINI_MODEL, default gemini-2.5-flash)

function getProviders() {
  const list = [];

  if (process.env.ANTHROPIC_API_KEY) {
    list.push({
      id: "anthropic",
      kind: "anthropic",
      model: process.env.ANTHROPIC_MODEL || "claude-haiku-5-5"
    });
  }

  if (process.env.LLM_API_URL && process.env.LLM_API_KEY && process.env.LLM_MODEL) {
    list.push({
      id: "openai-compatible",
      kind: "openai",
      model: process.env.LLM_MODEL
    });
  }

  if (process.env.GEMINI_API_KEY) {
    const main = process.env.GEMINI_MODEL || "gemini-2.5-flash";
    list.push({ id: "gemini-main", kind: "gemini", model: main });
    if (main !== "gemini-2.5-flash-lite") {
      list.push({ id: "gemini-lite", kind: "gemini", model: "gemini-2.5-flash-lite" });
    }
  }

  return list;
}

export function hasBackupProvider({ excludeIds = [] } = {}) {
  return getProviders().some((p) => !excludeIds.includes(p.id));
}

function withTimeout(ms) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  return { signal: controller.signal, done: () => clearTimeout(timer) };
}

// messages: [{ role: "user"|"assistant", content: "text" }]
// image (optional): { base64, mime } - last user message ke saath jayegi
function normalizeMessages(messages) {
  const out = [];
  for (const m of messages || []) {
    const role = m.role === "assistant" || m.role === "model" ? "assistant" : "user";
    const text = String(m.content || "").trim();
    if (!text) continue;
    if (out.length && out[out.length - 1].role === role) {
      out[out.length - 1].content += "\n" + text;
    } else {
      out.push({ role, content: text });
    }
  }
  while (out.length && out[0].role !== "user") out.shift();
  return out;
}

async function callAnthropic(p, { system, messages, image, maxTokens, timeoutMs }) {
  const msgs = normalizeMessages(messages).map((m) => ({ role: m.role, content: m.content }));
  if (!msgs.length) msgs.push({ role: "user", content: "Image dekhiye." });

  if (image) {
    const last = msgs[msgs.length - 1];
    last.content = [
      { type: "image", source: { type: "base64", media_type: image.mime, data: image.base64 } },
      { type: "text", text: String(last.content) }
    ];
  }

  const t = withTimeout(timeoutMs);
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      signal: t.signal,
      headers: {
        "content-type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({ model: p.model, max_tokens: maxTokens, system, messages: msgs })
    });
    const bodyText = await res.text();
    if (!res.ok) throw new Error(`HTTP ${res.status} ${bodyText.slice(0, 200)}`);
    const data = JSON.parse(bodyText);
    return (data.content || []).filter((c) => c.type === "text").map((c) => c.text).join("\n").trim();
  } finally {
    t.done();
  }
}

async function callOpenAICompatible(p, { system, messages, image, maxTokens, timeoutMs }) {
  const msgs = [{ role: "system", content: system }];
  const norm = normalizeMessages(messages);
  if (!norm.length) norm.push({ role: "user", content: "Image dekhiye." });
  norm.forEach((m) => msgs.push({ role: m.role, content: m.content }));

  if (image) {
    const last = msgs[msgs.length - 1];
    last.content = [
      { type: "text", text: String(last.content) },
      { type: "image_url", image_url: { url: `data:${image.mime};base64,${image.base64}` } }
    ];
  }

  const t = withTimeout(timeoutMs);
  try {
    const res = await fetch(process.env.LLM_API_URL, {
      method: "POST",
      signal: t.signal,
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${process.env.LLM_API_KEY}`
      },
      body: JSON.stringify({ model: p.model, messages: msgs, max_tokens: maxTokens, temperature: 0.6 })
    });
    const bodyText = await res.text();
    if (!res.ok) throw new Error(`HTTP ${res.status} ${bodyText.slice(0, 200)}`);
    const data = JSON.parse(bodyText);
    return String(data.choices?.[0]?.message?.content || "").trim();
  } finally {
    t.done();
  }
}

async function callGemini(p, { system, messages, image, maxTokens, timeoutMs }) {
  const norm = normalizeMessages(messages);
  if (!norm.length) norm.push({ role: "user", content: "Image dekhiye." });

  const contents = norm.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }]
  }));

  if (image) {
    contents[contents.length - 1].parts.unshift({
      inlineData: { mimeType: image.mime, data: image.base64 }
    });
  }

  const t = withTimeout(timeoutMs);
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${p.model}:generateContent`,
      {
        method: "POST",
        signal: t.signal,
        headers: {
          "content-type": "application/json",
          "x-goog-api-key": process.env.GEMINI_API_KEY
        },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: system }] },
          contents,
          generationConfig: { maxOutputTokens: maxTokens, temperature: 0.6 }
        })
      }
    );
    const bodyText = await res.text();
    if (!res.ok) throw new Error(`HTTP ${res.status} ${bodyText.slice(0, 200)}`);
    const data = JSON.parse(bodyText);
    return (data.candidates?.[0]?.content?.parts || []).map((x) => x.text || "").join("").trim();
  } finally {
    t.done();
  }
}

// Providers ko order mein try karo. Pehla jo non-empty jawab de, wahi return.
export async function callLLM({
  system,
  messages,
  image = null,
  maxTokens = 700,
  timeoutMs = 9000,
  deadline = null,        // Date.now() ke hisaab se aakhri waqt (optional)
  excludeIds = []
}) {
  const providers = getProviders().filter((p) => !excludeIds.includes(p.id));

  if (!providers.length) {
    throw new Error("Koi backup AI provider configured nahi hai");
  }

  const errors = [];

  for (const p of providers) {
    if (deadline && Date.now() > deadline) {
      errors.push("time khatam");
      break;
    }

    const perCall = deadline ? Math.min(timeoutMs, Math.max(1500, deadline - Date.now())) : timeoutMs;

    try {
      const args = { system, messages, image, maxTokens, timeoutMs: perCall };
      let text = "";
      if (p.kind === "anthropic") text = await callAnthropic(p, args);
      else if (p.kind === "openai") text = await callOpenAICompatible(p, args);
      else text = await callGemini(p, args);

      if (text) {
        console.log(`LLM OK via ${p.id} (${p.model})`);
        return { text, provider: p.id };
      }
      errors.push(`${p.id}: khali jawab`);
    } catch (e) {
      const msg = `${p.id}: ${e.name === "AbortError" ? "timeout" : e.message}`;
      console.log("LLM FAIL ->", msg);
      errors.push(msg);
    }
  }

  throw new Error("Saare AI providers fail: " + errors.join(" | "));
}
