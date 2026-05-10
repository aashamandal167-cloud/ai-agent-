import express from "express";
import fetch from "node-fetch";

const app = express();

app.use(express.json());
app.use(express.static("."));

app.post("/chat", async (req, res) => {

  const userMessage = req.body.message;

  try {

    const response = await fetch(
      "https://api.openai.com/v1/responses",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          input: userMessage
        }),
      }
    );

    const data = await response.json();

    console.log(data);

    res.json({
      reply: data.output[0].content[0].text,
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
