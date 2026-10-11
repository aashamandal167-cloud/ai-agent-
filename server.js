import express from "express";
import fetch from "node-fetch";
import { createClient } from "@supabase/supabase-js";
import twilio from "twilio";
import ai from "./config/gemini.js";
import { getBrain } from "./services/brainManager.js";
import { generateReply } from "./services/aiService.js";
import { updateStage } from "./services/stageManager.js";
import INDUSTRIES from "./knowledge/industries.js";
import { generateDemoWebsite } from "./services/demoGenerator.js";
import { generateFinalWebsite } from "./services/websiteGenerator.js";
import { extractPaymentInfo } from "./services/paymentVerifier.js";

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

app.use(express.static("."));

// The business owner's own WhatsApp number - payment screenshots get
// forwarded here for manual approval before anything is confirmed.
const OWNER_NUMBER = process.env.OWNER_WHATSAPP_NUMBER || "whatsapp:+918735054297";

// Generic helper to send a WhatsApp message to ANY number (not tied to
// the current request's customer) - used for owner notifications and
// for proactively confirming to a customer once the owner approves.
async function sendWhatsAppMessageTo(toNumber, fromNumber, text, mediaUrl) {
  try {
    const payload = { body: text, from: fromNumber, to: toNumber };
    if (mediaUrl) payload.mediaUrl = [mediaUrl];
    await twilioClient.messages.create(payload);
  } catch (e) {
    console.log("SEND TO", toNumber, "ERROR:", e.message);
  }
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
      (s.paymentPendingApproval || s.remainingPaymentPendingApproval)
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
  const delays = [1500, 3000];
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

  const isApprovalWord =
    /confirm|approve|haan|yes|ok\b/i.test(userMessage);

  if (codeMatch && isApprovalWord) {

    const code = codeMatch[0];
    const found = await findPendingApprovalByCode(code);

    if (!found) {
      await sendWhatsAppReply(`Koi pending payment approval nahi mila jo ${code} se match kare.`);
      return;
    }

    const { phone, state: custState } = found;

    let kind = null;

    if (custState.paymentPendingApproval) {
      custState.ownerApprovedPayment = true;
      custState.paymentPendingApproval = false;
      updateStage(custState, "owner approved", false);
      kind = "advance";
    } else if (custState.remainingPaymentPendingApproval) {
      custState.remainingPaymentReceived = true;
      custState.remainingPaymentPendingApproval = false;
      kind = "remaining";
    }

    await persistState(phone, custState);

    const notifyText =
      kind === "advance"
        ? "Sir 😊, aapka advance payment confirm ho gaya hai! Ab hum aapki website par kaam shuru kar sakte hain.\n\nKya aap apne business/products ki kam se kam ek photo WhatsApp par bhej sakte hain?"
        : "Sir 😊, aapka payment confirm ho gaya hai! Aapki website ab officially complete hai. Bahut bahut dhanyavaad humpar bharosa karne ke liye! 🙏";

    await sendWhatsAppMessageTo(phone, twilioFromNumber, notifyText);

    await sendWhatsAppReply(`✅ ${phone} ka ${kind === "advance" ? "advance" : "remaining"} payment confirm kar diya gaya, aur unhe inform kar diya gaya hai.`);

    return;

  }

  // Owner sent something else (not a recognized approval command) -
  // just acknowledge briefly, don't run them through the sales flow.
  await sendWhatsAppReply("Sir, agar kisi customer ka payment confirm karna hai, to reply karein: confirm <last 4 digits of their number>");
  return;

}

const state = await getOrLoadState(userNumber);

const stageBeforeThisTurn = state.stage;

let conversationHistory = await getOrLoadConversation(userNumber);

    // Agar Gemini fail ho jaye to is turn ko undo karne ke liye snapshot
// (taaki error wale replies history/state mein na bhar jayein).
const stateSnapshot = JSON.parse(JSON.stringify(state));
const historyLenBefore = conversationHistory.length;

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

if (
  state.stage === "DISCOVERY" &&
  userMessage &&
  userMessage.trim().length > 3 &&
  !trivialMessages.includes(lowerMsg)
) {
  state.discoveryMessageCount = (state.discoveryMessageCount || 0) + 1;
}

if (
  state.stage === "DISCOVERY" &&
  state.discoveryMessageCount >= 2 &&
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
if (state.stage === "PAYMENT" && hasAttachedMedia && mediaUrl && !state.paymentPendingApproval) {

  try {

    const twilioAuth = Buffer.from(
      `${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`
    ).toString("base64");

    const payImgResponse = await fetch(mediaUrl, {
      headers: { Authorization: `Basic ${twilioAuth}` }
    });

    const payImgBuffer = Buffer.from(await payImgResponse.arrayBuffer());
    const payMimeType = payImgResponse.headers.get("content-type") || "image/jpeg";

    const extracted = await extractPaymentInfo(payImgBuffer, payMimeType);

    console.log("=== PAYMENT SCREENSHOT (forwarding to owner) ===");
    console.log("From customer:", userNumber);
    console.log(extracted || "Could not extract details");
    console.log("=================================================");

    const publicImgUrl = await rehostImage(payImgBuffer, payMimeType, "payment");

    const last4 = userNumber.replace(/\D/g, "").slice(-4);

    const ownerText =
      `💰 Naya payment screenshot!\n\n` +
      `Business: ${state.business || "Unknown"}\n` +
      `Number ends in: ${last4}\n\n` +
      `AI ne padha:\n${extracted || "Nahi padh paya"}\n\n` +
      `Reply karein: confirm ${last4}`;

    await sendWhatsAppMessageTo(OWNER_NUMBER, twilioFromNumber, ownerText, publicImgUrl);

    state.paymentPendingApproval = true;

  } catch (payCheckErr) {
    console.log("PAYMENT SCREENSHOT CHECK FAILED:", payCheckErr.message);
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

        await sendWhatsAppMessageTo(OWNER_NUMBER, twilioFromNumber, remOwnerText, remPublicUrl);

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
  // generated - this makes it retry-safe: if a previous attempt
  // failed (e.g. Gemini quota), the NEXT message in this conversation
  // will simply try again, instead of being stuck forever.
  if (state.requirementsLocked && !state.finalWebsiteGenerated) {

    try {

      console.log("FINAL WEBSITE: attempting generation for", userNumber);

      const finalHtml = await generateFinalWebsite(state);

      const siteId =
        Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

      if (supabase) {

        const { error: siteError } = await supabase
          .from("client_websites")
          .upsert({ id: siteId, phone: userNumber, html: finalHtml });

        if (siteError) {
          console.log("FINAL SITE SAVE ERROR:", JSON.stringify(siteError));
        } else {
          const appUrlForSite = process.env.APP_URL || "https://ai-agent-h5dd.onrender.com";
          state.finalWebsiteUrl = `${appUrlForSite}/site/${siteId}`;
          state.finalWebsiteGenerated = true;
          console.log("FINAL WEBSITE: generated successfully:", state.finalWebsiteUrl);
        }

      }

    } catch (genErr) {
      console.log("FINAL WEBSITE GENERATION FAILED (will retry next message):", genErr.message);
    }

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
  await sendWhatsAppReply(aiReply);
  return;
}

// SAFETY: Gemini kabhi kabhi "[Bank Name]" jaise nakli placeholder wale bank
// details bana deta hai. Hamare paas bank details nahi hain, sirf UPI ID + QR.
// Aisa reply customer ko kabhi nahi jaana chahiye - uski jagah asli UPI details.
if (/\[[^\]]{2,40}\]/.test(aiReply) && /bank|account|ifsc|upi|phonepe|paytm|gpay|google pay/i.test(aiReply)) {

  const realUpi = process.env.RAJ_UPI_ID || "";

  console.log("PLACEHOLDER REPLY BLOCKED -> asli UPI details bheji");

  aiReply = realUpi
    ? `Sir 😊, payment ke liye hamare paas UPI hai.\n\nUPI ID: ${realUpi}\n\nQR code bhi bhej raha hoon. Aap kisi bhi UPI app (GPay, PhonePe, Paytm) se payment kar sakte hain.\n\nPayment ke baad please screenshot bhej dijiye, Sir.`
    : "Sir 😊, payment details abhi taiyaar ho rahi hain. Thodi der mein bhej deta hoon.";
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

  let demoUrl = null;

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

      
