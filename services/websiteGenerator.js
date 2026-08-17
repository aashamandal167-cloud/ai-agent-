/**
 * ==========================================================
 * websiteGenerator.js
 * ==========================================================
 * Generates the CLIENT'S REAL, FINAL website (not a demo) -
 * using their actual uploaded product/business photos and
 * chosen color preference. Called once requirements are
 * "locked" (at least one photo + a color choice collected).
 * ==========================================================
 */

import ai from "../config/gemini.js";

const DESIGN_BRIEF = `
You are an expert web designer. Generate a COMPLETE, SINGLE-FILE HTML page
(inline <style> tag, no external CSS files, may use Google Fonts via <link>)
for a small business's REAL, LIVE website - this is their actual final
website, not a demo/sample.

STRUCTURE (adapt to the business, keep this general order):

1. A thin dark top bar with location pin + business hours + phone number (use the real values given below).
2. A nav bar: business name as logo on the left, 4-5 relevant nav links, a solid CTA button on the right (e.g. "Order on WhatsApp" / "Book Appointment" / "Join Now" depending on business type).
3. A hero section: bold headline reflecting the business, a short supporting paragraph, 1-2 CTA buttons, and a large image using ONE of the REAL PHOTO URLS given below (not placeholders).
4. A 4-item "perks/features" strip with emoji icons + short bold label + description relevant to this business type.
5. A products/services/gallery grid section - use the REAL PHOTO URLS given below (cycle through them if there are fewer photos than grid slots; if there's only 1-2 photos, use a smaller grid or repeat tastefully with different crops via CSS object-position, do not use any placeholder/stock images here).
6. A dark "about" section split into image + text (use a REAL PHOTO URL again): a short 2-3 sentence "our story" paragraph mentioning the real business name and city, + a row of 3 small stats.
7. An info strip: 3 cards - Timing, Location, Contact/Booking (use real details given below).
8. A contact section with a WhatsApp-green button "💬 WhatsApp par Message Kariye".
9. A footer with the business name and a simple copyright line (NO "this is a demo" disclaimer - this is their real live website).

STYLE RULES:
- Use Google Fonts (a serif display font for headings, clean sans body font) via <link> tags.
- Use CSS custom properties (:root) for a cohesive color palette CENTERED AROUND THE CLIENT'S CHOSEN COLOR given below - use it as the primary accent color throughout (buttons, headings, highlights), paired with a complementary neutral background.
- Fully responsive (mobile-first, use media queries, CSS grid).
- All text in natural Hinglish (Hindi+English mix), except product/service names which can stay in English.
- Do NOT include any placeholder brackets like [business name] anywhere - use the actual business name/city/details provided directly.
- Do NOT use any picsum.photos or other placeholder image service - ONLY use the real photo URLs provided below.

OUTPUT RULES (CRITICAL):
- Output ONLY the raw HTML, starting with <!DOCTYPE html> and ending with </html>.
- NO markdown code fences, NO explanation text before or after - just the raw HTML document.
`;

export async function generateFinalWebsite(state) {

  const business = state.business || "Business";
  const city = state.city || "";
  const color = state.colorPreference || "warm and professional";
  const photos = state.productPhotos || [];

  if (photos.length === 0) {
    throw new Error("No photos available to generate final website");
  }

  const photoList = photos.map((url, i) => `Photo ${i + 1}: ${url}`).join("\n");

  const prompt = `
${DESIGN_BRIEF}

REAL BUSINESS DETAILS:
- Business Name: ${business}
- City: ${city}
- Chosen Color Preference: ${color}

REAL PHOTO URLS (use these exact URLs as image src attributes, do not modify them):
${photoList}

Generate the complete final website HTML now.
`;

  const result = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt
  });

  let html =
    result.text ||
    result.candidates?.[0]?.content?.parts?.[0]?.text ||
    "";

  html = html.trim();

  if (html.startsWith("```")) {
    html = html.replace(/^```(html)?/i, "").replace(/```$/, "").trim();
  }

  if (!html || !html.toLowerCase().includes("<html")) {
    throw new Error("Final website generation returned invalid HTML");
  }

  return html;

    }
    
