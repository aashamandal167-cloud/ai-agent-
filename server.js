import express from "express";
import fetch from "node-fetch";
import { createClient } from "@supabase/supabase-js";
import twilio from "twilio";
import ai from "./config/gemini.js";
import { getBrain } from "./services/brainManager.js";
import { generateReply } from "./services/aiService.js";
import { updateStage } from "./services/stageManager.js";
import INDUSTRIES from "./knowledge/industries.js";

const conversations = {};
const clientState = {};

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

app.get("/", (req, res) => {
  res.sendFile(process.cwd() + "/index.html");
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
    demoLinkSent: false
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

      if (!error && data && data.state) {
        state = data.state;
      }
    } catch (e) {
      console.log("STATE LOAD ERROR:", e.message);
    }
  }

  clientState[userNumber] = state;
  return state;

}

async function persistState(userNumber, state) {

  clientState[userNumber] = state;

  if (supabase) {
    try {
      await supabase
        .from("client_state")
        .upsert({
          phone: userNumber,
          state,
          updated_at: new Date().toISOString()
        });
    } catch (e) {
      console.log("STATE SAVE ERROR:", e.message);
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

      if (!error && data && data.messages) {
        history = data.messages;
      }
    } catch (e) {
      console.log("CONVO LOAD ERROR:", e.message);
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
      await supabase
        .from("client_conversations")
        .upsert({
          phone: userNumber,
          messages: trimmed,
          updated_at: new Date().toISOString()
        });
    } catch (e) {
      console.log("CONVO SAVE ERROR:", e.message);
    }
  }

}

app.post("/whatsapp-webhook", async (req, res) => {

  try {

console.log("🔥 WEBHOOK HIT 🔥");

const userMessage = req.body.Body;
const userNumber = req.body.From;

console.log("USER:", userMessage);
console.log("BODY:", req.body);

// ==========================================================
// RESET COMMAND (for testing / customer restart)
// Type "reset" to wipe this number's state and start fresh.
// ==========================================================

if (userMessage && userMessage.trim().toLowerCase() === "reset") {

  clientState[userNumber] = defaultClientState();
  conversations[userNumber] = [];

  await persistState(userNumber, clientState[userNumber]);
  await persistConversation(userNumber, []);

  const resetTwiml = `
<Response>
<Message>Sir 😊, conversation reset ho gayi hai. Hello bolke phir se shuru kariye! 🙏</Message>
</Response>
`;

  res.type("text/xml");
  return res.send(resetTwiml);

}

const state = await getOrLoadState(userNumber);

let conversationHistory = await getOrLoadConversation(userNumber);

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

state.factsCount = 0;

if (state.business) state.factsCount++;
if (state.city) state.factsCount++;
if (state.problem) state.factsCount++;
if (state.customerBehaviour) state.factsCount++;
if (state.competitor) state.factsCount++;

console.log("BEFORE UPDATE =", state.stage);

updateStage(state, userMessage);

console.log("AFTER UPDATE =", state.stage);

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

  const missingItems = [];

  if (!state.problem) missingItems.push({ key: "problem", question: "Sir, aapko sabse badi problem kya lagti hai business mein?" });
  if (!state.customerBehaviour) missingItems.push({ key: "customerBehaviour", question: "Kya customers pehle aapke paas aate the?" });
  if (!state.competitor) missingItems.push({ key: "competitor", question: "Kya competitors ke paas website hai?" });

  if (missingItems.length > 0) {

    const nextQuestion = missingItems[0].question;
    const alreadyKnownParts = [];

    if (state.business) alreadyKnownParts.push(`Business = ${state.business}`);
    if (state.city) alreadyKnownParts.push(`City = ${state.city}`);
    if (state.problem) alreadyKnownParts.push(`Problem = ${state.problem}`);
    if (state.customerBehaviour) alreadyKnownParts.push(`Customer Behaviour = ${state.customerBehaviour}`);
    if (state.competitor) alreadyKnownParts.push(`Competitor = ${state.competitor}`);

    extraRule = `
CURRENT STAGE = DISCOVERY

ALREADY KNOWN (DO NOT ask about these again, DO NOT ask to "confirm" these again):
${alreadyKnownParts.length ? alreadyKnownParts.join(", ") : "Nothing yet"}

STILL MISSING: ${missingItems.map(m => m.key).join(", ")}

YOUR NEXT QUESTION MUST BE (in your own natural Hinglish words, but asking exactly this): "${nextQuestion}"

Rules:
- Do NOT re-ask for business name or city if they are already listed above as known.
- If the customer's last message already answered the next question, acknowledge it briefly and move on - do not repeat the same question.
- If customer asked something off-topic (like your name), answer in one short line, then still ask the next question above.
- Ask ONLY ONE question - the one specified above.

Never tell story.
Never show demo.
Never show category.
Never show pricing.
`;

  } else {

    extraRule = `
CURRENT STAGE = DISCOVERY

Saari discovery jaankari mil chuki hai (problem, customer behaviour, competitor).

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

  extraRule = `
CURRENT STAGE = PAYMENT

Ask only for advance payment.

Never negotiate.
`;

}

else if (state.stage === "FOLLOWUP") {

  extraRule = `
CURRENT STAGE = FOLLOWUP

Support customer.

Give updates only.
`;

}

const recentHistory =
  conversationHistory.slice(-16);

let aiReply = await generateReply({
  state,
  recentHistory,
  extraRule
});

  // STORY aur DEMO complete mark karo

if (state.stage === "STORY") {
  state.storyShown = true;
}

if (state.stage === "DEMO") {
  state.demoShown = true;
}

// DEMO STAGE - actual demo link bhejo (ek hi baar)
if (state.stage === "DEMO" && !state.demoLinkSent) {

  const appUrl = process.env.APP_URL || "https://ai-agent-h5dd.onrender.com";

  aiReply = `${aiReply}\n\n👉 ${appUrl}/demo.html`;

  state.demoLinkSent = true;

}

// USKE BAAD HISTORY SAVE

conversationHistory.push({
role: "assistant",
content: aiReply
});

await persistState(userNumber, state);
await persistConversation(userNumber, conversationHistory);

const twiml = `

<Response>  
<Message>${aiReply}</Message>  
</Response>  
`;  res.type("text/xml");  
res.send(twiml);

} catch (err) {
    
  console.error("===== GEMINI ERROR =====");
  console.error(err);

  if (err.stack) {
    console.error(err.stack);
  }

  res.type("text/xml");
  res.send(`
<Response>
<Message>Error: ${err.message}</Message>
</Response>
`);

  }

});

const PORT = process.env.PORT || 10000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
