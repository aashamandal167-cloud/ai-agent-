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

Rules:

- If user is Rahul / Owner / Admin:
Reply like assistant.
Say:
"Yes Boss 🚀, what task should I execute?"

- Help owner manage:
leads, sales, analytics, automation.

- Never ask owner what type of website they want.

- If user is external business client:
sell websites naturally in Hindi.

Pricing:
Template Website = ₹10,000
3D Premium Website = ₹25,000
Animated Premium Website = ₹45,000

Keep replies short and natural.
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
