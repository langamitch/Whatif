// /api/moderate.js
// Secure moderation endpoint using OpenAI's free moderation model

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { text } = req.body;

    if (!text || text.trim().length === 0) {
      return res.status(400).json({ safe: false, reason: "Empty text" });
    }

    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ safe: false, reason: "API key not set" });
    }

    const response = await fetch("https://api.openai.com/v1/moderations", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "omni-moderation-latest",
        input: text,
      }),
    });

    if (!response.ok) {
      console.error("OpenAI Moderation API error:", response.status);
      return res
        .status(500)
        .json({ safe: true, reason: "Moderation API unavailable" });
    }

    const data = await response.json();
    const result = data.results?.[0];

    if (result?.flagged) {
      return res.status(200).json({
        safe: false,
        categories: result.categories,
        reason: "Inappropriate content detected",
      });
    }

    return res.status(200).json({ safe: true });
  } catch (err) {
    console.error("Moderation endpoint error:", err);
    return res
      .status(500)
      .json({ safe: true, reason: "Moderation service failed" });
  }
}
