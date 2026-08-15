/**
 * ==========================================================
 * demoGenerator.js
 * ==========================================================
 * Generates a full, custom, single-file HTML demo website
 * for each client's specific business, using Gemini.
 *
 * This replaces static pre-built demo files - every client
 * gets their own generated demo, matching their business
 * name, category and city.
 * ==========================================================
 */

import ai from "../config/gemini.js";

const DESIGN_BRIEF = `
You are an expert web designer. Generate a COMPLETE, SINGLE-FILE HTML page
(inline <style> tag, no external CSS files, may use Google Fonts via <link>)
for a small business's demo/marketing website.

STRUCTURE (follow this exact section order, adapt content to the business):

1. A small fixed "demo-badge" div in the top-right corner saying "Demo Website — Sample Preview".
2. A thin dark top bar with location pin + business hours + phone number (use placeholder realistic values).
3. A nav bar: logo/business name on the left, 4-5 nav links in the middle (hidden on mobile via media query), a solid CTA button on the right (e.g. "Order on WhatsApp" / "Book Appointment" / "Join Now" depending on business type).
4. A hero section: bold headline (using the business category's tone - e.g. elegant serif for fashion/salon, bold condensed for gym, warm for restaurant), a short supporting paragraph mentioning this is a sample demo website for [business name] in [city], 1-2 CTA buttons, and a large photographic image on the other side (use https://picsum.photos/seed/UNIQUEKEYWORD/900/1100 - pick a unique seed word each time).
5. A 4-item "perks/features" strip with emoji icons + short bold label + description (relevant to the business type - e.g. free delivery, expert staff, hygiene, secure payment).
6. A products/services/menu grid section (3-4 cards) - each card has an image (picsum.photos with a unique seed), a name, and a price or short description, relevant to the business category.
7. A dark "story" section split into image + text: a short 2-3 sentence "our story" paragraph (generic, sample placeholder tone) + a row of 3 small stats (e.g. years in business, rating, customer count).
8. An info strip: 3 cards - Timing, Location, Contact/Booking.
9. A small photo gallery grid (6 images, picsum.photos with unique seeds).
10. A contact section with a WhatsApp-green button "💬 WhatsApp par Message Kariye".
11. A footer with the text: "Yeh ek DEMO / SAMPLE website hai — sirf design idea dikhane ke liye banayi gayi hai."

STYLE RULES:
- Use Google Fonts (a serif display font for headings like Playfair Display, and a clean sans body font like Inter) via <link> tags.
- Use CSS custom properties (:root) for a cohesive color palette that fits the business category (e.g. warm earthy tones for fashion/restaurant, bold black+neon for gym, elegant dark+gold for salon, fresh green for grocery/kirana).
- Fully responsive (mobile-first, use media queries, CSS grid).
- All text should be in natural Hinglish (Hindi+English mix) matching how Indian small businesses talk to customers, EXCEPT product/menu names which can be in English.
- Use https://picsum.photos/seed/{unique-word}/{width}/{height} for ALL images - pick a different descriptive seed word for each image (do not repeat the same seed).
- Do NOT include any placeholder brackets like [business name] anywhere in the visible text - use the actual business name/city provided below directly.

REFERENCE EXAMPLE (this is a real, working demo we built for a fashion store - use this as your structural and quality benchmark. Match this level of polish, layout pattern, and code quality, but change the color palette, copy, product/service names, and business details to fit the NEW business given below - do not just copy this one verbatim):

--- REFERENCE HTML START ---
<!DOCTYPE html>
<html lang="hi">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Shaan Fashion Store — Demo Website</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500;600;700&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
  :root{
    --ink:#1a1a1a; --paper:#faf9f7; --line:#e7e3dc;
    --accent:#b5482a; --muted:#8a8378;
  }
  *{margin:0;padding:0;box-sizing:border-box;}
  body{font-family:'Inter',sans-serif;background:var(--paper);color:var(--ink);}
  img{width:100%;display:block;object-fit:cover;}
  .demo-badge{position:fixed;top:12px;right:12px;background:var(--ink);color:#fff;font-size:10px;letter-spacing:1.5px;padding:6px 12px;border-radius:20px;z-index:99;text-transform:uppercase;}
  .topbar{background:var(--ink);color:#eee;font-size:12px;padding:9px 6%;display:flex;justify-content:space-between;}
  .topbar span{opacity:.75;}
  nav{display:flex;justify-content:space-between;align-items:center;padding:20px 6%;border-bottom:1px solid var(--line);}
  .logo{font-family:'Playfair Display',serif;font-weight:700;font-size:22px;}
  .navlinks{display:none;gap:26px;font-size:14px;}
  @media(min-width:820px){ .navlinks{display:flex;} }
  .cta-btn{background:var(--ink);color:#fff;padding:11px 22px;font-size:13px;border:none;border-radius:2px;letter-spacing:.5px;text-decoration:none;}
  .hero{display:grid;grid-template-columns:1fr;padding:0 6%;margin:36px 0;gap:0;}
  @media(min-width:900px){ .hero{grid-template-columns:1fr 1.1fr; align-items:center; gap:40px;} }
  .hero-copy h1{font-family:'Playfair Display',serif;font-weight:700;font-size:clamp(36px,5.5vw,58px);line-height:1.05;margin-bottom:18px;}
  .hero-copy .accent{color:var(--accent);}
  .hero-copy p{font-size:15px;color:var(--muted);max-width:420px;margin-bottom:26px;line-height:1.6;}
  .hero-btns{display:flex;gap:12px;margin-bottom:28px;}
  .btn-outline{border:1px solid var(--ink);padding:11px 22px;font-size:13px;text-decoration:none;color:var(--ink);}
  .hero-img{border-radius:6px;overflow:hidden;aspect-ratio:4/5;}
  .perks{display:grid;grid-template-columns:repeat(2,1fr);gap:18px;padding:22px 6%;border-top:1px solid var(--line);border-bottom:1px solid var(--line);font-size:12.5px;}
  @media(min-width:820px){ .perks{grid-template-columns:repeat(4,1fr);} }
  .perks div{display:flex;gap:10px;align-items:center;color:var(--muted);}
  .perks b{color:var(--ink);display:block;font-size:13px;}

  section{padding:56px 6%;}
  .section-head{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:28px;}
  .section-head h2{font-family:'Playfair Display',serif;font-size:26px;font-weight:600;}
  .section-head a{font-size:13px;color:var(--ink);text-decoration:none;border-bottom:1px solid var(--ink);}

  .grid{display:grid;grid-template-columns:repeat(2,1fr);gap:20px;}
  @media(min-width:820px){ .grid{grid-template-columns:repeat(4,1fr);} }
  .card{}
  .card .imgwrap{border-radius:4px;overflow:hidden;aspect-ratio:3/4;margin-bottom:10px;position:relative;}
  .card .tag{position:absolute;top:10px;left:10px;background:var(--accent);color:#fff;font-size:10px;padding:4px 8px;border-radius:2px;letter-spacing:.5px;}
  .card h3{font-size:14px;font-weight:500;margin-bottom:4px;}
  .card .price{font-size:14px;font-weight:600;color:var(--accent);}

  .story{background:var(--ink);color:#eee;display:grid;grid-template-columns:1fr;gap:0;}
  @media(min-width:900px){ .story{grid-template-columns:1fr 1fr;} }
  .story-img{aspect-ratio:4/3;}
  .story-copy{padding:48px 8%;display:flex;flex-direction:column;justify-content:center;}
  .story-copy .eyebrow{color:var(--accent);font-size:12px;letter-spacing:2px;text-transform:uppercase;margin-bottom:14px;}
  .story-copy h2{font-family:'Playfair Display',serif;font-size:30px;margin-bottom:16px;}
  .story-copy p{font-size:14px;line-height:1.75;color:#c9c4ba;margin-bottom:24px;}
  .stat-row{display:flex;gap:30px;}
  .stat-row div b{font-family:'Playfair Display',serif;font-size:26px;display:block;color:var(--accent);}
  .stat-row div span{font-size:11px;letter-spacing:.5px;color:#9a9488;text-transform:uppercase;}

  .info-strip{display:grid;grid-template-columns:1fr;gap:16px;}
  @media(min-width:820px){ .info-strip{grid-template-columns:repeat(3,1fr);} }
  .info-card{border:1px solid var(--line);border-radius:6px;padding:24px;}
  .info-card h4{font-size:13px;text-transform:uppercase;letter-spacing:.5px;color:var(--muted);margin-bottom:10px;}
  .info-card p{font-size:14px;line-height:1.7;}

  .gallery{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;}
  @media(min-width:820px){ .gallery{grid-template-columns:repeat(6,1fr);} }
  .gallery .imgwrap{aspect-ratio:1/1;border-radius:4px;overflow:hidden;}

  .contact{text-align:center;background:#f2ede4;}
  .whatsapp-btn{background:#25D366;color:#fff;border:none;padding:15px 32px;border-radius:30px;font-size:14px;font-weight:600;cursor:pointer;margin-top:8px;}

  footer{background:var(--ink);color:#999;text-align:center;padding:26px 6%;font-size:12px;}
</style>
</head>
<body>

<div class="demo-badge">Demo Website — Sample Preview</div>

<div class="topbar">
  <span>📍 Andheri West, Mumbai</span>
  <span>Mon–Sun: 10:00 AM – 9:00 PM &nbsp; | &nbsp; +91 98765 43210</span>
</div>

<nav>
  <div class="logo">Shaan Fashion</div>
  <div class="navlinks">
    <span>New In</span><span>Women</span><span>Men</span><span>Accessories</span><span>Sale</span>
  </div>
  <a href="#contact" class="cta-btn">Order on WhatsApp</a>
</nav>

<div class="hero">
  <div class="hero-copy">
    <h1>Wear Your <span class="accent">Confidence</span></h1>
    <p>Latest collection, trendy pieces aur timeless style — sab kuch ek jagah. Yeh sample demo website hai, aapke Fashion Store ke liye bilkul aise hi customize ki ja sakti hai.</p>
    <div class="hero-btns">
      <a href="#collection" class="cta-btn">Shop New Arrivals</a>
      <a href="#contact" class="btn-outline">Visit Store</a>
    </div>
  </div>
  <div class="hero-img">
    <img src="https://picsum.photos/seed/fashionhero1/900/1100" alt="">
  </div>
</div>

<div class="perks">
  <div><b>🚚 Free Delivery</b> Orders above ₹999</div>
  <div><b>↩ Easy Returns</b> 7-day return policy</div>
  <div><b>🔒 Secure Payment</b> UPI, Cards, COD</div>
  <div><b>📍 Store Locator</b> Find us near you</div>
</div>

<section id="collection">
  <div class="section-head"><h2>New Arrivals</h2><a href="#">View all →</a></div>
  <div class="grid">
    <div class="card">
      <div class="imgwrap"><span class="tag">NEW</span><img src="https://picsum.photos/seed/fashion1/500/650" alt=""></div>
      <h3>Ribbed Knit Top</h3><div class="price">₹899</div>
    </div>
    <div class="card">
      <div class="imgwrap"><img src="https://picsum.photos/seed/fashion2/500/650" alt=""></div>
      <h3>Wide-Leg Denim</h3><div class="price">₹1,499</div>
    </div>
    <div class="card">
      <div class="imgwrap"><span class="tag">SALE</span><img src="https://picsum.photos/seed/fashion3/500/650" alt=""></div>
      <h3>Linen Blend Shirt</h3><div class="price">₹1,199</div>
    </div>
    <div class="card">
      <div class="imgwrap"><img src="https://picsum.photos/seed/fashion4/500/650" alt=""></div>
      <h3>Festive Ethnic Set</h3><div class="price">₹2,299</div>
    </div>
  </div>
</section>

<div class="story">
  <div class="story-img"><img src="https://picsum.photos/seed/fashionstore/700/560" alt=""></div>
  <div class="story-copy">
    <span class="eyebrow">Hamari Kahani</span>
    <h2>Ek dukaan se, ek digital pehchaan tak</h2>
    <p>Yeh sample text hai jo dikhata hai ki aapke business ki kahani is tarah ki website par kaise dikh sakti hai — aapki shuruaat, aapki mehnat, aur aapke customers ka bharosa, sab kuch ek jagah.</p>
    <div class="stat-row">
      <div><b>500+</b><span>Customers</span></div>
      <div><b>4.8★</b><span>Google Rating</span></div>
      <div><b>24×7</b><span>Online</span></div>
    </div>
  </div>
</div>

<section>
  <div class="info-strip">
    <div class="info-card"><h4>Store Timing</h4><p>Mon – Sun<br>10:00 AM – 9:00 PM</p></div>
    <div class="info-card"><h4>Location</h4><p>Andheri West,<br>Mumbai, Maharashtra</p></div>
    <div class="info-card"><h4>Contact</h4><p>WhatsApp button niche<br>dekhein, ya call karein</p></div>
  </div>
</section>

<section>
  <div class="section-head"><h2>From Our Store</h2></div>
  <div class="gallery">
    <div class="imgwrap"><img src="https://picsum.photos/seed/g1/300/300" alt=""></div>
    <div class="imgwrap"><img src="https://picsum.photos/seed/g2/300/300" alt=""></div>
    <div class="imgwrap"><img src="https://picsum.photos/seed/g3/300/300" alt=""></div>
    <div class="imgwrap"><img src="https://picsum.photos/seed/g4/300/300" alt=""></div>
    <div class="imgwrap"><img src="https://picsum.photos/seed/g5/300/300" alt=""></div>
    <div class="imgwrap"><img src="https://picsum.photos/seed/g6/300/300" alt=""></div>
  </div>
</section>

<section class="contact" id="contact">
  <h2 style="font-family:'Playfair Display',serif;font-size:26px;margin-bottom:8px;">Seedha WhatsApp par baat kariye</h2>
  <p style="color:var(--muted);font-size:14px;">Order, enquiry ya store visit ke liye</p>
  <button class="whatsapp-btn">💬 WhatsApp par Message Kariye</button>
</section>

<footer>Yeh ek DEMO / SAMPLE website hai — sirf design idea dikhane ke liye banayi gayi hai.</footer>

</body>
</html>

--- REFERENCE HTML END ---

OUTPUT RULES (CRITICAL):
- Output ONLY the raw HTML, starting with <!DOCTYPE html> and ending with </html>.
- NO markdown code fences (no \`\`\`html or \`\`\`), NO explanation text before or after - just the raw HTML document.
`;

export async function generateDemoWebsite(state) {

  const business = state.business || "is business";
  const city = state.city || "";
  const industryId = state.industryId || "general";

  const prompt = `
${DESIGN_BRIEF}

BUSINESS DETAILS FOR THIS SPECIFIC DEMO:
- Business Name: ${business}
- Business Category: ${industryId}
- City: ${city}

Generate the complete HTML now for this specific business.
`;

  const result = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt
  });

  let html =
    result.text ||
    result.candidates?.[0]?.content?.parts?.[0]?.text ||
    "";

  // Defensive cleanup - strip markdown code fences if Gemini adds them anyway
  html = html.trim();

  if (html.startsWith("```")) {
    html = html.replace(/^```(html)?/i, "").replace(/```$/, "").trim();
  }

  // Safety fallback - if generation somehow failed/empty, throw so the
  // caller can fall back to a static demo file instead of sending a
  // broken link to the customer.
  if (!html || !html.toLowerCase().includes("<html")) {
    throw new Error("Demo generation returned invalid HTML");
  }

  return html;

}
