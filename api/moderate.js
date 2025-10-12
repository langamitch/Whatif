// Create this file at: pages/api/test-moderate.js
// This is just for testing - remove after debugging

export default async function handler(req, res) {
  const HF_API_TOKEN = process.env.OPENAI_API_KEY;

  if (!HF_API_TOKEN) {
    return res.status(500).json({ error: "No token" });
  }

  // Test with hateful content
  const testText = "I hate you and you should die you stupid idiot";

  try {
    const response = await fetch(
      "https://api-inference.huggingface.co/models/facebook/roberta-hate-speech-dynabench-r4-target",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${HF_API_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          inputs: testText,
          options: { wait_for_model: true }
        }),
      }
    );

    const result = await response.json();

    return res.status(200).json({
      status: response.status,
      rawResponse: result,
      predictions: Array.isArray(result[0]) ? result[0] : result,
      testText: testText
    });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}