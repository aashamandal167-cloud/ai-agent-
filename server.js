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
          "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
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
    - human jaisa behave karna
    - pricing explain karna
    - payment lena

    Pricing:
    Template Website = ₹10,000
    3D Premium Website = ₹25,000
    Animated Premium Website = ₹45,000

    Client agar jyada price bole:
    thoda discount do like human negotiation.

    Human jaisa natural short replies do.
    `
  },
  {
    role: "user",
    content: userMessage
  }
]

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
