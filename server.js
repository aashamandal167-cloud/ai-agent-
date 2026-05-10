import express from "express";
import fetch from "node-fetch";

const app = express();

app.use(express.json());
app.use(express.static("."));

app.post("/chat", async (req, res) => {

  const userMessage = req.body.message;

  try {

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
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

    res.json({
      reply: data.candidates[0].content.parts[0].text,
    });

  } catch (error) {

    console.log(error);

    res.json({
      reply: "Server Error",
    });

  }

});

app.listen(10000, () => {
  console.log("Server running on port 10000");
});
