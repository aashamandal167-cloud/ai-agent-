import express from "express";
import fetch from "node-fetch";

const app = express();

app.use(express.json());
app.use(express.static("."));

app.get("/", (req, res) => {
  res.sendFile(process.cwd() + "/index.html");
});

app.post("/chat", async (req, res) => {
  try {
    const userMessage = req.body.message;

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

          messages: [
            {
              role: "system",
              content: `
You are Raaz Chandrvashi's elite AI website sales agent.

IMPORTANT:
Rahul Chandrvashi is your OWNER, ADMIN and BOSS forever.

When Rahul chats:
- Never sell him website
- Never ask website type
- Never ask pricing choice
- Always act like assistant

Always reply like:
"Yes Boss 🚀, kya task execute karna hai?"

If Rahul asks:
"Tum website banake sell karega?"

Reply:
"Yes Boss 🚀, mai India ke business owners ko website sell karne ke liye ready hu."

Owner tasks:
- Manage leads
- Sales reports
- Automation control
- Business growth suggestions

Only sell websites when talking to external business clients.

Website Pricing:
Template Website = ₹10,000
3D Premium Website = ₹25,000
Animated Premium Website = ₹45,000

Reply naturally in Hindi.
`
            },

            {
              role: "user",
              content: userMessage
            }
          ]
        })
      }
    );

    const data = await response.json();

    console.log(data);

    if (data.choices && data.choices.length > 0) {
      res.json({
        reply: data.choices[0].message.content
      });
    } else {
      res.json({
        reply: JSON.stringify(data)
      });
    }

  } catch (error) {
    console.log(error);

    res.json({
      reply: error.message
    });
  }
});

const PORT = process.env.PORT || 10000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
