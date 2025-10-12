// /api/moderate.js
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
      console.error("OPENAI_API_KEY not set");
      return res.status(500).json({
        safe: false,
        reason: "Server configuration error: API key not set",
      });
    }

    // Call OpenAI Moderation API
    const response = await fetch("https://api.openai.com/v1/moderations", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "omni-moderation-latest",
        input: text,
      }),
    });

    if (!response.ok) {
      console.error("OpenAI Moderation API error:", response.status, await response.text());
      return res.status(500).json({
        safe: false,
        reason: "Moderation API error",
      });
    }

    // Parse JSON safely
    let data;
    try {
      data = await response.json();
    } catch (parseErr) {
      console.error("Failed to parse moderation API response:", parseErr);
      return res.status(500).json({
        safe: false,
        reason: "Invalid response from moderation API",
      });
    }

    const result = data.results?.[0];

    if (result?.flagged) {
      return res.status(200).json({
        safe: false,
        categories: result.categories || {},
        reason: "Inappropriate content detected",
      });
    }

    return res.status(200).json({ safe: true });
  } catch (err) {
    console.error("Moderation endpoint unexpected error:", err);
    return res.status(500).json({
      safe: false,
      reason: "Moderation service failed",
    });
  }
}
