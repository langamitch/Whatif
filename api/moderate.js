export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  console.log("=== Moderation Request Started ===");
  console.log("Request body:", req.body);

  try {
    const { text } = req.body;
    
    // Validate input
    if (!text || text.trim().length === 0) {
      console.error("Empty text received");
      return res.status(400).json({ 
        safe: false, 
        reason: "Empty text provided" 
      });
    }

    console.log("Text to moderate (length):", text.length);

    // Get Hugging Face API token
    const HF_API_TOKEN = process.env.OPENAI_API_KEY;

    console.log("Token exists:", !!HF_API_TOKEN);
    console.log("Token length:", HF_API_TOKEN?.length);

    if (!HF_API_TOKEN) {
      console.error("HF_API_TOKEN not configured in environment variables");
      return res.status(500).json({ 
        safe: false, 
        reason: "Moderation service not configured" 
      });
    }

    // Call Hugging Face moderation model
    console.log("Calling Hugging Face API...");
    
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000); // 30 second timeout
    
    // Using a more reliable model that doesn't require special permissions
    const response = await fetch(
      "https://api-inference.huggingface.co/models/facebook/roberta-hate-speech-dynabench-r4-target",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${HF_API_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          inputs: text,
          options: { wait_for_model: true } // Wait for model to load
        }),
        signal: controller.signal
      }
    );
    
    clearTimeout(timeout);

    console.log("HF Response status:", response.status);
    console.log("HF Response headers:", Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text();
      console.error("HF API error:", response.status, errorText);
      
      // Check for specific errors
      if (response.status === 401) {
        console.error("Authentication failed - check token permissions");
        return res.status(500).json({ 
          safe: false, 
          reason: "Moderation service authentication failed" 
        });
      }
      
      if (response.status === 403) {
        console.error("Access forbidden - model may require agreement");
        return res.status(500).json({ 
          safe: false, 
          reason: "Moderation service access denied" 
        });
      }
      
      // Fail open for other errors
      return res.status(200).json({ 
        safe: true, 
        reason: "Moderation API temporarily unavailable" 
      });
    }

    const result = await response.json();
    console.log("HF Response body:", JSON.stringify(result, null, 2));

    // Handle both nested and flat array responses
    const predictions = Array.isArray(result[0]) ? result[0] : result;

    console.log("Predictions:", predictions);

    // Define toxic/hate categories - this model uses 'hate' and 'nothate' labels
    // We flag content if 'hate' has high confidence
    const hateItem = predictions.find(item => item.label === 'hate');
    
    const THRESHOLD = 0.5; // Lower threshold for hate speech
    const isHateful = hateItem && hateItem.score > THRESHOLD;

    if (isHateful) {
      console.warn("Content flagged as hate speech:", hateItem);
      return res.status(200).json({
        safe: false,
        reason: "Inappropriate content detected",
        categories: [{
          label: 'hate',
          score: hateItem.score.toFixed(2)
        }],
      });
    }

    // Content is safe
    return res.status(200).json({ safe: true });

  } catch (err) {
    console.error("Moderation endpoint error:", err);
    console.error("Error name:", err.name);
    console.error("Error message:", err.message);
    
    // Handle timeout
    if (err.name === 'AbortError') {
      console.error("Request timed out - model may be loading");
      return res.status(200).json({ 
        safe: true, 
        reason: "Moderation check timed out - submission allowed" 
      });
    }
    
    // Fail open - allow submission if there's an unexpected error
    return res.status(200).json({ 
      safe: true, 
      reason: "Moderation service error - submission allowed" 
    });
  }
}