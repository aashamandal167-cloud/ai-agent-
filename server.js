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
          model: "mistralai/mistral-7b-instruct:free",
          messages: [
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

    res.json({
      reply: data.choices[0].message.content
    });

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
