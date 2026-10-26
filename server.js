import express from "express";
import fetch from "node-fetch";
import { createClient } from "@supabase/supabase-js";
import twilio from "twilio";
import fs from "fs";
import path from "path";
import ai from "./config/gemini.js";
import { getBrain } from "./services/brainManager.js";
import { generateReply } from "./services/aiService.js";
import { updateStage } from "./services/stageManager.js";
import INDUSTRIES from "./knowledge/industries.js";
import { generateDemoWebsite } from "./services/demoGenerator.js";
import { generateFinalWebsite, generateAIWebsite } from "./services/websiteGenerator.js";
import { extractPaymentInfo, analyzeCustomerImage } from "./services/paymentVerifier.js";
import { generateReplyFallback, backupLLMConfigured } from "./services/aiFallback.js";

const conversations = {};
const clientState = {};

// Per-phone-number processing queue - ensures messages from the SAME
// number are always processed one at a time, in order, even if a
// second message arrives while the first is still being handled
// (e.g. waiting on a slow Gemini call). This prevents two overlapping
// requests from both reading/writing the same state and both sending
// replies for what looks like one message.
const userQueues = {};

function runSequential(userNumber, task) {
  const previous = userQueues[userNumber] || Promise.resolve();
  const current = previous.then(task, task);
  userQueues[userNumber] = current.catch(() => {});
  return current;
}

const app = express();
const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

// Supabase Safe Init
let supabase = null;

if (
  process.env.SUPABASE_URL &&
  process.env.SUPABASE_KEY
) {
  supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_KEY
  );
}

app.use(express.json());

app.use(express.urlencoded({ extended: true }));

// Demo gallery page: HTML seedha server.js mein hai, taaki GitHub par purani
// view.html padi ho to bhi hamesha naya wala hi khule. (static se PEHLE rakha hai)
const DEMO_VIEW_HTML = "<!DOCTYPE html>\n<html lang=\"hi\">\n<head>\n<meta charset=\"UTF-8\">\n<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">\n<title>Sample Website Design</title>\n<style>\n  :root {\n    --bg: #f4f1ec;\n    --text: #1d1d1f;\n    --muted: #5f5f66;\n    --card: #ffffff;\n    --accent: #c07a3a;\n  }\n  @media (prefers-color-scheme: dark) {\n    :root {\n      --bg: #121214;\n      --text: #f2f2f4;\n      --muted: #a3a3ab;\n      --card: #1c1c20;\n      --accent: #e0a060;\n    }\n  }\n  * { box-sizing: border-box; }\n  body {\n    margin: 0;\n    background: var(--bg);\n    color: var(--text);\n    font-family: system-ui, -apple-system, \"Segoe UI\", Roboto, sans-serif;\n  }\n  .bar {\n    padding: 14px 16px;\n    text-align: center;\n    font-weight: 600;\n    background: var(--card);\n    border-bottom: 1px solid rgba(128,128,128,.25);\n  }\n  .bar span { color: var(--accent); }\n  .wrap { max-width: 820px; margin: 0 auto; padding: 14px 12px 28px; }\n  .note { font-size: 14px; line-height: 1.5; color: var(--muted); text-align: center; margin: 4px 4px 14px; }\n  .shot {\n    display: block;\n    width: 100%;\n    height: auto;\n    border-radius: 10px;\n    box-shadow: 0 4px 18px rgba(0,0,0,.25);\n    background: var(--card);\n  }\n  .cta { text-align: center; margin-top: 18px; font-size: 15px; line-height: 1.5; }\n  .cta b { color: var(--accent); }\n  .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }\n  .card { display: block; text-decoration: none; color: var(--text); background: var(--card); border-radius: 10px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,.18); }\n  .card img { display: block; width: 100%; aspect-ratio: 3 / 4; object-fit: cover; object-position: top; }\n  .card span { display: block; padding: 8px 10px; font-size: 14px; font-weight: 600; text-align: center; }\n  .back { display: inline-block; margin-bottom: 10px; color: var(--accent); text-decoration: none; font-size: 14px; }\n  .missing { text-align: center; padding: 60px 16px; color: var(--muted); }\n</style>\n</head>\n<body>\n<div class=\"bar\">Sample <span>Website Design</span></div>\n<div class=\"wrap\" id=\"app\"></div>\n<script>\n  var labels = {\n    \"gym\": \"Gym / Fitness\",\n    \"salon\": \"Men's Salon\",\n    \"beauty-parlour\": \"Beauty Parlour\",\n    \"restaurant\": \"Restaurant / Cafe\",\n    \"fashion\": \"Fashion Store\",\n    \"kirana\": \"Kirana / Grocery\",\n    \"bakery\": \"Bakery / Sweets\",\n    \"mobile-shop\": \"Mobile / Electronics\",\n    \"clinic\": \"Clinic / Dental\",\n    \"coaching\": \"Coaching / Tuition\"\n  };\n  var allowed = Object.keys(labels);\n  var params = new URLSearchParams(window.location.search);\n  var key = params.get(\"d\");\n  var app = document.getElementById(\"app\");\n\n  if (key === \"all\" || key === null) {\n    var html = '<p class=\"note\">Apne business jaisa sample design chuniye. Aapki website aapke business ke naam, colors, photos aur products ke hisaab se customize hogi.</p><div class=\"grid\">';\n    allowed.forEach(function (k) {\n      html += '<a class=\"card\" href=\"?d=' + k + '\"><img alt=\"' + labels[k] + '\" src=\"' + k + '.jpg\"><span>' + labels[k] + '</span></a>';\n    });\n    html += '</div>';\n    app.innerHTML = html;\n  } else if (allowed.indexOf(key) === -1) {\n    app.innerHTML = '<div class=\"missing\">Sample design nahi mila.</div>';\n  } else {\n    app.innerHTML =\n      '<a class=\"back\" href=\"?d=all\">&larr; Aur designs dekhiye</a>' +\n      '<p class=\"note\">Ye ek sample design hai. Aapki website aapke business ke naam, colors, photos aur products ke hisaab se customize hogi.</p>' +\n      '<img class=\"shot\" alt=\"Sample website design\" src=\"' + key + '.jpg\">' +\n      '<p class=\"cta\">Design pasand aaya? <b>WhatsApp par Raj ko reply kijiye.</b></p>';\n  }\n</script>\n</body>\n</html>\n";

app.get("/demo-samples/view.html", (req, res) => {
  res.set("Cache-Control", "no-cache");
  res.type("html").send(DEMO_VIEW_HTML);
});

app.use(express.static("."));

// QR image: repo ke root mein ho ya services/ folder mein - dono jagah se chalega.
app.get("/qr-code.png", (req, res) => {
  const candidates = [
    path.resolve("qr-code.png"),
    path.resolve("services", "qr-code.png")
  ];
  const found = candidates.find((p) => fs.existsSync(p));
  if (found) {
    return res.sendFile(found);
  }
  res.status(404).send("qr-code.png nahi mili (root ya services folder mein daaliye)");
});

// Demo sample files: demo-samples folder root mein ho, services/ ke andar ho,
// ya files seedha root/services mein padi hon - sab jagah se chalega.
app.get("/demo-samples/:file", (req, res) => {
  const name = req.params.file;
  if (!/^[a-z0-9-]+\.(jpg|html)$/.test(name)) {
    return res.status(404).send("Not found");
  }
  const candidates = [
    path.resolve("demo-samples", name),
    path.resolve("services", "demo-samples", name),
    path.resolve("services", name),
    path.resolve(name)
  ];
  const found = candidates.find((p) => fs.existsSync(p));
  if (found) {
    return res.sendFile(found);
  }
  console.log("DEMO SAMPLE NOT FOUND:", name, candidates);
  res.status(404).send("Demo sample file nahi mili: " + name);
});

// The business owner's own WhatsApp number - payment screenshots get
// forwarded here for manual approval before anything is confirmed.
const OWNER_NUMBER = process.env.OWNER_WHATSAPP_NUMBER || "whatsapp:+918735054297";

// Generic helper to send a WhatsApp message to ANY number (not tied to
// the current request's customer) - used for owner notifications and
// for proactively confirming to a customer once the owner approves.
// Return: true = message chala gaya, false = fail (caller backup plan use kar sakta hai)
async function sendWhatsAppMessageTo(toNumber, fromNumber, text, mediaUrl) {
  try {
    const payload = { body: text, from: fromNumber, to: toNumber };
    if (mediaUrl) payload.mediaUrl = [mediaUrl];
    await twilioClient.messages.create(payload);
    return true;
  } catch (e) {
    console.log("SEND TO", toNumber, "ERROR:", e.message);
    return false;
  }
}

// Owner ke liye: sabhi pending payment approvals ki list (memory + Supabase)
async function listPendingApprovals() {
  const found = {};
  for (const phone of Object.keys(clientState)) {
    const st = clientState[phone];
    if (st && (st.paymentPendingApproval || st.remainingPaymentPendingApproval || st.autoVerifiedReview)) {
      found[phone] = st;
    }
  }
  if (supabase) {
    try {
      const { data, error } = await supabase.from("client_state").select("phone,state");
      if (!error && data) {
        for (const row of data) {
          if (!found[row.phone] && row.state && (row.state.paymentPendingApproval || row.state.remainingPaymentPendingApproval || row.state.autoVerifiedReview)) {
            found[row.phone] = row.state;
          }
        }
      }
    } catch (e) {
      console.log("LIST PENDING EXCEPTION:", e.message);
    }
  }
  return Object.entries(found).map(([phone, st]) => ({ phone, state: st }));
}

// Uploads a downloaded image buffer to Supabase Storage and returns a
// public URL - used to re-host payment screenshots so they can be
// forwarded to the owner's WhatsApp (Twilio media URLs need auth and
// can't be reused directly in a new outbound message).
async function rehostImage(buffer, contentType, labelPrefix) {
  if (!supabase) return null;
  try {
    const ext = (contentType || "").includes("png") ? "png" : "jpg";
    const fileName = `${labelPrefix}_${Date.now()}.${ext}`;
    const { error } = await supabase.storage
      .from("client-photos")
      .upload(fileName, buffer, { contentType: contentType || "image/jpeg" });
    if (error) {
      console.log("REHOST IMAGE ERROR:", JSON.stringify(error));
      return null;
    }
    const { data } = supabase.storage.from("client-photos").getPublicUrl(fileName);
    return data?.publicUrl || null;
  } catch (e) {
    console.log("REHOST IMAGE EXCEPTION:", e.message);
    return null;
  }
}

// Searches in-memory + Supabase for a customer with a pending payment
// approval whose phone number ends in the given 4-digit code.
async function findPendingApprovalByCode(code) {

  // Check in-memory cache first (fast path, covers active conversations)
  for (const phone of Object.keys(clientState)) {
    const s = clientState[phone];
    if (
      phone.endsWith(code) &&
      (s.paymentPendingApproval || s.remainingPaymentPendingApproval || s.autoVerifiedReview)
    ) {
      return { phone, state: s };
    }
  }

  // Fall back to Supabase in case the server restarted / it's not cached
  if (supabase) {
    try {
      const { data, error } = await supabase.from("client_state").select("phone,state");
      if (!error && data) {
        for (const row of data) {
          if (
            row.phone.endsWith(code) &&
            row.state &&
            (row.state.paymentPendingApproval || row.state.remainingPaymentPendingApproval)
          ) {
            return { phone: row.phone, state: row.state };
          }
        }
      }
    } catch (e) {
      console.log("FIND PENDING APPROVAL EXCEPTION:", e.message);
    }
  }

  return null;
}

app.get("/", (req, res) => {
  res.sendFile(process.cwd() + "/index.html");
});

// Serves a client's AI-generated custom demo website by id.
app.get("/demo/:id", async (req, res) => {

  if (!supabase) {
    return res.status(503).send("Demo storage not configured.");
  }

  try {

    const { data, error } = await supabase
      .from("generated_demos")
      .select("html")
      .eq("id", req.params.id)
      .maybeSingle();

    if (error || !data) {
      return res.status(404).send("Demo not found. Link may have expired.");
    }

    res.set("Content-Type", "text/html");
    res.send(data.html);

  } catch (err) {
    res.status(500).send("Error loading demo: " + err.message);
  }

});

// Serves a client's REAL final generated website by id.
app.get("/site/:id", async (req, res) => {

  if (!supabase) {
    return res.status(503).send("Website storage not configured.");
  }

  try {

    const { data, error } = await supabase
      .from("client_websites")
      .select("html")
      .eq("id", req.params.id)
      .maybeSingle();

    if (error || !data) {
      return res.status(404).send("Website not found.");
    }

    res.set("Content-Type", "text/html");
    res.send(data.html);

  } catch (err) {
    res.status(500).send("Error loading website: " + err.message);
  }

});

app.get("/test-sms", async (req, res) => {
  
  try {

    const result = await twilioClient.messages.create({
      body: "Twilio Connected 🚀",
      from: process.env.TWILIO_PHONE_NUMBER,
      to: "+918735054297"
    });

    res.json({
      success: true,
      sid: result.sid
    });

  } catch (err) {
    res.json({
      success: false,
      error: err.message
    });
  }
});

// FIND CLIENTS API
app.get("/find-clients", async (req, res) => {
  try {
    const query = req.query.search || "gym owners Ahmedabad";


    const response = await fetch(
      `https://api.apify.com/v2/acts/compass~google-maps-extractor/run-sync-get-dataset-items?token=${process.env.APIFY_API_TOKEN}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          searchStringsArray: [query],
          maxCrawledPlacesPerSearch: 10
        })
      }
    );

    const data = await response.json();

// SAVE CLIENT SEARCH HISTORY

if (supabase) {

  for (const lead of data) {

    try {

      await supabase
        .from("client_chat_history")
        .insert([
          {
            client_name: lead.title || "No Name",
            phone: lead.phone || "No Phone",
            address: lead.address || "No Address"
          }
        ]);

    } catch (e) {

      console.log(
        "CLIENT HISTORY ERROR:",
        e.message
      );

    }

  }

}
    
    res.json({
      success: true,
      leads: data
    });

  } catch (error) {
    res.json({
      success: false,
      error: error.message
    });
  }
});

// MANUAL CLIENT ADD

app.get("/add-client", (req, res) => {
  res.send("Add Client API Working 🚀");
});

app.get("/test-add-client", async (req, res) => {
  try {

    const { error } = await supabase
      .from("clients")
      .insert([
        {
          name: "Test Client",
          phone: "9999999999",
          address: "Ahmedabad",
          website: "Manual Entry"
        }
      ]);

    if (error) {
      return res.json({
        success: false,
        error: error.message
      });
    }

    res.json({
      success: true,
      message: "Client saved 🚀"
    });

  } catch (err) {
    res.json({
      success: false,
      error: err.message
    });
  }
});

app.post("/add-client", async (req, res) => {
  try {

    const { name, phone, address } = req.body;

    if (!name || !phone || !address) {
      return res.json({
        success: false,
        message: "Name, phone aur address required hai"
      });
    }

    const { error } = await supabase
      .from("clients")
      .insert([
        {
          name,
          phone,
          address,
          website: "Manual Entry"
        }
      ]);

    if (error) {
      return res.json({
        success: false,
        error: error.message
      });
    }

    res.json({
      success: true,
      message: "Client save ho gaya Boss 🚀"
    });

  } catch (err) {
    res.json({
      success: false,
      error: err.message
    });
  }
});


// CHAT
app.post("/chat", async (req, res) => {
  try {

const { message, chat_id } = req.body;

const userMessage = message.toLowerCase();

const cleanSearch = message

  .replace(/client|clients|dhundo|dundho|dhundho|find|search|khojo|nikalo|dusra|koi aur|aur|next/g, "")

  .replace(/किराना/g, "kirana store")
  .replace(/फ्रेंचाइजी/g, "franchise store")
  .replace(/ब्रांड आउटलेट/g, "brand outlet")
  .replace(/सुपरमार्केट/g, "supermarket")
  .replace(/फल.*सब्ज़ी/g, "vegetable store")
  .replace(/कपड़े|बुटीक/g, "clothing boutique")
  .replace(/जूते/g, "footwear store")
  .replace(/आभूषण/g, "jewellery shop")
  .replace(/कॉस्मेटिक्स/g, "cosmetics store")
  .replace(/मोबाइल/g, "mobile shop")
  .replace(/कंप्यूटर/g, "computer shop")
  .replace(/फर्नीचर/g, "furniture showroom")
  .replace(/हार्डवेयर/g, "hardware store")
  .replace(/मेडिकल/g, "medical store")
  .replace(/आयुर्वेदिक/g, "ayurvedic store")
  .replace(/चश्मा/g, "optical shop")
  .replace(/बुक/g, "book store")
  .replace(/खिलौने/g, "toy store")
  .replace(/स्पोर्ट्स/g, "sports shop")
  .replace(/जिम/g, "gym")
  .replace(/सैलून/g, "salon")
  .replace(/स्पा/g, "spa")
  .replace(/कॉफ़ी|कैफ़े/g, "coffee shop")
  .replace(/चाय/g, "tea shop")

  .trim() + " india";
    
    // Client Search Mode
    if (
  userMessage.includes("client") ||
  userMessage.includes("clients") ||
  userMessage.includes("dhundo") ||
  userMessage.includes("dundho") ||
  userMessage.includes("dhundho") ||
  userMessage.includes("find") ||
  userMessage.includes("search") ||
  userMessage.includes("khojo") ||
  userMessage.includes("nikalo") ||
  userMessage.includes("aur") ||
  userMessage.includes("koi aur") ||
  userMessage.includes("dusra") ||
  userMessage.includes("next") ||
  userMessage.includes("1") ||
  userMessage.includes("2") ||
  userMessage.includes("3") ||
  userMessage.includes("4") ||
  userMessage.includes("5") ||
  userMessage.includes("6") ||
  userMessage.includes("7") ||
  userMessage.includes("8") ||
  userMessage.includes("9") ||
  userMessage.includes("10")
) {

      const apifyResponse = await fetch(
        `https://api.apify.com/v2/acts/compass~google-maps-extractor/run-sync-get-dataset-items?token=${process.env.APIFY_API_TOKEN}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            searchStringsArray: [cleanSearch],
            maxCrawledPlacesPerSearch: 10
          })
        }
      );

      const leads = await apifyResponse.json();

      const filteredLeads = leads.filter(
        x => x.phone && x.title
      );

      // Save to Supabase safely
      if (supabase) {
        for (const lead of filteredLeads) {
          try {
            await supabase.from("clients").insert([
              {
                name: lead.title,
                address: lead.address,
                phone: lead.phone,
                website: lead.website || "No Website"
              }
            ]);
          } catch {}
        }
      }

      if (filteredLeads.length === 0) {
        return res.json({
          reply: "Boss 🚀 koi client nahi mila."
        });
      }

      const names = filteredLeads
        .slice(0, 5)
        .map(
          x => `${x.title}
📍 ${x.address}
📞 ${x.phone}
🌐 ${x.website || "No Website"}`
        )
        .join("\n\n");

      return res.json({
        reply: `Boss 🚀 ${filteredLeads.length} clients mil gaye aur database me save kar diye:\n\n${names}`
      });
    }


   // Boss AI Chat (Gemini)

const state = {
  stage: "DISCOVERY"
};

const recentHistory = [
  {
    role: "user",
    content: req.body.message
  }
];

const aiReply = await generateReply({
  state,
  recentHistory,
  extraRule: ""
});

// Save Chat History
if (supabase) {
  try {
    await supabase
      .from("my_chat_history")
      .insert([
        {
          message: req.body.message,
          reply: aiReply,
          chat_id: chat_id
        }
      ]);

    console.log("Chat Saved 🚀");
  } catch (e) {
    console.log("History Save Error:", e.message);
  }
}

res.json({
  reply: aiReply
});

  } catch (error) {
    res.json({
      reply: error.message
    });
  }
});

app.get("/test-twilio", (req, res) => {
  res.json({
    sidExists: !!process.env.TWILIO_ACCOUNT_SID,
    tokenExists: !!process.env.TWILIO_AUTH_TOKEN,
    phoneExists: !!process.env.TWILIO_PHONE_NUMBER
  });
});

app.get("/check-sid", (req, res) => {
  res.json({
    sidStart: process.env.TWILIO_ACCOUNT_SID?.substring(0, 5),
    sidLength: process.env.TWILIO_ACCOUNT_SID?.length
  });
});

app.get("/check-token", (req, res) => {
  res.json({
    tokenLength: process.env.TWILIO_AUTH_TOKEN?.length
  });
});

app.get("/test-supabase", async (req, res) => {

  if (!supabase) {
    return res.json({
      success: false,
      message: "Supabase NOT Connected"
    });
  }

  return res.json({
    success: true,
    message: "Supabase Connected 🚀"
  });

});

app.get("/test-history-save", async (req, res) => {
  try {

    const { data, error } = await supabase
      .from("my_chat_history")
      .insert([
{
message: req.body.message,
reply: aiReply,
chat_id: req.body.chat_id
}
])
      .select();

    if (error) {
      return res.json({
        success: false,
        error
      });
    }

    res.json({
      success: true,
      data
    });

  } catch (err) {
    res.json({
      success: false,
      error: err.message
    });
  }
});

// GET CHAT HISTORY
app.get("/get-history", async (req, res) => {

  try {

    const { data, error } = await supabase
      .from("my_chat_history")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      return res.json({
        success: false,
        error: error.message
      });
    }

    res.json({
      success: true,
      history: data
    });

  } catch (err) {

    res.json({
      success: false,
      error: err.message
    });

  }
});

// DELETE CHAT
app.delete("/delete-history/:id", async (req, res) => {

try {

const { error } = await supabase
.from("my_chat_history")
.delete()
.eq("id", req.params.id);

if (error) {

return res.json({
success:false,
error:error.message
});

}

res.json({
success:true
});

} catch(err){

res.json({
success:false,
error:err.message
});

}

});

function defaultClientState() {
  return {
    stage: "DISCOVERY",
    factsCount: 0,
    trustCount: 0,

    storyShown: false,
    demoShown: false,

    categorySelected: "",
    budget: "",

    business: "",
    city: "",

    problem: "",
    customerBehaviour: "",
    competitor: "",

    industryId: "",
    discoveryMessageCount: 0,
    demoLinkSent: false,

    // Post-payment: real website generation workflow
    productPhotos: [],
    colorPreference: "",
    requirementsLocked: false,
    finalWebsiteUrl: "",
    finalWebsiteGenerated: false,
    finalWebsiteLinkSent: false,
    remainingPaymentRequested: false,
    remainingPaymentReceived: false,
    qrCodeSent: false,
    paymentPendingApproval: false,
    ownerApprovedPayment: false,
    remainingPaymentPendingApproval: false
  };
}

// Load state: use in-memory cache if present, else try Supabase, else fresh default.
// This means state survives Render spin-down/restarts as long as Supabase is connected.
async function getOrLoadState(userNumber) {

  if (clientState[userNumber]) {
    return clientState[userNumber];
  }

  let state = defaultClientState();

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("client_state")
        .select("state")
        .eq("phone", userNumber)
        .maybeSingle();

      if (error) {
        console.log("STATE LOAD SUPABASE ERROR:", JSON.stringify(error));
      } else if (data && data.state) {
        state = data.state;
        console.log("STATE LOADED FROM SUPABASE OK, stage =", state.stage);
      } else {
        console.log("STATE LOAD: no existing row found for", userNumber);
      }
    } catch (e) {
      console.log("STATE LOAD EXCEPTION:", e.message);
    }
  }

  clientState[userNumber] = state;
  return state;

}

async function persistState(userNumber, state) {

  clientState[userNumber] = state;

  if (supabase) {
    try {
      const { error } = await supabase
        .from("client_state")
        .upsert({
          phone: userNumber,
          state,
          updated_at: new Date().toISOString()
        });

      if (error) {
        console.log("STATE SAVE SUPABASE ERROR:", JSON.stringify(error));
      }
    } catch (e) {
      console.log("STATE SAVE EXCEPTION:", e.message);
    }
  }

}

async function getOrLoadConversation(userNumber) {

  if (conversations[userNumber]) {
    return conversations[userNumber];
  }

  let history = [];

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("client_conversations")
        .select("messages")
        .eq("phone", userNumber)
        .maybeSingle();

      if (error) {
        console.log("CONVO LOAD SUPABASE ERROR:", JSON.stringify(error));
      } else if (data && data.messages) {
        history = data.messages;
        console.log("CONVO LOADED FROM SUPABASE OK, messages count =", history.length);
      } else {
        console.log("CONVO LOAD: no existing row found for", userNumber);
      }
    } catch (e) {
      console.log("CONVO LOAD EXCEPTION:", e.message);
    }
  }

  conversations[userNumber] = history;
  return history;

}

async function persistConversation(userNumber, history) {

  const trimmed = history.slice(-30);

  conversations[userNumber] = trimmed;

  if (supabase) {
    try {
      const { error } = await supabase
        .from("client_conversations")
        .upsert({
          phone: userNumber,
          messages: trimmed,
          updated_at: new Date().toISOString()
        });

      if (error) {
        console.log("CONVO SAVE SUPABASE ERROR:", JSON.stringify(error));
      }
    } catch (e) {
      console.log("CONVO SAVE EXCEPTION:", e.message);
    }
  }

}

// ==========================================================
// DEMO SAMPLES - live generate karne ki jagah ready design images dikhao.
// Files: demo-samples/view.html + demo-samples/<naam>.jpg (GitHub repo mein).
// Live generation wapas chahiye to Render env mein DEMO_MODE=live daalo.
// ==========================================================
// Customer ki baaton se business type pehchano (10 sample designs ke hisaab se)
function detectDemoCategory(history, businessText) {

  const text = (
    (history || [])
      .filter((m) => m.role === "user")
      .map((m) => String(m.content))
      .join(" ") +
    " " +
    String(businessText || "")
  ).toLowerCase();

  const has = (words) => words.some((w) => text.includes(w));

  // Pehle specific wale, phir general
  if (has(["beauty", "parlour", "parlor", "ladies", "bridal", "makeup", "make up", "facial"])) return "beauty-parlour";
  if (has(["salon", "barber", "haircut", "hair cut", "hair cutting", "men's salon", "mens salon"])) return "salon";
  if (has(["gym", "fitness", "workout", "trainer"])) return "gym";
  if (has(["bakery", "cake", "mithai", "sweet shop", "sweets", "halwai"])) return "bakery";
  if (has(["clinic", "dentist", "dental", "doctor", "hospital", "medical"])) return "clinic";
  if (has(["coaching", "tuition", "institute", "academy", "classes", "school", "teacher"])) return "coaching";
  if (has(["mobile", "phone", "electronic", "electronics", "laptop", "repair"])) return "mobile-shop";
  if (has(["kirana", "grocery", "general store", "supermarket", "super market", "ration", "provision"])) return "kirana";
  if (has(["restaurant", "cafe", "coffee", "dhaba", "hotel", "food", "biryani", "pizza"])) return "restaurant";
  if (has(["fashion", "cloth", "kapde", "kapda", "garment", "boutique", "saree", "shoes", "jewellery", "jewelry"])) return "fashion";

  return null;
}

function pickSampleDemoUrl(category, industryId, appUrl) {

  const VALID = ["gym", "salon", "beauty-parlour", "restaurant", "fashion", "kirana", "bakery", "mobile-shop", "clinic", "coaching"];

  // Purani industry ids -> sample design (agar message se category na mile)
  const BY_INDUSTRY_ID = {
    gym: "gym",
    salon: "salon",
    restaurant: "restaurant",
    fashion_store: "fashion",
    kirana_store: "kirana"
  };

  const key = VALID.includes(category) ? category : BY_INDUSTRY_ID[industryId];

  if (key) {
    return `${appUrl}/demo-samples/view.html?d=${key}`;
  }

  // Business type pata nahi: saare sample designs ki gallery dikhao
  return `${appUrl}/demo-samples/view.html?d=all`;
}

// ==========================================================
// HELPERS: price/advance, purani screenshot date, AI reply safai, city
// ==========================================================
function parseRupees(str) {
  return parseInt(String(str).replace(/,/g, ""), 10);
}

function formatINR(n) {
  return "₹" + Number(n).toLocaleString("en-IN");
}

// Customer ke message ya Raj ke pichle reply se final price nikalo
function extractAgreedPrice(history, lowerMsg) {
  const own = (String(lowerMsg || "").match(/\d[\d,]{2,6}/g) || [])
    .map(parseRupees)
    .filter((n) => n >= 1000 && n <= 200000);
  if (own.length) return own[own.length - 1];

  for (let i = history.length - 1; i >= 0; i--) {
    const m = history[i];
    if (m.role === "user") continue;
    const hits = [...String(m.content).matchAll(/₹\s?([\d,]{4,7})/g)]
      .map((x) => parseRupees(x[1]))
      .filter((n) => n >= 1000 && n <= 200000);
    if (hits.length) return hits[hits.length - 1];
  }
  return null;
}

// Screenshot ki date 2 din se purani hai? (India time)
function isOldScreenshotDate(dateStr) {
  const m = String(dateStr || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return false;
  const shot = Date.UTC(+m[1], +m[2] - 1, +m[3]);
  const now = new Date(Date.now() + 5.5 * 3600 * 1000);
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return (today - shot) / 86400000 > 2;
}

const KNOWN_CITIES = [
  "mumbai", "delhi", "pune", "patna", "jaipur", "lucknow", "kolkata", "bangalore", "bengaluru",
  "hyderabad", "chennai", "ahmedabad", "surat", "kanpur", "nagpur", "indore", "bhopal", "ranchi",
  "gaya", "varanasi", "araria", "purnia", "kishanganj", "forbesganj", "muzaffarpur", "bhagalpur",
  "darbhanga", "noida", "gurgaon", "gurugram", "ghaziabad", "agra", "meerut", "chandigarh",
  "ludhiana", "amritsar", "nashik", "thane", "vadodara", "rajkot", "kota", "jodhpur", "udaipur",
  "guwahati", "bhubaneswar", "raipur", "dehradun", "siliguri", "asansol", "dhanbad", "jamshedpur"
];

function detectCityName(text) {
  const t = String(text || "").toLowerCase();
  const hit = KNOWN_CITIES.find((c) => new RegExp(`(^|[^a-z])${c}([^a-z]|$)`).test(t));
  return hit ? hit.charAt(0).toUpperCase() + hit.slice(1) : "";
}

// AI ke jawab ko customer ko bhejne se pehle saaf karo
function cleanAiText(text) {
  let t = String(text || "");

  // 1) Square bracket notes/placeholders (markdown link [text](url) chhodkar)
  t = t.replace(/\[[^\]]{2,400}\](?!\()/g, "");

  // 2) Bache hue English notes / meta lines (bracket hatne ke baad, taaki asli text bacha rahe)
  t = t
    .split("\n")
    .filter((line) => !/\b(I'll|I will|let me|keep it general|better to keep|the user|as per (the )?(rules|instructions)|city unknown|system prompt)\b/i.test(line))
    .join("\n");

  // 3) "demo aapke liye banayi hai" ka galat daava
  t = t.replace(
    /\b(?:main|maine) aapke[^.\n]{0,80}demo website[^.\n]{0,40}taiyar (?:ki hai|kiya hai|kar rakhi hai|kar li hai)/gi,
    "maine aapke jaise businesses ke liye kuch sample website designs taiyar kiye hain"
  );
  t = t.replace(/demo website taiyar (?:ki hai|kiya hai|kar rakhi hai)/gi, "sample website designs taiyar kiye hain");

  // 4) Ek message mein ek hi sawal: sirf aakhri sawal wala paragraph rakho
  const paras = t.split(/\n\s*\n/);
  const qIdx = paras.map((p, i) => (p.trim().endsWith("?") ? i : -1)).filter((i) => i >= 0);
  if (qIdx.length > 1) {
    const keepLast = qIdx[qIdx.length - 1];
    t = paras.filter((p, i) => !(qIdx.includes(i) && i !== keepLast)).join("\n\n");
  }

  return t.replace(/[ \t]+\n/g, "\n").replace(/ {2,}/g, " ").replace(/\n{3,}/g, "\n\n").trim();
}

// ==========================================================
// PAYMENT DETAILS - code se fixed message (Gemini par depend nahi).
// UPI ID + bank details + QR code, hamesha asli values ke saath.
// Render Environment variables:
//   RAJ_UPI_ID, RAJ_BANK_NAME, RAJ_ACCOUNT_HOLDER,
//   RAJ_ACCOUNT_NUMBER, RAJ_IFSC
// ==========================================================
function buildPaymentDetailsMessage(history, mode, st) {

  const isRemaining = mode === "remaining";

  const upi = process.env.RAJ_UPI_ID || "rr9566735-1@okaxis";
  const bankName = process.env.RAJ_BANK_NAME || "";
  const holder = process.env.RAJ_ACCOUNT_HOLDER || "";
  const accNo = process.env.RAJ_ACCOUNT_NUMBER || "";
  const ifsc = process.env.RAJ_IFSC || "";

  // Pichle reply se advance amount nikalne ki koshish (jaise "advance ₹4,250")
  let advanceLine = "";
  try {
    for (let i = history.length - 1; i >= 0; i--) {
      const m = history[i];
      if (m.role !== "user") {
        const hit = String(m.content).match(/advance[^₹\d]{0,40}₹\s?([\d,]+)/i);
        if (hit) {
          advanceLine = `\n${isRemaining ? "Baaki payment (50%)" : "Advance amount"}: ₹${hit[1]}\n`;
          break;
        }
      }
    }
  } catch (e) {}

  // Agar final price pata hai to seedha amount dikhao
  if (st && st.advanceAmount && (!isRemaining || st.agreedPrice)) {
    const amt = isRemaining ? st.agreedPrice - st.advanceAmount : st.advanceAmount;
    advanceLine = `\n${isRemaining ? "Baaki payment" : "Advance amount (50%)"}: ${formatINR(amt)}\n`;
  }

  let text = `Sir 😊, ${isRemaining ? "baaki 50% payment" : "payment"} ki details ye hain:\n${advanceLine}\n💳 UPI ID: ${upi}\n(GPay, PhonePe, Paytm - kisi bhi UPI app se ho jayega)\n`;

  if (accNo && ifsc) {
    text += `\n🏦 Bank Transfer:\n`;
    if (bankName) text += `Bank: ${bankName}\n`;
    if (holder) text += `Account Holder: ${holder}\n`;
    text += `Account Number: ${accNo}\nIFSC: ${ifsc}\n`;
  }

  text += `\nQR code bhi saath mein bhej raha hoon, scan karke pay kar sakte hain.\n\nPayment ke baad please screenshot bhej dijiye, Sir. 🙏`;

  return text;
}

// Screenshot ki date kitne din purani hai (India time). Future date = negative.
function screenshotAgeDays(dateStr) {
  const m = String(dateStr || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  const shot = Date.UTC(+m[1], +m[2] - 1, +m[3]);
  const now = new Date(Date.now() + 5.5 * 3600 * 1000);
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Math.round((today - shot) / 86400000);
}

// Ek hi transaction ID dobara use na ho (nakli/dohra screenshot se bachav)
function isTxnAlreadyUsed(txnId, phone) {
  const t = String(txnId || "").trim().toLowerCase();
  if (!t) return false;
  return Object.entries(clientState).some(
    ([p, st]) => p !== phone && st && String(st.paymentTxnId || "").toLowerCase() === t
  );
}

// Final website banao + Supabase mein save karo + link set karo (FOLLOWUP aur owner-approval dono use karte hain)
async function generateWebsiteForState(st, phone) {
  try {
    st.contactNumber = phone.replace(/\D/g, "");

    const finalHtml = await generateFinalWebsite(st);

    const siteId = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

    if (!supabase) return false;

    const { error: siteError } = await supabase
      .from("client_websites")
      .upsert({ id: siteId, phone, html: finalHtml });

    if (siteError) {
      console.log("FINAL SITE SAVE ERROR:", JSON.stringify(siteError));
      return false;
    }

    const appUrlForSite = process.env.APP_URL || "https://ai-agent-h5dd.onrender.com";
    st.finalWebsiteUrl = `${appUrlForSite}/site/${siteId}`;
    st.finalWebsiteGenerated = true;
    console.log("FINAL WEBSITE: generated successfully:", st.finalWebsiteUrl);

    // Background mein AI se behtar custom design - ban jaye to isi link par badal dega
    const stateForAI = JSON.parse(JSON.stringify(st));
    generateAIWebsite(stateForAI)
      .then(async (aiHtml) => {
        if (aiHtml && supabase) {
          const { error: upErr } = await supabase
            .from("client_websites")
            .upsert({ id: siteId, phone, html: aiHtml });
          console.log("FINAL WEBSITE: AI version", upErr ? "save fail" : "saved");
        } else {
          console.log("FINAL WEBSITE: AI version nahi bana, template version hi rahega");
        }
      })
      .catch((e) => console.log("FINAL WEBSITE: AI version error:", e.message));

    return true;

  } catch (genErr) {
    console.log("FINAL WEBSITE GENERATION FAILED (will retry next message):", genErr.message);
    return false;
  }
}

// Payment approve karo (owner "confirm" ya AI auto-verify). Customer ko bhejne wala text return karta hai.
// Agar customer pehle hi photos + color de chuka hai to website TURANT ban jati hai.
async function approvePayment(phone, custState, kind) {

  if (kind !== "advance") {
    custState.remainingPaymentReceived = true;
    custState.remainingPaymentPendingApproval = false;
    return {
      notifyText: "Sir 😊, aapka payment confirm ho gaya hai! Aapki website ab officially complete hai. Bahut bahut dhanyavaad humpar bharosa karne ke liye! 🙏",
      mediaUrl: undefined
    };
  }

  custState.ownerApprovedPayment = true;
  custState.paymentPendingApproval = false;
  updateStage(custState, "owner approved", false);

  const havePhotos = (custState.productPhotos || []).length >= 1;
  const haveColor = !!custState.colorPreference;

  if (havePhotos && haveColor) {

    custState.requirementsLocked = true;

    const ok = await generateWebsiteForState(custState, phone);

    if (ok) {
      custState.finalWebsiteLinkSent = true;

      return {
        notifyText:
          `Sir 😊, aapka advance payment confirm ho gaya hai aur aapki website taiyar hai! 🎉\n\n` +
          `🌐 ${custState.finalWebsiteUrl}\n\n` +
          `Ek baar dekh lijiye, koi badlaav ho to bata dijiye.\n\n` +
          `Pasand aane par project complete karne ke liye baaki payment kar dijiye:\n\n` +
          buildPaymentDetailsMessage([], "remaining", custState),
        mediaUrl: `${process.env.APP_URL || "https://ai-agent-h5dd.onrender.com"}/qr-code.png`
      };
    }
  }

  const need = [];
  if (!havePhotos) need.push("apne business/products ki kam se kam ek photo");
  if (!haveColor) need.push("website ka color theme (jaise blue, red, gold, green)");

  return {
    notifyText:
      `Sir 😊, aapka advance payment confirm ho gaya hai! Ab hum aapki website par kaam shuru kar sakte hain.\n\n` +
      (need.length ? `Kripya bhej dijiye: ${need.join(" aur ")}.` : "Aapki details mil gayi hain, website bana kar jaldi bhejte hain."),
    mediaUrl: undefined
  };
}

// ==========================================================
// Gemini kabhi kabhi 503 (overloaded) ya 429 (rate limit) deta hai.
// Isliye fallback ("technical dikkat") aane par chhote gap ke saath
// 2 baar aur try karte hain - par sirf tab jab Twilio ke 13 sec ke
// andar time bacha ho.
// ==========================================================
const AI_FALLBACK_MARKER = "thoda technical dikkat aa rahi hai";

function sleepMs(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function generateReplyWithRetry(args, startedAt) {

  const hasBackup = backupLLMConfigured();
  const deadline = startedAt + 11500;

  // Backup AI pehle chalana ho (jaise Gemini quota khatam ho) -> PREFER_BACKUP_LLM=true
  if (hasBackup && process.env.PREFER_BACKUP_LLM === "true") {
    try {
      const r = await generateReplyFallback(args, deadline);
      if (r) return r;
    } catch (e) {
      console.log("BACKUP LLM (pehle) fail:", e.message);
    }
  }

  // Backup hai to Gemini ko sirf ek baar try karo (retry mein waqt kharab nahi);
  // backup nahi hai to pehle jaisa 2 baar retry.
  const delays = hasBackup ? [] : [1500, 3000];
  let lastReply = null;
  let lastErr = null;

  for (let attempt = 0; attempt <= delays.length; attempt++) {
    try {
      const r = await generateReply(args);
      if (typeof r === "string" && !r.includes(AI_FALLBACK_MARKER)) {
        return r;
      }
      lastReply = r;
      console.log(`AI RETRY: fallback reply aaya (attempt ${attempt + 1})`);
    } catch (e) {
      lastErr = e;
      console.log(`AI RETRY: Gemini error (attempt ${attempt + 1}):`, e.message);
    }

    if (attempt < delays.length) {
      if (Date.now() - startedAt > 7000) break;
      await sleepMs(delays[attempt]);
    }
  }

  // Gemini fail: backup AI se jawab banao
  if (hasBackup) {
    try {
      console.log("BACKUP LLM: Gemini fail hua, backup AI se jawab bana rahe hain");
      const r = await generateReplyFallback(args, deadline);
      if (r) return r;
    } catch (e) {
      console.log("BACKUP LLM fail:", e.message);
    }
  }

  if (typeof lastReply === "string") return lastReply;
  throw lastErr || new Error("generateReply failed");
}

app.post("/whatsapp-webhook", async (req, res) => {

console.log("🔥 WEBHOOK HIT 🔥");

const userMessage = req.body.Body;
const userNumber = req.body.From;
const twilioFromNumber = req.body.To;
const webhookStartedAt = Date.now();

// ==========================================================
// FIX (ContentSid Required): pehla reply seedha webhook ke jawab
// (TwiML) mein jaata hai - isme REST API / ContentSid ki zaroorat
// nahi. Agar 13 sec tak koi reply taiyaar nahi hua (Gemini slow),
// to khali jawab bhej dete hain taaki Twilio timeout/retry na kare,
// aur baad ka reply REST API (twilioClient.messages.create) se jaata hai.
// ==========================================================

let webhookAnswered = false;
let noticePrefix = "";

function answerWebhook(twimlString) {
  if (webhookAnswered) return false;
  webhookAnswered = true;
  clearTimeout(ackTimer);
  res.type("text/xml");
  res.send(twimlString);
  return true;
}

const ackTimer = setTimeout(() => {
  if (!webhookAnswered) {
    console.log("WEBHOOK: slow reply, empty ack bheja; reply REST se jayega");
    answerWebhook("<Response></Response>");
  }
}, 13000);

async function sendWhatsAppReply(text, mediaUrl) {

  // Owner ne jo confirm kiya tha par REST se customer tak nahi pahunch paya,
  // wo notice customer ke agle reply ke saath chala jata hai.
  if (noticePrefix) {
    text = noticePrefix + "\n\n" + text;
    noticePrefix = "";
  }

  // 1) Pehla reply: TwiML
  if (!webhookAnswered) {
    const twiml = new twilio.twiml.MessagingResponse();
    const msg = twiml.message(text);
    if (mediaUrl) {
      msg.media(mediaUrl);
    }
    answerWebhook(twiml.toString());
    return;
  }

  // 2) Baad ke replies: REST API
  try {
    const payload = {
      body: text,
      from: twilioFromNumber,
      to: userNumber
    };
    if (mediaUrl) {
      payload.mediaUrl = [mediaUrl];
    }
    await twilioClient.messages.create(payload);
  } catch (sendErr) {
    console.error("TWILIO SEND ERROR:", sendErr.message);
  }
}

await runSequential(userNumber, async () => {

  try {

// ==========================================================
// REAL PAYMENT PROOF CHECK
// Twilio tells us if the incoming WhatsApp message actually
// has an attached image/media via NumMedia + MediaUrl0.
// We NEVER trust the customer's text alone (e.g. "payment ho gaya")
// as proof of payment - only real attached media counts.
// ==========================================================

const numMedia = parseInt(req.body.NumMedia || "0", 10);
const hasAttachedMedia = numMedia > 0;
const mediaUrl = req.body.MediaUrl0 || null;

console.log("USER:", userMessage);
console.log("BODY:", req.body);
console.log("HAS MEDIA:", hasAttachedMedia, mediaUrl);

// ==========================================================
// RESET COMMAND (for testing / customer restart)
// Type "reset" to wipe this number's state and start fresh.
// ==========================================================

if (userMessage && userMessage.trim().toLowerCase() === "reset") {

  clientState[userNumber] = defaultClientState();
  conversations[userNumber] = [];

  await persistState(userNumber, clientState[userNumber]);
  await persistConversation(userNumber, []);

  await sendWhatsAppReply("Sir 😊, conversation reset ho gayi hai. Hello bolke phir se shuru kariye! 🙏");

  return;

}

// ==========================================================
// OWNER APPROVAL COMMANDS
// If this message is from the business owner's OWN WhatsApp number,
// treat it as an approval command instead of normal customer flow.
// Owner replies like "confirm 4297" (last 4 digits of the customer's
// number) to approve a pending payment screenshot.
// ==========================================================

// OWNER_TEST_MODE=true (Render env) par owner number se bhi customer jaisa test ho sakta hai
if (userNumber === OWNER_NUMBER && process.env.OWNER_TEST_MODE !== "true") {

  const codeMatch = userMessage.match(/\d{4}/);

  const hasApproveWord = /confirm|approve|verified|received|mil gaya|done|haan|yes|ok\b/i.test(userMessage);
  const strongApprove = /confirm|approve|verified|received|mil gaya/i.test(userMessage);
  const isReject = /reject|galat|decline|cancel|not received|nahi mila/i.test(userMessage);

  if (isReject || (codeMatch && hasApproveWord) || strongApprove) {

    let target = null;

    if (codeMatch) {
      target = await findPendingApprovalByCode(codeMatch[0]);
    } else {
      // Number ke last 4 digits nahi likhe: agar sirf ek pending hai to wahi
      const pend = await listPendingApprovals();
      if (pend.length === 1) {
        target = pend[0];
      } else if (pend.length === 0) {
        await sendWhatsAppReply("Sir, abhi koi payment approval pending nahi hai.");
        return;
      } else {
        const codes = pend.map((p) => p.phone.replace(/\D/g, "").slice(-4)).join(", ");
        await sendWhatsAppReply(`Sir, ek se zyada pending hain (${codes}). Customer ke number ke last 4 digits ke saath likhiye, jaise: confirm ${pend[0].phone.replace(/\D/g, "").slice(-4)}`);
        return;
      }
    }

    if (!target) {
      await sendWhatsAppReply(`Koi pending payment approval nahi mila jo ${codeMatch ? codeMatch[0] : ""} se match kare.`);
      return;
    }

    const { phone, state: custState } = target;

    // ---------- REJECT ----------
    if (isReject) {

      if (custState.autoVerifiedReview) {
        // AI ne auto-verify kiya tha, owner ne galat bataya: sab wapas PAYMENT par
        custState.paymentReceived = false;
        custState.ownerApprovedPayment = false;
        custState.autoVerified = false;
        custState.autoVerifiedReview = false;
        custState.paymentTxnId = "";
        custState.requirementsLocked = false;
        custState.finalWebsiteGenerated = false;
        custState.finalWebsiteLinkSent = false;
        custState.stage = "PAYMENT";
      }

      custState.paymentPendingApproval = false;
      custState.remainingPaymentPendingApproval = false;
      custState.paymentMismatchCount = 0;

      const rejectText = "Sir 😊, hume aapka payment abhi receive hota hua nahi dikha. Kripya check karke sahi payment ka screenshot dobara bhej dijiye. 🙏";

      const sentR = await sendWhatsAppMessageTo(phone, twilioFromNumber, rejectText);
      if (!sentR) custState.pendingNotice = rejectText;

      await persistState(phone, custState);

      await sendWhatsAppReply(`❌ ${phone} ka payment reject kar diya. Customer se sahi screenshot maanga gaya hai.`);
      return;
    }

    // ---------- APPROVE ----------
    // AI ne pehle hi auto-verify kar diya tha: sirf review mark karo
    if (custState.autoVerifiedReview && !custState.paymentPendingApproval && !custState.remainingPaymentPendingApproval) {
      custState.autoVerifiedReview = false;
      await persistState(phone, custState);
      await sendWhatsAppReply(`✅ ${phone} ka auto-verified payment aapne confirm kar diya.`);
      return;
    }

    let kind = null;
    if (custState.paymentPendingApproval) kind = "advance";
    else if (custState.remainingPaymentPendingApproval) kind = "remaining";

    if (!kind) {
      await sendWhatsAppReply(`Is customer ka koi payment pending nahi hai.`);
      return;
    }

    const { notifyText, mediaUrl: notifyMedia } = await approvePayment(phone, custState, kind);

    const notified = await sendWhatsAppMessageTo(phone, twilioFromNumber, notifyText, notifyMedia);

    // REST se message na ja paye to customer ke agle message par bhej denge
    if (!notified) {
      custState.pendingNotice = notifyText;
    }

    await persistState(phone, custState);

    await sendWhatsAppReply(
      notified
        ? `✅ ${phone} ka ${kind === "advance" ? "advance" : "remaining"} payment confirm kar diya gaya, aur unhe inform kar diya gaya hai.`
        : `✅ ${phone} ka ${kind === "advance" ? "advance" : "remaining"} payment confirm ho gaya. Par Twilio se customer ko message nahi ja paya - unke agle message par apne aap bhej diya jayega. Aap chahein to unhe khud bhi bata dein.`
    );

    return;
  }

  // Owner sent something else (not a recognized approval command) -
  // just acknowledge briefly, don't run them through the sales flow.
  const pendingList = await listPendingApprovals();

  if (!pendingList.length) {
    await sendWhatsAppReply("Sir, abhi koi payment approval pending nahi hai.\n\nPayment confirm karne ke liye reply karein: confirm <customer ke number ke last 4 digits>");
    return;
  }

  const lines = pendingList.map(({ phone, state: st }) => {
    const l4 = phone.replace(/\D/g, "").slice(-4);
    const kindLabel = st.autoVerifiedReview ? "AUTO-VERIFIED (review)" : st.remainingPaymentPendingApproval ? "REMAINING" : "ADVANCE";
    return `💰 ${kindLabel} payment\nBusiness: ${st.business || "Unknown"}\nNumber ends in: ${l4}\nAI ne padha:\n${st.lastPaymentRead || "(nahi mila)"}\n\nReply karein: confirm ${l4}`;
  });

  await sendWhatsAppReply(lines.join("\n\n----------\n\n"), pendingList[0].state.lastPaymentImageUrl || undefined);
  return;

}

const state = await getOrLoadState(userNumber);

const stageBeforeThisTurn = state.stage;

let conversationHistory = await getOrLoadConversation(userNumber);

// Agar Gemini fail ho jaye to is turn ko undo karne ke liye snapshot
// (taaki error wale replies history/state mein na bhar jayein).
const stateSnapshot = JSON.parse(JSON.stringify(state));
const historyLenBefore = conversationHistory.length;

if (state.pendingNotice) {
  noticePrefix = state.pendingNotice;
  state.pendingNotice = "";
}

// Voice note / video / PDF: hum nahi padh sakte - saaf bata do (payment screenshot na samjho)
const firstMediaType = String(req.body.MediaContentType0 || "").toLowerCase();

if (hasAttachedMedia && firstMediaType && !firstMediaType.startsWith("image/")) {

  conversationHistory.length = historyLenBefore;

  const kindWord = firstMediaType.startsWith("audio/")
    ? "voice note sun"
    : firstMediaType.startsWith("video/")
      ? "video dekh"
      : "ye file padh";

  await sendWhatsAppReply(`Sir 😊, main ${kindWord} nahi paata. Please apni baat text mein likh dijiye, ya photo/screenshot bhej dijiye. 🙏`);
  return;
}

conversationHistory.push({
  role: "user",
  content: userMessage
});

// ==========================================================
// FACT EXTRACTION (the "brain" / rules layer)
// This is deterministic - decides WHAT we know, not HOW we say it.
// Gemini only phrases replies; it never invents facts on its own.
// ==========================================================

const lowerMsg = userMessage.toLowerCase().trim();

if (lowerMsg.includes("online shopping")) {
  state.problem = "online shopping";
}

if (lowerMsg.includes("sales") || lowerMsg.includes("seles") || lowerMsg.includes("kam")) {
  state.problem = "low sales";
}

// Dynamic business detection - checks against ALL industries/keywords
// from knowledge/industries.js, not just a single hardcoded phrase.
if (!state.business) {

  for (const industry of INDUSTRIES) {

    const allNames = [industry.displayName, ...(industry.keywords || [])];

    const matched = allNames.some(name =>
      lowerMsg.includes(name.toLowerCase())
    );

    if (matched) {
      state.business = industry.displayName;
      state.industryId = industry.id;
      break;
    }

  }

}

// City detection - common Indian cities + "City = X" pattern
if (!state.city) {

  const commonCities = [
    "mumbai", "delhi", "bangalore", "bengaluru", "pune", "kolkata",
    "chennai", "hyderabad", "ahmedabad", "jaipur", "lucknow", "patna",
    "surat", "nagpur", "indore", "bhopal", "kanpur", "noida", "gurgaon",
    "gurugram", "chandigarh", "vadodara", "nashik", "ranchi", "guwahati"
  ];

  const foundCity = commonCities.find(city => lowerMsg.includes(city));

  if (foundCity) {
    state.city = foundCity.charAt(0).toUpperCase() + foundCity.slice(1);
  } else {
    const cityMatch = userMessage.match(/city\s*[:=]\s*([a-zA-Z\s]+)/i);
    if (cityMatch && cityMatch[1]) {
      state.city = cityMatch[1].trim();
    }
  }

}

if (
  lowerMsg === "ha" ||
  lowerMsg === "haan" ||
  lowerMsg === "hanji" ||
  lowerMsg === "yes" ||
  lowerMsg === "h" ||
  lowerMsg === "ha hai" ||
  lowerMsg === "haan hai"
) {
  state.customerBehaviour = "Customers pehle aate the";
}

if (
  lowerMsg.includes("pata nahi") ||
  lowerMsg === "nahi pata" ||
  lowerMsg === "malum nahi"
) {
  state.competitor = "Unknown";
} else if (
  lowerMsg === "nahi" ||
  lowerMsg === "no" ||
  lowerMsg === "n"
) {
  state.competitor = "No Website";
}

// Robust fallback: Discovery now asks ONE consolidated question about
// the business's biggest customer/sales problem. Previously this was
// gated on "state.business" being detected first - but business
// detection is keyword-based and fails for typos/unlisted business
// types (e.g. "hear cuting"), which meant state.problem NEVER got
// captured, which meant the DISCOVERY->STORY transition NEVER fired,
// even though the conversation looked like it was progressing fine.
//
// Fixed: use a simple turn counter instead. The FIRST DISCOVERY-stage
// message is reserved for business/city info (matches our opening
// question), and starting from the SECOND message we capture
// whatever the customer says as the problem - regardless of whether
// business/city were successfully auto-detected.
const trivialMessages = [
  "hello", "hi", "hey", "reset", "namaste", "hii", "helo",
  "ha", "haan", "han", "hanji", "yes", "ok", "okay", "h"
];

// Jab tak customer ne "business kaunsa/kis city" ka jawab nahi diya, tab tak uska message
// "problem" nahi maana jayega.
const waitingBusinessAnswer = !!(state.businessAsked && !state.businessCaptured);

if (
  state.stage === "DISCOVERY" &&
  userMessage &&
  userMessage.trim().length > 3 &&
  !trivialMessages.includes(lowerMsg) &&
  !waitingBusinessAnswer
) {
  state.discoveryMessageCount = (state.discoveryMessageCount || 0) + 1;
}

if (
  state.stage === "DISCOVERY" &&
  (state.discoveryMessageCount >= 2 || state.businessCaptured) &&
  !waitingBusinessAnswer &&
  !state.problem &&
  userMessage &&
  userMessage.trim().length > 3 &&
  !trivialMessages.includes(lowerMsg)
) {
  state.problem = userMessage.trim();
}

state.factsCount = 0;

if (state.business) state.factsCount++;
if (state.city) state.factsCount++;
if (state.problem) state.factsCount++;
if (state.customerBehaviour) state.factsCount++;
if (state.competitor) state.factsCount++;

console.log("BEFORE UPDATE =", state.stage);

// If customer submits a real payment screenshot while we're at PAYMENT
// stage, read the amount/recipient via Gemini Vision, re-host the
// image, and forward BOTH to the owner's own WhatsApp for manual
// approval. Nothing gets auto-confirmed just because an image was
// attached - only the owner's explicit approval does that.
let paymentMediaOutcome = null;
let paymentMediaProblem = "";
let autoVerifyReply = "";
let autoVerifyMedia;

if (state.stage === "PAYMENT" && hasAttachedMedia && mediaUrl) {

  try {

    const twilioAuth = Buffer.from(
      `${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`
    ).toString("base64");

    const payImgResponse = await fetch(mediaUrl, {
      headers: { Authorization: `Basic ${twilioAuth}` }
    });

    const payImgBuffer = Buffer.from(await payImgResponse.arrayBuffer());
    const payMimeType = String(
      req.body.MediaContentType0 || payImgResponse.headers.get("content-type") || "image/jpeg"
    ).split(";")[0].trim().toLowerCase();

    // AI image dekhkar batata hai ki ye KYA hai: payment screenshot / reference / business photo / kuch aur
    const analysis = await analyzeCustomerImage(payImgBuffer, payMimeType, {
      expectedAmount: state.advanceAmount || null
    });

    console.log("IMAGE ANALYSIS:", JSON.stringify({
      type: analysis.type, amount: analysis.amount, date: analysis.date,
      status: analysis.status, unavailable: !!analysis.unavailable
    }));

    if (analysis.type === "business_photo" || analysis.type === "website_reference") {

      // Ye payment nahi hai - website ke kaam ki cheez hai, save kar lo
      const savedUrl = await rehostImage(
        payImgBuffer, payMimeType,
        analysis.type === "business_photo" ? "photo" : "reference"
      );

      if (savedUrl) {
        if (analysis.type === "business_photo") {
          state.productPhotos = state.productPhotos || [];
          state.productPhotos.push(savedUrl);
        } else {
          state.referenceImages = state.referenceImages || [];
          state.referenceImages.push(savedUrl);
        }
      }

      paymentMediaOutcome = analysis.type === "business_photo" ? "saved_photo" : "saved_reference";

    } else if (analysis.type === "other") {

      paymentMediaOutcome = "unclear";

    } else if (state.paymentPendingApproval) {

      paymentMediaOutcome = "already_pending";

    } else {

      // Payment screenshot (ya AI available nahi: owner khud dekhega)
      const problems = [];

      if (!analysis.unavailable) {
        if (analysis.status === "failed") {
          problems.push("payment successful nahi dikh raha");
        }
        if (state.advanceAmount && analysis.amount != null && analysis.amount < state.advanceAmount * 0.9) {
          problems.push(`amount ${formatINR(analysis.amount)} dikh raha hai, advance ${formatINR(state.advanceAmount)} hona chahiye`);
        }
        if (analysis.date && isOldScreenshotDate(analysis.date)) {
          problems.push(`screenshot ki date (${analysis.date}) purani hai`);
        }
      }

      state.paymentMismatchCount = state.paymentMismatchCount || 0;

      // AUTO-VERIFY (sirf tab jab AUTO_VERIFY_PAYMENTS=true ho aur AI ke saare checks pass hon)
      const ageDays = analysis.date ? screenshotAgeDays(analysis.date) : null;

      const canAutoVerify =
        process.env.AUTO_VERIFY_PAYMENTS === "true" &&
        !analysis.unavailable &&
        problems.length === 0 &&
        analysis.status === "success" &&
        !!state.advanceAmount &&
        analysis.amount != null &&
        analysis.amount >= state.advanceAmount * 0.98 &&
        ageDays != null && ageDays >= 0 && ageDays <= 1 &&
        analysis.receiverMatch === "yes" &&
        !!analysis.txnId &&
        !analysis.suspicious &&
        !isTxnAlreadyUsed(analysis.txnId, userNumber);

      if (canAutoVerify) {

        const publicImgUrl = await rehostImage(payImgBuffer, payMimeType, "payment");
        const last4 = userNumber.replace(/\D/g, "").slice(-4);

        state.paymentTxnId = String(analysis.txnId);
        state.lastPaymentRead = analysis.summaryText || "";
        state.lastPaymentImageUrl = publicImgUrl || "";

        const approved = await approvePayment(userNumber, state, "advance");

        state.autoVerified = true;
        state.autoVerifiedReview = true;
        autoVerifyReply = approved.notifyText;
        autoVerifyMedia = approved.mediaUrl;

        await sendWhatsAppMessageTo(
          OWNER_NUMBER, twilioFromNumber,
          `✅ AUTO-VERIFIED (AI)\n\nBusiness: ${state.business || "Unknown"}\nNumber ends in: ${last4}\nExpected advance: ${formatINR(state.advanceAmount)}\n\nAI ne padha:\n${analysis.summaryText}\n\nAgar ye galat lage to reply karein: reject ${last4}\nTheek hai to: confirm ${last4}`,
          publicImgUrl
        );

        paymentMediaOutcome = "auto_verified";

      } else if (problems.length && state.paymentMismatchCount < 2) {

        state.paymentMismatchCount++;
        paymentMediaProblem = problems.join(", ");
        paymentMediaOutcome = "mismatch";

      } else {

        const publicImgUrl = await rehostImage(payImgBuffer, payMimeType, "payment");
        const last4 = userNumber.replace(/\D/g, "").slice(-4);
        const warn = problems.length ? `⚠️ DHYAN DEIN: ${problems.join(", ")}\n\n` : "";

        const ownerText =
          `💰 Naya payment screenshot!\n\n` +
          `Business: ${state.business || "Unknown"}\n` +
          `Number ends in: ${last4}\n` +
          (state.advanceAmount ? `Expected advance: ${formatINR(state.advanceAmount)}\n` : "") +
          `\n${warn}` +
          `AI ne padha:\n${analysis.summaryText || "Nahi padh paya"}\n\n` +
          `Reply karein: confirm ${last4}`;

        const ownerAlerted = await sendWhatsAppMessageTo(OWNER_NUMBER, twilioFromNumber, ownerText, publicImgUrl);

        state.lastPaymentRead = analysis.summaryText || "";
        state.lastPaymentImageUrl = publicImgUrl || "";
        state.ownerAlertDelivered = ownerAlerted;
        state.lastOwnerAlertAt = Date.now();
        state.paymentPendingApproval = true;
        paymentMediaOutcome = "forwarded";
      }
    }

  } catch (payCheckErr) {
    console.log("PAYMENT SCREENSHOT CHECK FAILED:", payCheckErr.message);
    paymentMediaOutcome = "error";
  }

}

updateStage(state, userMessage, hasAttachedMedia);

console.log("AFTER UPDATE =", state.stage);

    // ==========================================================
// POST-PAYMENT: PHOTO + COLOR COLLECTION -> LOCK -> GENERATE
// REAL WEBSITE -> ASK FOR REMAINING PAYMENT
// ==========================================================

if (state.stage === "FOLLOWUP" && state.paymentReceived) {

  // Once requirements are locked, any further image is treated as
  // remaining-payment proof, NOT another product photo. It is
  // forwarded to the owner for approval - never auto-confirmed.
  if (hasAttachedMedia && state.requirementsLocked && state.finalWebsiteGenerated) {

    if (!state.remainingPaymentReceived && !state.remainingPaymentPendingApproval && mediaUrl) {

      try {

        const twilioAuth = Buffer.from(
          `${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`
        ).toString("base64");

        const remImgResponse = await fetch(mediaUrl, {
          headers: { Authorization: `Basic ${twilioAuth}` }
        });

        const remImgBuffer = Buffer.from(await remImgResponse.arrayBuffer());
        const remMimeType = remImgResponse.headers.get("content-type") || "image/jpeg";

        const remExtracted = await extractPaymentInfo(remImgBuffer, remMimeType);

        const remPublicUrl = await rehostImage(remImgBuffer, remMimeType, "remaining_payment");

        const remLast4 = userNumber.replace(/\D/g, "").slice(-4);

        const remOwnerText =
          `💰 REMAINING payment screenshot!\n\n` +
          `Business: ${state.business || "Unknown"}\n` +
          `Number ends in: ${remLast4}\n\n` +
          `AI ne padha:\n${remExtracted || "Nahi padh paya"}\n\n` +
          `Reply karein: confirm ${remLast4}`;

        const remAlerted = await sendWhatsAppMessageTo(OWNER_NUMBER, twilioFromNumber, remOwnerText, remPublicUrl);

        state.lastPaymentRead = remExtracted || "";
        state.lastPaymentImageUrl = remPublicUrl || "";
        state.ownerAlertDelivered = remAlerted;

        state.remainingPaymentPendingApproval = true;

      } catch (remErr) {
        console.log("REMAINING PAYMENT FORWARD FAILED:", remErr.message);
      }

    }

  } else if (hasAttachedMedia && !state.requirementsLocked) {

    console.log(`PHOTO STEP: processing ${numMedia} attached media item(s) for`, userNumber);

    // Twilio sends multiple images as MediaUrl0, MediaUrl1, MediaUrl2...
    // Loop through ALL of them, not just the first, since customers
    // commonly send several photos at once.
    for (let i = 0; i < numMedia; i++) {

      const thisMediaUrl = req.body[`MediaUrl${i}`];
      const thisMediaType = String(req.body[`MediaContentType${i}`] || "").toLowerCase();

      if (thisMediaType && !thisMediaType.startsWith("image/")) {
        console.log(`PHOTO STEP: media ${i} image nahi hai (${thisMediaType}), skip`);
        continue;
      }

      if (!thisMediaUrl) {
        console.log(`PHOTO STEP: no MediaUrl${i} found, skipping`);
        continue;
      }

      try {

        console.log(`PHOTO STEP: downloading media ${i} from Twilio:`, thisMediaUrl);

        const twilioAuth = Buffer.from(
          `${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`
        ).toString("base64");

        const imgResponse = await fetch(thisMediaUrl, {
          headers: { Authorization: `Basic ${twilioAuth}` }
        });

        if (!imgResponse.ok) {
          console.log(`PHOTO STEP: Twilio download failed, status ${imgResponse.status} for media ${i}`);
          continue;
        }

        const imgBuffer = Buffer.from(await imgResponse.arrayBuffer());

        console.log(`PHOTO STEP: downloaded media ${i}, size = ${imgBuffer.length} bytes`);

        const contentType = imgResponse.headers.get("content-type") || "image/jpeg";
        const ext = contentType.includes("png") ? "png" : "jpg";
        const fileName = `${userNumber.replace(/[^a-zA-Z0-9]/g, "")}_${Date.now()}_${i}.${ext}`;

        if (!supabase) {
          console.log("PHOTO STEP: supabase not configured, cannot store photo");
          continue;
        }

        const { error: uploadError } = await supabase.storage
          .from("client-photos")
          .upload(fileName, imgBuffer, { contentType });

        if (uploadError) {
          console.log(`PHOTO UPLOAD ERROR for media ${i}:`, JSON.stringify(uploadError));
          continue;
        }

        const { data: publicUrlData } = supabase.storage
          .from("client-photos")
          .getPublicUrl(fileName);

        if (publicUrlData && publicUrlData.publicUrl) {
          state.productPhotos.push(publicUrlData.publicUrl);
          console.log(`PHOTO SAVED (media ${i}):`, publicUrlData.publicUrl);
        } else {
          console.log(`PHOTO STEP: upload succeeded for media ${i} but no public URL returned`);
        }

      } catch (photoErr) {
        console.log(`PHOTO PROCESSING EXCEPTION for media ${i}:`, photoErr.message);
      }

    }

    console.log("PHOTO STEP: total photos stored so far =", state.productPhotos.length);

  }

  // Color preference capture
  if (!state.colorPreference) {

    const colorWords = [
      "blue", "red", "gold", "golden", "pink", "black", "white", "green",
      "purple", "orange", "yellow", "nila", "lal", "kala", "safed", "hara",
      "peela", "gulabi"
    ];

    const affirmativeWords = ["ha", "haan", "han", "hanji", "yes", "ok", "okay", "h", "thik", "theek"];

    const matchedColor = colorWords.find(c => lowerMsg.includes(c));

    if (matchedColor) {

      state.colorPreference = matchedColor;

    } else if (
      lowerMsg.includes("color") ||
      lowerMsg.includes("colour") ||
      lowerMsg.includes("rang")
    ) {

      state.colorPreference = userMessage.trim();

    } else if (
      state.productPhotos.length >= 1 &&
      affirmativeWords.includes(lowerMsg)
    ) {

      // We already have a photo, meaning we're clearly past that step
      // and likely in the color-question phase. A bare "ha/haan" here
      // almost always means "jaisa demo mein tha, waisa hi rakh do" -
      // capture that intent so the generation isn't blocked forever.
      state.colorPreference = "waisa hi jaisa demo website mein dikhaya gaya tha";

    } else if (
      state.productPhotos.length >= 1 &&
      userMessage &&
      userMessage.trim().length > 3 &&
      !hasAttachedMedia
    ) {

      // Any other substantive text reply once we have a photo - treat
      // it as their color preference description rather than leaving
      // this permanently blocked.
      state.colorPreference = userMessage.trim();

    }

  }

  // Lock requirements once we have at least 1 photo and a color
  // preference (this just marks "we have enough info to try").
  if (
    !state.requirementsLocked &&
    state.productPhotos.length >= 1 &&
    state.colorPreference
  ) {
    state.requirementsLocked = true;
    console.log("REQUIREMENTS LOCKED for", userNumber);
  }

  // Attempt generation whenever locked but not yet successfully
  // generated - retry-safe: agla message dobara try karega.
  if (state.requirementsLocked && !state.finalWebsiteGenerated) {
    console.log("FINAL WEBSITE: attempting generation for", userNumber);
    await generateWebsiteForState(state, userNumber);
  }

}

// Save facts NOW, before calling Gemini - so even if the AI call
// fails/times out below, we never lose what we already extracted.
await persistState(userNumber, state);
await persistConversation(userNumber, conversationHistory);


// ==========================================================
// EXTRA RULE (tells Gemini exactly what it's allowed to do
// in this stage, and what's still missing in Discovery)
// ==========================================================

let extraRule = "";

if (state.stage === "DISCOVERY") {

  if (!state.problem) {

    const alreadyKnownParts = [];

    if (state.business) alreadyKnownParts.push(`Business = ${state.business}`);
    if (state.city) alreadyKnownParts.push(`City = ${state.city}`);

    extraRule = `
CURRENT STAGE = DISCOVERY

ALREADY KNOWN (DO NOT ask about these again, DO NOT ask to "confirm" these again):
${alreadyKnownParts.length ? alreadyKnownParts.join(", ") : "Nothing yet"}

YOUR NEXT QUESTION MUST BE (in your own natural Hinglish words, ONE consolidated question, but asking exactly this): "Sir, kya aap thoda sa bata sakte hain ki aapke business mein abhi sabse badi customer ya sales problem kya chal rahi hai?"

Rules:
- Do NOT re-ask for business name or city if they are already listed above as known.
- Do NOT ask separate questions about customer behaviour or competitors - this ONE question covers everything needed for Discovery.
- If the customer's last message already answered this question, acknowledge it briefly and move on - do not repeat the same question.
- If customer asked something off-topic (like your name), answer in one short line, then still ask this question above (if not answered yet).
- Ask ONLY this ONE question.

Never tell story.
Never show demo.
Never show category.
Never show pricing.
`;

  } else {

    extraRule = `
CURRENT STAGE = DISCOVERY

Discovery jaankari mil chuki hai (business ki sabse badi customer/sales problem).

Ab customer ko politely batao ki aapke paas unke jaisi problem waale ek business ki chhoti si success story hai, aur unse permission maango woh sunane ki.
`;

  }

}

else if (state.stage === "STORY") {

  extraRule = `
CURRENT STAGE = STORY

Tell ONLY one matching story.

Never show demo.

Never show category.

Never show pricing.
`;

}

else if (state.stage === "DEMO") {

  extraRule = `
CURRENT STAGE = DEMO

Show ONLY demo.

Never tell story again.

Never show pricing.
`;

}

else if (state.stage === "DEAL") {

  extraRule = `
CURRENT STAGE = DEAL

Show ONLY website categories.

Never show pricing.

Wait for category selection.
`;

}

else if (state.stage === "NEGOTIATION") {

  extraRule = `
CURRENT STAGE = NEGOTIATION

Show ONLY selected category price.

Follow negotiation roadmap.

Never show other categories.
`;

}

else if (state.stage === "PAYMENT") {

  const realUpiId = process.env.RAJ_UPI_ID || "";

  extraRule = `
CURRENT STAGE = PAYMENT

Ask only for advance payment.

Never negotiate.

REAL UPI ID (yeh EXACT value use karo jab bhi customer payment details maange - kisi bhi wording mein): ${realUpiId || "(not configured yet - tell customer payment details are being prepared)"}

CRITICAL RULE - PAYMENT DETAILS:
- Customer chahe "UPI ID", "PhonePe number", "Google Pay number", "Paytm number", "account number", "mobile number for payment" - kuch bhi bole, payment ke liye tumhare paas SIRF ek hi cheez hai: upar di gayi REAL UPI ID, aur ek QR code (jo system automatically bhejega).
- Kabhi bhi koi phone number, account number, ya kisi bhi tarah ka digit-based identifier khud se mat banao/invent mat karo - chahe customer kisi bhi specific app (PhonePe/GPay/Paytm) ka naam le.
- Agar customer kisi specific app ka number maange, politely bolo: "Sir, yeh UPI ID kisi bhi app (PhonePe, GPay, Paytm) se kaam karti hai - [REAL UPI ID] par bhej dijiye, ya QR code scan kar lijiye."
- Kabhi bhi square bracket [ ] wala placeholder text (jaise "[PhonePe Number]") apne reply mein literally mat likhna.

If customer asks how to pay: tell them the UPI ID above, and mention a QR code is also being sent below (system attaches it automatically - you don't need to describe it in detail).

PAYMENT PROOF STATUS: ${hasAttachedMedia ? "Customer HAS attached a real image/screenshot with this message." : "Customer has NOT attached any real image/screenshot with this message (even if their text claims payment is done)."}

CRITICAL RULE - PAYMENT VERIFICATION:
- NEVER say "mujhe screenshot mil gaya hai" ya "payment confirm ho gaya" ya "project shuru ho raha hai" agar customer ne sirf TEXT mein "payment ho gaya" / "done" likha hai lekin koi real image attach nahi ki. Sirf text ek proof NAHI hai.
- Agar PAYMENT PROOF STATUS "NOT attached" hai: politely bolo "Sir, kripya payment ka screenshot bhi bhej dijiye taaki main confirm kar sakoon" - project start ya confirm mat karo.
- Agar PAYMENT PROOF STATUS "HAS attached" hai: bolo ki screenshot mil gaya hai aur team verify karke jald hi confirm karegi - lekin abhi bhi "final confirmed, project shuru" jaisa 100% guarantee mat do, kyunki asli verification insaan (Raj khud) karega.
`;

}

else if (state.stage === "FOLLOWUP") {

  if (state.paymentReceived && !state.requirementsLocked) {

    const stillNeed = [];
    if (state.productPhotos.length === 0) stillNeed.push("kam se kam ek product/business photo");
    if (!state.colorPreference) stillNeed.push("website ka color preference");

    extraRule = `
CURRENT STAGE = FOLLOWUP (advance payment mil chuka hai)

Ab customer se SIRF yeh maango (agar abhi tak nahi mila): ${stillNeed.join(" aur ")}.

Photo bhejne ke liye politely bolo ki WhatsApp par image attach karke bhej dein. Color ke liye poocho "Sir, website kis color theme mein chahiye?"

Jab tak dono na mil jaayein, baar baar politely yehi maango, ek baar mein ek cheez.

STRICT RULE: Address, business ka poora naam, logo, mobile number, WhatsApp number, Google Map location, social media links - IN MEIN SE KUCH BHI MAT POOCHHO. Sirf photo aur color - bas yeh 2 cheezein chahiye, aur kuch nahi. Agar customer khud koi aur detail de de (jaise address), to politely thank karo lekin usko age nahi badhao, sirf photo/color pe focus karo.

Never confirm/declare that the website is ready yet - system will tell you when it's actually generated.
`;

  } else if (state.paymentReceived && state.requirementsLocked && state.finalWebsiteGenerated && !state.finalWebsiteLinkSent) {

    extraRule = `
CURRENT STAGE = FOLLOWUP (website ban chuki hai)

Customer ko batao ki unki website ban gayi hai aur khushi se share karo ki link neeche aa raha hai (system automatically link attach karega - aap khud koi link mat likhna).

Uske baad politely baaki 50 percent payment maango.
`;

  } else if (state.paymentReceived && state.requirementsLocked && state.finalWebsiteGenerated && !state.remainingPaymentReceived) {

    extraRule = `
CURRENT STAGE = FOLLOWUP (website deliver ho chuki hai, baaki payment baaki hai)

Politely baaki 50 percent payment maango agar abhi tak nahi mila.

Agar customer text mein "payment kar diya" bole lekin koi real image attach na ho, to yehi bolo ki screenshot bhi bhej dein confirm karne ke liye - kabhi khud se confirm mat karo bina real image ke (system batayega jab real image milegi).
`;

  } else if (state.remainingPaymentReceived) {

    extraRule = `
CURRENT STAGE = FOLLOWUP (poora payment mil chuka hai)

Customer ka dhanyavaad karo, unhe assure karo ki website live hai aur agar future mein koi changes chahiye ho to aap available hain.
`;

  } else {

    extraRule = `
CURRENT STAGE = FOLLOWUP

Support customer politely. Agar deal nahi hui thi, warm note par close karo. Force mat karo.
`;

  }

}

const recentHistory =
  conversationHistory.slice(-16);

// ==========================================================
// DISCOVERY: pehle business type + city poochho (taaki story aur demo sahi ho)
// ==========================================================
if (state.stage === "DISCOVERY" && !hasAttachedMedia) {

  const userMsgCount = conversationHistory.filter((m) => m.role === "user").length;

  if (state.businessAsked && !state.businessCaptured) {

    state.businessText = String(userMessage || "").trim().slice(0, 140);
    if (!state.business) state.business = state.businessText;
    if (!state.city) {
      const foundCity = detectCityName(state.businessText);
      if (foundCity) state.city = foundCity;
    }
    state.businessCaptured = true;

  } else if (!state.businessAsked && !state.business && userMsgCount >= 2) {

    const askBiz = "Sir 😊, thank you! Pehle bataiye, aapka business kaunsa hai (jaise gym, salon, restaurant, kirana, clinic...) aur kis city mein hai?";

    state.businessAsked = true;

    conversationHistory.push({ role: "assistant", content: askBiz });
    await persistState(userNumber, state);
    await persistConversation(userNumber, conversationHistory);
    await sendWhatsAppReply(askBiz);
    return;
  }
}

// "payment ho gaya" jaisa claim (FOLLOWUP aur PAYMENT dono blocks mein use hota hai)
const claimsPaid = /ho gaya|ho gya|kar diya|kar di\b|kar dia|done|paid|bhej diya|bhej dia|sent|successful/i.test(lowerMsg);

// ==========================================================
// PAYMENT: customer ne screenshot bheja -> fixed jawab (Gemini nahi)
// ==========================================================
if (paymentMediaOutcome) {

  const pendingTail = state.paymentPendingApproval
    ? "Aapka payment abhi verify ho raha hai, confirm hote hi aage badhenge."
    : "Payment ka screenshot bhi bhej dijiye, taaki hum kaam shuru kar sakein.";

  const outcomeReplies = {
    forwarded: "Sir 😊, aapka payment screenshot mil gaya hai. Hum verify kar rahe hain. Confirm hote hi yahin bata denge aur website ka kaam shuru kar denge. 🙏",
    already_pending: "Sir 😊, aapka payment screenshot pehle hi mil chuka hai aur verify ho raha hai. Confirm hote hi yahin bata denge. 🙏",
    mismatch: `Sir 😊, is screenshot mein ${paymentMediaProblem}. Please sahi payment ka screenshot ek baar aur bhej dijiye. 🙏`,
    saved_photo: `Sir 😊, photo mil gayi, save kar li hai. ${pendingTail} 🙏`,
    saved_reference: `Sir 😊, reference design mil gaya, hum ise dhyan mein rakhenge. ${pendingTail} 🙏`,
    unclear: "Sir 😊, ye image mujhe samajh nahi aayi. Payment ka screenshot ya apne business ki photo bhej dijiye. 🙏",
    error: "Sir 😊, image process nahi ho paayi. Please ek baar dobara bhej dijiye. 🙏"
  };

  const outText = paymentMediaOutcome === "auto_verified"
    ? autoVerifyReply
    : (outcomeReplies[paymentMediaOutcome] || outcomeReplies.unclear);

  conversationHistory.push({ role: "assistant", content: outText });
  await persistState(userNumber, state);
  await persistConversation(userNumber, conversationHistory);
  await sendWhatsAppReply(outText, paymentMediaOutcome === "auto_verified" ? autoVerifyMedia : undefined);
  return;
}

// ==========================================================
// FOLLOWUP (advance confirm hone ke baad): photo + color lena, website ka
// link dena, baaki 50% payment - sab code se, Gemini par depend nahi.
// ==========================================================
if (state.stage === "FOLLOWUP" && state.paymentReceived) {

  const sendFixed = async (text, media) => {
    conversationHistory.push({ role: "assistant", content: text });
    await persistState(userNumber, state);
    await persistConversation(userNumber, conversationHistory);
    await sendWhatsAppReply(text, media);
  };

  const qrForFollowup = `${process.env.APP_URL || "https://ai-agent-h5dd.onrender.com"}/qr-code.png`;

  // A) Photo + color abhi poore nahi hue
  if (!state.requirementsLocked) {

    const colorJustSet = !stateSnapshot.colorPreference && !!state.colorPreference;

    if (hasAttachedMedia || colorJustSet) {

      if (!state.productPhotos.length) {
        await sendFixed(
          hasAttachedMedia
            ? "Sir 😊, photo save nahi ho paayi. Please ek baar dobara bhej dijiye."
            : "Sir 😊, color note kar liya. Ab please apne business/products ki kam se kam ek photo WhatsApp par bhej dijiye."
        );
      } else {
        await sendFixed("Sir 😊, photo mil gayi, shukriya! Ab bataiye website kis color theme mein chahiye? (jaise blue, red, gold, green, ya \"jaisa demo mein tha\")");
      }
      return;
    }
  }

  // B) Website ban gayi: link + baaki payment ki details (ek hi baar)
  if (state.requirementsLocked && state.finalWebsiteGenerated && state.finalWebsiteUrl && !state.finalWebsiteLinkSent) {

    state.finalWebsiteLinkSent = true;

    const readyText =
      `Sir 😊, aapki website taiyar ho gayi hai! 🎉\n\n🌐 ${state.finalWebsiteUrl}\n\n` +
      `Ek baar dekh lijiye. Koi badlaav chahiye to bata dijiye.\n\n` +
      `Pasand aane par project complete karne ke liye baaki payment kar dijiye:\n\n` +
      buildPaymentDetailsMessage(conversationHistory, "remaining", state);

    await sendFixed(readyText, qrForFollowup);
    return;
  }

  // C) Baaki payment: details maange / "ho gaya" bole / screenshot bheje
  if (state.finalWebsiteGenerated && !state.remainingPaymentReceived) {

    const asksPayNow = /upi|qr|bank|account|ifsc|scan|payment|pay\b|kispe|kahan|kaha|details|detail|number|bhejo|send/i.test(lowerMsg);

    if (hasAttachedMedia && state.remainingPaymentPendingApproval) {
      await sendFixed("Sir 😊, aapka payment screenshot mil gaya hai. Verify hote hi aapko yahin confirm kar denge. Dhanyavaad! 🙏");
      return;
    }

    if (!hasAttachedMedia && claimsPaid) {
      await sendFixed(
        state.remainingPaymentPendingApproval
          ? "Sir 😊, aapka payment screenshot mil chuka hai, verify ho raha hai. Confirm hote hi bata denge. 🙏"
          : "Sir 😊, thank you! Payment confirm karne ke liye please payment ka screenshot yahan bhej dijiye. 🙏"
      );
      return;
    }

    if (!hasAttachedMedia && asksPayNow) {
      await sendFixed(buildPaymentDetailsMessage(conversationHistory, "remaining", state), qrForFollowup);
      return;
    }
  }
}

// ==========================================================
// PAYMENT STAGE: details/QR maangne par seedha code se bhejo (Gemini nahi)
// ==========================================================

// Deal ho chuki (NEGOTIATION) aur customer seedha UPI/QR/bank maange ya "kispe karu" bole:
// stage ka intezaar mat karo, seedha PAYMENT par le aao.
const strongPayIntent = /upi|qr|bank|account|ifsc|scan|kispe karu|kispar karu|kis par karu|kahan karu|kaha karu|kaise karu|kaise pay|payment karna|payment karunga|payment kar\b/i.test(lowerMsg);

if ((state.stage === "NEGOTIATION" || state.stage === "DEAL") && !hasAttachedMedia && strongPayIntent && !claimsPaid) {
  console.log("STAGE:", state.stage, "-> PAYMENT (customer ne payment details maangi)");
  state.stage = "PAYMENT";
}

if (state.stage === "PAYMENT" && !hasAttachedMedia) {

  // "Payment ho gaya" - Gemini ke bina seedha screenshot maango
  if (claimsPaid && !state.paymentPendingApproval) {

    const paidText = state.paymentPendingApproval
      ? "Sir 😊, aapka payment screenshot mil gaya hai. Verify ho raha hai, thodi der mein confirm karke aapko bata denge. 🙏"
      : "Sir 😊, thank you! Payment confirm karne ke liye please payment ka screenshot yahan bhej dijiye. Screenshot milte hi hum verify karke aapki website par kaam shuru kar denge. 🙏";

    conversationHistory.push({ role: "assistant", content: paidText });
    await persistState(userNumber, state);
    await persistConversation(userNumber, conversationHistory);
    await sendWhatsAppReply(paidText);
    return;
  }

  // Screenshot mil chuka hai aur owner approval baaki hai: Gemini ke bina fixed jawab,
  // aur owner ko (30 min se zyada ho gaye ho to) dobara yaad dilao.
  if (state.paymentPendingApproval) {

    const staleMs = Date.now() - (state.lastOwnerAlertAt || 0);

    if (staleMs > 30 * 60 * 1000) {
      const last4 = userNumber.replace(/\D/g, "").slice(-4);
      const reminder =
        `⏰ Reminder: ${state.business || "Customer"} (number ends ${last4}) ka payment approval pending hai.\n\n` +
        `AI ne padha:\n${state.lastPaymentRead || "(nahi mila)"}\n\nReply karein: confirm ${last4}`;
      const sentOk = await sendWhatsAppMessageTo(OWNER_NUMBER, twilioFromNumber, reminder, state.lastPaymentImageUrl || undefined);
      state.lastOwnerAlertAt = Date.now();
      state.ownerAlertDelivered = sentOk;
      console.log("OWNER REMINDER sent:", sentOk);
    }

    // Customer verification ke dauran bhi photos / reference / color de sakta hai: save karte jao
    let colorJustCaptured = null;

    if (!state.colorPreference) {
      const colorWordsP = ["blue", "red", "gold", "golden", "pink", "black", "white", "green", "purple", "orange", "yellow", "nila", "neela", "lal", "kala", "safed", "hara", "peela", "gulabi"];
      const hitColor = colorWordsP.find((c) => new RegExp(`(^|[^a-z])${c}([^a-z]|$)`).test(lowerMsg));

      if (hitColor) {
        state.colorPreference = hitColor;
        colorJustCaptured = hitColor;
      } else if (/\b(color|colour|rang|theme)\b/.test(lowerMsg) && userMessage.trim().length > 6) {
        state.colorPreference = userMessage.trim().slice(0, 100);
        colorJustCaptured = state.colorPreference;
      }
    }

    const havePhotoCount = (state.productPhotos || []).length;
    const needsList = [];
    if (!havePhotoCount) needsList.push("apne business/products ki ek photo");
    if (!state.colorPreference) needsList.push("website ka color theme");

    state.pendingReplyCount = (state.pendingReplyCount || 0) + 1;

    const pendingHeads = [
      "Sir 😊, aapka payment abhi verify ho raha hai.",
      "Sir 😊, payment confirm hote hi main yahin bata dunga.",
      "Sir 😊, verification mein thoda time lag raha hai, aap chinta na karein."
    ];

    const head = colorJustCaptured
      ? `Sir 😊, color theme note kar liya: ${state.colorPreference}.`
      : pendingHeads[(state.pendingReplyCount - 1) % pendingHeads.length];

    const tail = needsList.length
      ? `Tab tak aap ${needsList.join(" aur ")} bhej dijiye, taaki confirm hote hi website banana shuru ho jaye.`
      : "Aapki photos aur color theme mil gaye hain, payment confirm hote hi aapki website banana shuru kar denge. 🙏";

    const pendingText = `${head} ${tail}`;

    conversationHistory.push({ role: "assistant", content: pendingText });
    await persistState(userNumber, state);
    await persistConversation(userNumber, conversationHistory);
    await sendWhatsAppReply(pendingText);
    return;
  }

  const asksPaymentInfo = /upi|qr|bank|account|ifsc|scan|payment|pay\b|kispe|kispar|kis par|kahan|kaha|details|detail|number|bhejo|bhej do|send/i.test(lowerMsg);

  const justAgrees = /^(ha|haan|han|hanji|ok|okay|yes|chalo|thik hai|theek hai|bhejo|ji|ji ha)\b/i.test(lowerMsg);

  // Pehle final price + 50% advance confirm karo, phir details (seedha jump nahi)
  if (!claimsPaid && !state.paymentDetailsSent && !state.dealConfirmedSent && !asksPaymentInfo) {

    const price = extractAgreedPrice(conversationHistory, lowerMsg);

    if (price) {
      state.agreedPrice = price;
      state.advanceAmount = Math.round(price / 2);
    }

    const catName = state.selectedCategory
      ? String(state.selectedCategory).replace(/\b\w/g, (c) => c.toUpperCase())
      : "Website";

    const dealText = price
      ? `Sir 😊, bahut badhiya! ${catName} ₹${price.toLocaleString("en-IN")} mein final hui. 🎉\n\nProject shuru karne ke liye 50% advance lagta hai: ${formatINR(state.advanceAmount)}.\n\nKya main payment ki details (UPI, QR aur bank) bhej doon, Sir?`
      : `Sir 😊, bahut badhiya! Deal final hui. 🎉\n\nProject shuru karne ke liye 50% advance lagta hai.\n\nKya main payment ki details (UPI, QR aur bank) bhej doon, Sir?`;

    state.dealConfirmedSent = true;

    conversationHistory.push({ role: "assistant", content: dealText });
    await persistState(userNumber, state);
    await persistConversation(userNumber, conversationHistory);
    await sendWhatsAppReply(dealText);
    return;
  }

  if (!claimsPaid && (asksPaymentInfo || (justAgrees && state.dealConfirmedSent && !state.paymentDetailsSent))) {

    console.log("PAYMENT DETAILS: code se bheji ja rahi hain (UPI + bank + QR)");

    if (!state.advanceAmount) {
      const p = extractAgreedPrice(conversationHistory, lowerMsg);
      if (p) {
        state.agreedPrice = p;
        state.advanceAmount = Math.round(p / 2);
      }
    }

    const payText = buildPaymentDetailsMessage(conversationHistory, "advance", state);
    const qrBase = process.env.APP_URL || "https://ai-agent-h5dd.onrender.com";

    conversationHistory.push({
      role: "assistant",
      content: payText
    });

    state.paymentDetailsSent = true;
    state.qrCodeSent = true;

    await persistState(userNumber, state);
    await persistConversation(userNumber, conversationHistory);

    await sendWhatsAppReply(payText, `${qrBase}/qr-code.png`);
    return;
  }
}

extraRule = (extraRule || "") + `

GLOBAL RULES (hamesha follow karo):
- Kabhi bhi square brackets [ ] mein kuch mat likho, aur apne andar ke notes ya English instructions customer ko mat dikhao.
- Ek message mein sirf EK sawal poochho.
- Agar customer ki city pata nahi hai to kisi city ka naam mat likho, bas "ek local business owner" kaho.
- Demo ke baare mein mat kaho ki "maine aapke business ke liye demo banayi hai". Bolo ki ye sample designs hain aur website aapke business ke hisaab se banegi.
- Payment confirm hone se pehle website ka kaam shuru karne, ya photos/color maangne ki baat mat karo.
${state.paymentPendingApproval ? "- Customer ka payment screenshot mil chuka hai aur verify ho raha hai; dobara screenshot mat maango." : ""}
`;

let aiReply = await generateReplyWithRetry({
  state,
  recentHistory,
  extraRule
}, webhookStartedAt);

  // STORY aur DEMO complete mark karo

if (state.stage === "STORY" && stageBeforeThisTurn === "STORY") {
  state.storyShown = true;
}

if (state.stage === "DEMO") {
  state.demoShown = true;
}

// DEMO STAGE - actual demo link bhejo (ek hi baar)
const isFallbackReply = aiReply.includes("thoda technical dikkat aa rahi hai");

// Gemini fail hua: is turn ko undo karo (state + history), error reply
// save mat karo. Customer wahi message dobara bhejega to clean chalega.
if (isFallbackReply && !hasAttachedMedia) {
  console.log("AI FALLBACK: state/history rollback kiya, reply save nahi kiya");
  for (const k of Object.keys(state)) delete state[k];
  Object.assign(state, stateSnapshot);
  conversationHistory.length = historyLenBefore;
  noticePrefix = "";
  await sendWhatsAppReply(aiReply);
  return;
}

// SAFETY 1: Gemini kabhi kabhi apni banayi hui UPI ID likh deta hai (jaise
// "rajchandravanshi@ybl"). Koi bhi UPI handle jo hamari asli ID nahi hai, asli se badal do.
{
  const realUpiCheck = process.env.RAJ_UPI_ID || "rr9566735-1@okaxis";
  aiReply = aiReply.replace(
    /[A-Za-z0-9._-]{2,}@[A-Za-z]{2,}\b(?!\.[A-Za-z])/g,
    (m) => (m.toLowerCase() === realUpiCheck.toLowerCase() ? m : realUpiCheck)
  );
}

// SAFETY: Gemini kabhi kabhi "[Your UPI ID Here]" / "[QR Code Image Link Here]" /
// "[Bank Name]" jaise nakli placeholder likh deta hai. Aisa reply customer ko
// kabhi nahi jaana chahiye - uski jagah asli payment details + QR.
const bracketSegs = aiReply.match(/\[[^\]]{2,400}\](?!\()/g) || [];
const payPlaceholder = bracketSegs.some((p) => /here|link|upi|qr|bank|account|ifsc|number|name|id/i.test(p));

if (payPlaceholder && state.stage === "PAYMENT") {

  // PAYMENT stage mein nakli placeholder: asli payment details + QR bhejo
  console.log("PLACEHOLDER REPLY BLOCKED (PAYMENT) -> asli payment details bheji");

  aiReply = buildPaymentDetailsMessage(conversationHistory, "advance", state);
  state.paymentDetailsSent = true;
  state.qrCodeSent = true;
  conversationHistory.push({ role: "assistant", content: aiReply });
  await persistState(userNumber, state);
  await persistConversation(userNumber, conversationHistory);
  await sendWhatsAppReply(aiReply, `${process.env.APP_URL || "https://ai-agent-h5dd.onrender.com"}/qr-code.png`);
  return;
}

if (bracketSegs.length) {
  console.log("BRACKET NOTE removed (stage:", state.stage, ")");
}

// Andar ke notes, galat daave, ek se zyada sawal - sab saaf
aiReply = cleanAiText(aiReply);

if (!aiReply || aiReply.length < 3) {
  aiReply = "Sir 😊, ek baar apni baat dobara likh dijiye, main zaroor madad karunga. 🙏";
}

console.log("DEMO LINK CHECK:", {
  stage: state.stage,
  stageBeforeThisTurn,
  demoLinkSent: state.demoLinkSent,
  isFallbackReply
});

if (state.stage === "DEMO" && stageBeforeThisTurn === "DEMO" && !state.demoLinkSent && !isFallbackReply) {

  console.log("DEMO LINK: entering generation block for", userNumber);

  const appUrl = process.env.APP_URL || "https://ai-agent-h5dd.onrender.com";

  // Static fallback demos (used only if live generation fails/errors,
  // so the customer never gets stuck without any demo link).
  const DEMO_FILE_BY_INDUSTRY = {
    fashion_store: "demo.html",
    restaurant: "demo-restaurant.html",
    salon: "demo-salon.html",
    gym: "demo-gym.html",
    kirana_store: "demo-kirana.html"
  };

  let demoUrl = pickSampleDemoUrl(
    detectDemoCategory(conversationHistory, state.business),
    state.industryId,
    appUrl
  );

  console.log("DEMO LINK: sample demo:", demoUrl);

  if (process.env.DEMO_MODE === "live") {

  try {

    console.log("DEMO LINK: calling generateDemoWebsite...");

    const generatedHtml = await generateDemoWebsite(state);

    console.log("DEMO LINK: generateDemoWebsite returned, length =", generatedHtml?.length);

    const demoId =
      Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

    if (supabase) {

      const { error } = await supabase
        .from("generated_demos")
        .upsert({ id: demoId, html: generatedHtml });

      if (error) {
        console.log("DEMO SAVE SUPABASE ERROR:", JSON.stringify(error));
        throw new Error("Could not save generated demo");
      }

      demoUrl = `${appUrl}/demo/${demoId}`;
      console.log("DEMO LINK: generated successfully:", demoUrl);

    } else {
      throw new Error("Supabase not configured for demo storage");
    }

  } catch (genErr) {

    console.log("DEMO GENERATION FAILED, using static fallback:", genErr.message);

    const fallbackFile = DEMO_FILE_BY_INDUSTRY[state.industryId] || "demo.html";
    demoUrl = `${appUrl}/${fallbackFile}`;
    console.log("DEMO LINK: using fallback:", demoUrl);

  }

  }

  aiReply = `${aiReply}\n\n👉 ${demoUrl}`;

  state.demoLinkSent = true;

  console.log("DEMO LINK: appended to aiReply, final length =", aiReply.length);

}

// Send the final real website link once it's ready (one time only)
if (
  state.finalWebsiteGenerated &&
  state.finalWebsiteUrl &&
  !state.finalWebsiteLinkSent &&
  !isFallbackReply
) {

  aiReply = `${aiReply}\n\n🌐 ${state.finalWebsiteUrl}`;

  state.finalWebsiteLinkSent = true;

}

// USKE BAAD HISTORY SAVE

conversationHistory.push({
role: "assistant",
content: aiReply
});

await persistState(userNumber, state);
await persistConversation(userNumber, conversationHistory);

if (state.stage === "PAYMENT" && !state.qrCodeSent && !isFallbackReply) {

  const appUrlForQr = process.env.APP_URL || "https://ai-agent-h5dd.onrender.com";
  await sendWhatsAppReply(aiReply, `${appUrlForQr}/qr-code.png`);
  state.qrCodeSent = true;

} else {
  await sendWhatsAppReply(aiReply);
}

} catch (err) {
    
  console.error("===== GEMINI ERROR =====");
  console.error(err);

  if (err.stack) {
    console.error(err.stack);
  }

  await sendWhatsAppReply(`Sir 😊, thoda technical dikkat aa rahi hai abhi. Kripya 1-2 minute baad phir se message kijiye. 🙏`);

  }

});

// Agar kisi wajah se koi reply nahi gaya, to bhi Twilio ko jawab de do.
answerWebhook("<Response></Response>");

});

const PORT = process.env.PORT || 10000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
    
