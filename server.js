import express from "express";
import dotenv from "dotenv";
import fetch from "node-fetch";
import twilio from "twilio";
import { createClient } from "@supabase/supabase-js";

import brainManager from "./brain/brainManager.js";
import { updateStage } from "./brain/stageManager.js";

import { generateReply } from "./services/aiService.js";

// Load .env
dotenv.config();

// Express App
const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Runtime Memory
const conversations = {};
const clientState = {};

// Twilio Client
const twilioClient = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
);

// Supabase Client
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

// ==========================================
// Home Route
// ==========================================

app.get("/", (req, res) => {

    res.json({

        success: true,

        message: "🚀 Raj AI Server Running"

    });

});

// ==========================================
// Health Check
// ==========================================

app.get("/health", (req, res) => {

    res.json({

        success: true,

        server: "Running",

        twilio: !!process.env.TWILIO_ACCOUNT_SID,

        supabase: !!supabase

    });

});

// ==========================================
// Test Twilio
// ==========================================

app.get("/test-twilio", async (req, res) => {

    try {

        const result = await twilioClient.messages.create({

            body: "✅ Raj AI Twilio Connected",

            from: process.env.TWILIO_PHONE_NUMBER,

            to: process.env.TEST_PHONE_NUMBER

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


// ==========================================
// WhatsApp Webhook
// ==========================================

app.post("/whatsapp-webhook", async (req, res) => {

    try {

        console.log("========== NEW WHATSAPP MESSAGE ==========");

        const userNumber = req.body.From;
        const userMessage = (req.body.Body || "").trim();

        console.log("Number :", userNumber);
        console.log("Message:", userMessage);

        // Empty Message Safety
        if (!userMessage) {

            return res.type("text/xml").send(`
<Response>
<Message>Message receive nahi hua.</Message>
</Response>
`);

        }

        // ==========================================
        // Create Customer State
        // ==========================================

        if (!clientState[userNumber]) {

            clientState[userNumber] = {

                stage: "DISCOVERY",

                business: "",
                city: "",

                problem: "",
                customerBehaviour: "",
                competitor: "",

                storyShown: false,
                demoShown: false,

                paymentReceived: false

            };

        }

        // ==========================================
        // Create Conversation
        // ==========================================

        if (!conversations[userNumber]) {

            conversations[userNumber] = [];

        }

        conversations[userNumber].push({

            role: "user",

            content: userMessage

        });

        // ==========================================
// Current Customer State
// ==========================================

const state = clientState[userNumber];

// ==========================================
// Update Conversation Stage
// ==========================================

updateStage(state, userMessage);

// ==========================================
// Run Correct Brain
// ==========================================

const result = brainManager.process(

    state,

    userMessage

);

// ==========================================
// Final Reply
// ==========================================

const reply = result.reply;

// Save AI Reply

conversations[userNumber].push({

    role: "assistant",

    content: reply

});

// ==========================================
// Send WhatsApp Reply
// ==========================================

const twiml = `
<Response>
<Message>${reply}</Message>
</Response>
`;

return res.type("text/xml").send(twiml);


  // ==========================================
// Save Conversation History
// ==========================================

conversations[userNumber].push({
    role: "assistant",
    content: reply
});

// Keep Only Last 20 Messages
if (conversations[userNumber].length > 20) {

    conversations[userNumber] =
        conversations[userNumber].slice(-20);

}

// ==========================================
// Save Chat in Supabase
// ==========================================

if (supabase) {

    try {

        await supabase
            .from("client_chat_history")
            .insert([

                {

                    phone: userNumber,

                    message: userMessage,

                    reply: reply

                }

            ]);

    }

    catch (err) {

        console.log(
            "History Save Error:",
            err.message
        );

    }

}

  
