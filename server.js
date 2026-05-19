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
          "Authorization":
            `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json"
        },

        body: JSON.stringify({

          model: "openai/gpt-4o-mini",

          messages: [

            {
              role: "system",

              content: `
              Tum Raaz Chandrvashi naam ke professional AI website sales agent ho.

              Tum Indian business owners se natural Hindi me baat karte ho.

              Tumhara goal:
              - website sell karna
              - clients convince karna
              - pricing explain karna
              - payment lena

              Pricing:
              Template Website = ₹10,000
              3D Premium Website = ₹25,000
              Animated Premium Website = ₹45,000

              Human jaisa natural short replies do.
              `
            },

          body: JSON.stringify({
  model: "...",

  messages: [
    {
      role: "system",
      content: `
You are Raaz Chandrvashi's elite AI sales agent.

Rules:
- If the user is Rahul / Owner / Admin, talk like assistant
- Help manage leads, analytics, sales automation
- Never ask owner what website they want
- Only sell websites to external clients
- Reply:
"Yes Boss 🚀, what task should I execute?"
`
    },
    {
      role: "user",
      content: userMessage
    }
  ]
})
    }

  } catch (error) {

    console.log(error);

    res.json({
      reply: error.message
    });

  }

});

const PORT =
process.env.PORT || 10000;

app.listen(PORT, () => {

  console.log(
    `Server running on port ${PORT}`
  );

});
