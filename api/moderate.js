export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { text } = req.body;
    if (!text || text.trim().length === 0) {
      return res.status(400).json({ safe: false, reason: "Empty text" });
    }

    // <-- Use OPENAI_API_KEY for Hugging Face
    const HF_API_TOKEN = process.env.OPENAI_API_KEY;

    if (!HF_API_TOKEN) {
      return res.status(500).json({ safe: false, reason: "HF API key not set" });
    }

    const response = await fetch(
      "https://api-inference.huggingface.co/models/unitary/toxic-bert",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${HF_API_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ inputs: text }),
      }
    );

    if (!response.ok) {
      console.error("HF API error:", response.status);
      return res.status(500).json({ safe: true, reason: "Moderation API unavailable" });
    }

    const result = await response.json();

    const toxicLabels = ["toxic", "threat", "insult", "identity_hate", "obscene"];
    const flagged = result.some(
      item => toxicLabels.includes(item.label) && item.score > 0.6
    );

    if (flagged) {
      return res.status(200).json({
        safe: false,
        reason: "Inappropriate content detected",
        categories: result.filter(item => toxicLabels.includes(item.label)),
      });
    }

    return res.status(200).json({ safe: true });
  } catch (err) {
    console.error("Moderation endpoint error:", err);
    return res.status(500).json({ safe: true, reason: "Moderation service failed" });
  }
}
