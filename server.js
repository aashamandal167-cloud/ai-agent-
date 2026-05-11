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
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: userMessage
                }
              ]
            }
          ]
        }),
      }
    );

    const data = await response.json();

    console.log(data);

    if (data.candidates) {

      res.json({
        reply: data.candidates[0].content.parts[0].text,
      });

    } else {

      res.json({
        reply: JSON.stringify(data),
      });

    }

  } catch (error) {

    console.log(error);

    res.json({
      reply: error.message,
    });

  }

});

const PORT = process.env.PORT || 10000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
