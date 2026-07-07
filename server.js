import express from "express";
import fetch from "node-fetch";
import { createClient } from "@supabase/supabase-js";
import twilio from "twilio";
import ai from "./config/gemini.js";
import { getBrain } from "./services/brainManager.js";
import { generateReply } from "./services/aiService.js";
import { updateStage } from "./services/stageManager.js";

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
  
app.post("/whatsapp-webhook", async (req, res) => {

  console.log("WhatsApp Message:", req.body.Body);

  res.send("OK");

});
  
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

conversations[userNumber].push({
  role: "user",
  content: userMessage
});

const recentHistory =
  conversations[userNumber].slice(-10);

    
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
    
    const userMessage = req.body.message.toLowerCase();

    const cleanSearch = req.body.message
  .toLowerCase()

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


    // Normal AI Chat
    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
  model: "openai/gpt-4o-mini",
  max_tokens: 1000,
  messages: [
    {
      role: "system",
      content: `
     
You are Raaz Chandrvashi's elite AI website sales agent.

Rahul Chandrvashi is OWNER forever.

When Rahul chats:
Reply only:
"Yes Boss 🚀, kya task execute karna hai?"

Never sell Rahul website.

Sell websites only to external business clients.

Pricing:
Template Website = ₹10,000
3D Premium Website = ₹25,000
Animated Premium Website = ₹45,000

Reply naturally in Hindi.
`
            },
            {
              role: "user",
              content: req.body.message
            }
          ]
        })
      }
    );

    const data = await response.json();

const aiReply =
  data.choices?.[0]?.message?.content || "No response";

    // SAVE MY CHAT HISTORY
if (supabase) {
  try {
    await supabase
      .from("my_chat_history")
      insert([
        {
          message: req.body.message,
          reply: aiReply,
          chat_id: req.body.chat_id
        }
      ]);

    console.log("Chat saved 🚀");
  } catch (e) {
    console.log("History Save Error:", e.message);
  }
}
    
// SAVE MY CHAT HISTORY
if (supabase) {

  const { data: savedData, error } = await supabase
    .from("my_chat_history")
    .insert([
{
message: req.body.message,
reply: aiReply,
chat_id: req.body.chat_id
}
])
    .select();

  console.log("CHAT SAVED =", savedData);
  console.log("CHAT ERROR =", error);

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

app.post("/whatsapp-webhook", async (req, res) => {

  try {

    const userMessage = req.body.Body;


    const userNumber = req.body.From;

// YAHAN ADD KARO
if (!clientState[userNumber]) {
  clientState[userNumber] = {
    stage: "DISCOVERY",
    factsCount: 0,
    trustCount: 0,
    demoShown: false,

    categorySelected: "",
    budget: "",

    business: "",
    city: "",

    problem: "",
    customerBehaviour: "",
    competitor: ""
  };
}

if (!conversations[userNumber]) {
  conversations[userNumber] = [];
    }

conversations[userNumber].push({
  role: "user",
  content: userMessage
});

const state = clientState[userNumber];

if (userMessage.toLowerCase().includes("online shopping")) {
  state.problem = "online shopping";
}

    if (
  userMessage.toLowerCase().includes("sales") ||
  userMessage.toLowerCase().includes("kam")
) {
  state.problem = "low sales";
    }

    
if (userMessage.toLowerCase().includes("fashion store")) {
  state.business = "Fashion Store";
}

if (userMessage.toLowerCase().includes("mumbai")) {
  state.city = "Mumbai";
}

    if (
  userMessage.toLowerCase().includes("ha")
) {

  state.customerBehaviour = "Customers pehle aate the";

}


if (
  userMessage.toLowerCase().includes("nahi")
) {

  state.competitor = "No Website";

}


if (
  userMessage.toLowerCase().includes("pata nahi")
) {

  state.competitor = "Unknown";

}
    
    
state.factsCount = 0;

if (state.business) {
  state.factsCount++;
}

if (state.city) {
  state.factsCount++;
}

if (state.problem) {
  state.factsCount++;
}

    if (state.customerBehaviour) {
  state.factsCount++;
}

if (state.competitor) {
  state.factsCount++;
}

    
// DISCOVERY QUESTIONS FIX

if (state.stage === "DISCOVERY") {

  if (!state.problem) {

    const aiReply =
      "Sir, aapko sabse badi problem kya lagti hai? 😊";

    const twiml = `
<Response>
<Message>${aiReply}</Message>
</Response>
`;

    return res.type("text/xml").send(twiml);

  }


  if (!state.customerBehaviour) {

    const aiReply =
      "Kya customers pehle aapke paas aate the? 😊";

    const twiml = `
<Response>
<Message>${aiReply}</Message>
</Response>
`;

    return res.type("text/xml").send(twiml);

  }


  if (!state.competitor) {

    const aiReply =
      "Kya competitors ke paas website hai? 😊";

    const twiml = `
<Response>
<Message>${aiReply}</Message>
</Response>
`;

    return res.type("text/xml").send(twiml);

  }


  // DISCOVERY COMPLETE

  state.stage = "STORY";

  const aiReply =
    "Sir agar aap bura na maane to ek chhota sa experience share kar sakta hu? 😊";

  const twiml = `
<Response>
<Message>${aiReply}</Message>
</Response>
`;

  return res.type("text/xml").send(twiml);

  }

let extraRule = "";

if (state.stage === "DISCOVERY") {

  extraRule = `

CURRENT STAGE = DISCOVERY

STRICT RULES:

1. Ask ONLY ONE question.

2. Never tell story.

3. Never show demo.

4. Never show category.

5. Never show pricing.

6. Wait for user answer.

`;

}

else if (state.stage === "STORY") {

  extraRule = `

CURRENT STAGE = STORY

STRICT RULES:

Tell ONLY one matching story.

No Demo.

No Category.

No Pricing.

`;

}

else if (state.stage === "DEMO") {

  extraRule = `

CURRENT STAGE = DEMO

STRICT RULES:

Show demo only.

Do not tell story again.

Do not show pricing.

`;

}

else if (state.stage === "DEAL") {

  extraRule = `

CURRENT STAGE = DEAL

STRICT RULES:

Show ONLY 3 website categories.

Never show pricing.

Wait for customer to choose one category.

Never negotiate.

`;

}

else if (state.stage === "NEGOTIATION") {

  extraRule = `

CURRENT STAGE = NEGOTIATION

STRICT RULES:

Show ONLY the selected category price.

Never show other category prices.

Follow negotiation rules only.

`;

}

else if (state.stage === "PAYMENT") {

  extraRule = `

CURRENT STAGE = PAYMENT

STRICT RULES:

Ask for advance payment only after deal confirmation.

Never negotiate here.

`;

}

else if (state.stage === "FOLLOWUP") {

  extraRule = `

CURRENT STAGE = FOLLOWUP

STRICT RULES:

Support the customer.

Give updates.

Help after delivery.

`;

}
// Stage pehle update hogi
updateStage(state, userMessage);

// Stage update hone ke baad extraRule banega
let extraRule = "";

if (state.stage === "DISCOVERY") {

  extraRule = `
CURRENT STAGE = DISCOVERY

Ask ONLY discovery questions.
Never tell story.
Never show demo.
Never show category.
Never show pricing.
`;

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
  conversations[userNumber].slice(-10);

const aiReply = await generateReply({
  state,
  recentHistory,
  extraRule
});

// USKE BAAD HISTORY SAVE

conversations[userNumber].push({
role: "assistant",
content: aiReply
});

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
