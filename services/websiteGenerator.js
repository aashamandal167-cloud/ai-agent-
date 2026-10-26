// services/websiteGenerator.js
// Payment ke baad customer ki REAL website banata hai (photos + color + business details).
//
// DO LAYER (taaki website kabhi na ruke):
//  1) generateFinalWebsite(state)  -> TURANT ek achhi, mobile-friendly template website banata hai
//     (koi AI/Gemini nahi lagta, isliye kabhi fail nahi hota). Customer ko link isi se milta hai.
//  2) generateAIWebsite(state)     -> background mein AI se zyada custom design banata hai
//     (llmClient.js ke providers). Ban jaye to server usi link par purani HTML badal deta hai.
import { callLLM, hasBackupProvider } from "./llmClient.js";

function esc(v) {
  return String(v == null ? "" : v)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const COLOR_MAP = {
  blue: "#2563eb", nila: "#2563eb", neela: "#2563eb",
  red: "#dc2626", lal: "#dc2626",
  gold: "#c9a227", golden: "#c9a227",
  pink: "#db2777", gulabi: "#db2777",
  black: "#111827", kala: "#111827",
  white: "#2563eb", safed: "#2563eb",
  green: "#16a34a", hara: "#16a34a",
  purple: "#7c3aed", jamuni: "#7c3aed",
  orange: "#ea580c", narangi: "#ea580c",
  yellow: "#eab308", peela: "#eab308"
};

function pickAccent(pref) {
  const p = String(pref || "").toLowerCase();
  for (const k of Object.keys(COLOR_MAP)) {
    if (p.includes(k)) return COLOR_MAP[k];
  }
  return "#c07a3a";
}

const KINDS = [
  { key: "gym", words: ["gym", "fitness"], tagline: "Strong body. Stronger mind.", items: ["Muscle Building", "Weight Loss", "Personal Training", "Cardio & Strength"] },
  { key: "salon", words: ["salon", "barber", "hair"], tagline: "Look good. Feel confident.", items: ["Haircut & Styling", "Beard Trim", "Hair Colour", "Skin Care"] },
  { key: "parlour", words: ["parlour", "parlor", "beauty", "makeup", "bridal"], tagline: "Beauty that makes you shine.", items: ["Facial", "Hair Styling", "Bridal Makeup", "Manicure & Pedicure"] },
  { key: "restaurant", words: ["restaurant", "cafe", "coffee", "dhaba", "hotel", "food", "biryani", "pizza"], tagline: "Good food, good vibes.", items: ["Fresh Menu", "Dine-in", "Takeaway", "Special Dishes"] },
  { key: "bakery", words: ["bakery", "cake", "mithai", "sweet"], tagline: "Baked fresh, made with love.", items: ["Custom Cakes", "Pastries", "Cookies", "Sweets"] },
  { key: "clinic", words: ["clinic", "dental", "doctor", "dentist", "hospital"], tagline: "Caring for your health.", items: ["Check-ups", "Treatments", "Expert Doctors", "Easy Appointments"] },
  { key: "coaching", words: ["coaching", "tuition", "institute", "academy", "classes", "school"], tagline: "Learn smart, score higher.", items: ["Expert Faculty", "Regular Tests", "Small Batches", "Doubt Support"] },
  { key: "mobile", words: ["mobile", "phone", "electronic", "laptop"], tagline: "Latest phones, best prices.", items: ["New Phones", "Accessories", "Repair Services", "Easy EMI"] },
  { key: "kirana", words: ["kirana", "grocery", "general store", "supermarket", "ration"], tagline: "Fresh groceries, at your doorstep.", items: ["Daily Essentials", "Fresh Vegetables", "Home Delivery", "Best Prices"] },
  { key: "fashion", words: ["fashion", "cloth", "kapde", "garment", "boutique", "saree"], tagline: "Wear your confidence.", items: ["New Arrivals", "Latest Trends", "Best Quality", "Easy Returns"] }
];

function detectKind(state) {
  const text = `${state.business || ""} ${state.industryId || ""} ${state.industryName || ""}`.toLowerCase();
  for (const k of KINDS) {
    if (k.words.some((w) => text.includes(w))) return k;
  }
  return { key: "general", tagline: "Aapka apna business, ab online.", items: ["Quality Service", "Trusted by Customers", "Fair Prices", "Easy to Contact"] };
}

function safeUrl(u) {
  const s = String(u || "").trim();
  return /^https?:\/\/[^\s"'<>]+$/i.test(s) ? s : "";
}

// ---------- 1) Turant banne wali template website ----------
export async function generateFinalWebsite(state) {

  const name = esc(state.business || "Our Business");
  const city = esc(state.city || "");
  const kind = detectKind(state);
  const accent = pickAccent(state.colorPreference);
  const photos = (state.productPhotos || []).map(safeUrl).filter(Boolean);
  const hero = photos[0] || "";
  const wa = String(state.contactNumber || "").replace(/\D/g, "");

  const gallery = photos.length
    ? `<section id="gallery"><h2>Gallery</h2><div class="grid">${photos.map((p) => `<img loading="lazy" src="${esc(p)}" alt="${name}">`).join("")}</div></section>`
    : "";

  const cards = kind.items.map((t) => `<div class="card"><h3>${esc(t)}</h3><p>Behtareen quality aur bharosemand service.</p></div>`).join("");

  const contactBtn = wa
    ? `<a class="btn" href="https://wa.me/${wa}">WhatsApp par baat karein</a>`
    : `<a class="btn" href="#contact">Sampark karein</a>`;

  return `<!DOCTYPE html>
<html lang="hi">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${name}${city ? " - " + city : ""}</title>
<style>
  :root { --accent: ${accent}; --bg: #ffffff; --text: #1a1a1d; --muted: #61616b; --card: #f4f4f6; }
  @media (prefers-color-scheme: dark) {
    :root { --bg: #111114; --text: #f1f1f3; --muted: #a8a8b1; --card: #1c1c21; }
  }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; background: var(--bg); color: var(--text); line-height: 1.6; }
  header { position: sticky; top: 0; z-index: 5; display: flex; justify-content: space-between; align-items: center; padding: 12px 18px; background: var(--bg); border-bottom: 1px solid rgba(128,128,128,.25); }
  header b { font-size: 18px; }
  .btn { display: inline-block; background: var(--accent); color: #fff; padding: 11px 20px; border-radius: 999px; text-decoration: none; font-weight: 600; }
  .hero { min-height: 70vh; display: flex; align-items: center; padding: 40px 20px; color: #fff; background: linear-gradient(rgba(0,0,0,.55), rgba(0,0,0,.65))${hero ? `, url("${esc(hero)}") center/cover` : `, ${accent}`}; }
  .hero div { max-width: 720px; margin: 0 auto; width: 100%; }
  .hero h1 { font-size: clamp(32px, 8vw, 56px); margin: 0 0 10px; line-height: 1.1; }
  .hero p { font-size: 18px; margin: 0 0 22px; opacity: .95; }
  section { max-width: 960px; margin: 0 auto; padding: 44px 18px; }
  h2 { font-size: 28px; margin: 0 0 18px; }
  .cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 14px; }
  .card { background: var(--card); border-radius: 14px; padding: 18px; border-top: 4px solid var(--accent); }
  .card h3 { margin: 0 0 6px; }
  .card p { margin: 0; color: var(--muted); font-size: 15px; }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 12px; }
  .grid img { width: 100%; height: 220px; object-fit: cover; border-radius: 12px; }
  #contact { text-align: center; background: var(--card); border-radius: 16px; margin-bottom: 30px; }
  footer { text-align: center; color: var(--muted); padding: 24px 12px 40px; font-size: 14px; }
</style>
</head>
<body>
<header><b>${name}</b>${contactBtn}</header>
<div class="hero"><div>
  <h1>${name}</h1>
  <p>${esc(kind.tagline)}${city ? " &middot; " + city : ""}</p>
  ${contactBtn}
</div></div>
<section id="about">
  <h2>Hamare Baare Mein</h2>
  <p>${name}${city ? ", " + city + " mein" : ""} aapki seva mein hazir hai. Hum quality, bharosa aur behtareen customer service ka vaada karte hain. Aaiye, aur khud farak mehsoos kijiye.</p>
</section>
<section id="services">
  <h2>Hamari Khaasiyat</h2>
  <div class="cards">${cards}</div>
</section>
${gallery}
<section id="contact">
  <h2>Sampark Karein</h2>
  <p>${name}${city ? ", " + city : ""}</p>
  ${contactBtn}
</section>
<footer>&copy; ${new Date().getFullYear()} ${name}. All rights reserved.</footer>
</body>
</html>`;
}

// ---------- 2) Background mein AI se custom design ----------
export async function generateAIWebsite(state) {

  if (!hasBackupProvider()) return null;

  const photos = (state.productPhotos || []).map(safeUrl).filter(Boolean);
  const cat = String(state.selectedCategory || "").toLowerCase();

  let styleRule = "Clean, modern, professional template design.";
  if (cat.includes("3d")) styleRule = "Premium look with subtle CSS 3D effects (perspective tilt on card hover, layered depth shadows).";
  if (cat.includes("animated")) styleRule = "Premium look with smooth CSS/JS animations (fade/slide-in on scroll, animated counters, hover effects).";

  const system = `You are an expert web designer. Output ONE complete, self-contained HTML5 file (inline CSS, optional small inline JS) and NOTHING else - no markdown fences, no explanation.
Rules:
- Mobile-first, responsive, fast. Define colours as CSS variables and support prefers-color-scheme dark.
- Write visible text in simple Hinglish/English suited to an Indian local business.
- Use ONLY these image URLs exactly as given (do not invent other images): ${photos.length ? photos.join(" , ") : "(none - use CSS gradients instead of images)"}.
- Sections: header with business name, hero, about, services/highlights fitting the business type, gallery (only if images given), contact section, footer.
- ${styleRule}
- No external scripts, fonts or stylesheets. No placeholder text like [Name].
- Do not invent phone numbers, addresses or prices.`;

  const user = `Business: ${state.business || "Local business"}
City: ${state.city || ""}
Colour preference: ${state.colorPreference || "professional default"}
Website category: ${state.selectedCategory || "Template"}
Contact WhatsApp number (use for a wa.me button if present): ${state.contactNumber || "(not available)"}`;

  // Customer ne "isi tarah ki website banao" ke liye reference image di ho to AI ko dikhao
  let image = null;
  const refUrl = safeUrl((state.referenceImages || [])[0]);

  if (refUrl) {
    try {
      const r = await fetch(refUrl);
      if (r.ok) {
        const buf = Buffer.from(await r.arrayBuffer());
        if (buf.length > 0 && buf.length < 4000000) {
          image = {
            base64: buf.toString("base64"),
            mime: String(r.headers.get("content-type") || "image/jpeg").split(";")[0].trim().toLowerCase()
          };
        }
      }
    } catch (e) {
      console.log("REFERENCE IMAGE FETCH FAILED:", e.message);
    }
  }

  const refRule = image
    ? "\n- A reference screenshot of ANOTHER website is attached. Follow its general layout and section structure, but use this business's own name, colours and text. Do NOT copy its logo, brand name or wording."
    : "";

  const { text } = await callLLM({
    system: system + refRule,
    messages: [{ role: "user", content: user }],
    image,
    maxTokens: 7000,
    timeoutMs: 90000
  });

  let html = String(text || "").trim()
    .replace(/^```(?:html)?\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();

  if (!/<html[\s>]/i.test(html) || !/<\/html>/i.test(html) || html.length < 1500) {
    return null;
  }

  // Bahari scripts hata do (safety)
  html = html.replace(/<script[^>]*\bsrc\s*=[^>]*>\s*<\/script>/gi, "");

  return html;
}
