// /api/moderate.js
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // Set in your environment variables
});

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { text } = req.body;
  if (!text) return res.status(400).json({ safe: false, reason: "No text provided" });

  try {
    const response = await openai.moderations.create({
      model: "omni-moderation-latest",
      input: text,
    });

    const [result] = response.results;
    res.status(200).json({
      safe: !result.flagged,
      categories: result.categories,
      reason: result.flagged ? "Inappropriate content detected" : null,
    });
  } catch (error) {
    console.error("Moderation error:", error);
    res.status(500).json({ safe: false, reason: "Moderation failed" });
  }
}
