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
    
    // Using DistilBERT for toxic content detection - more reliable
    const response = await fetch(
      "https://api-inference.huggingface.co/models/martin-ha/toxic-comment-model",
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

    // Handle different response formats
    let predictions;
    if (Array.isArray(result)) {
      predictions = Array.isArray(result[0]) ? result[0] : result;
    } else if (result.error) {
      console.error("HF returned error:", result.error);
      return res.status(200).json({ 
        safe: true, 
        reason: "Moderation service error" 
      });
    } else {
      console.error("Unexpected response format:", result);
      return res.status(200).json({ 
        safe: true, 
        reason: "Unexpected moderation response" 
      });
    }

    console.log("Predictions:", predictions);

    // This model returns 'toxic' and 'non-toxic' labels
    const toxicItem = predictions.find(item => 
      item.label && item.label.toLowerCase() === 'toxic'
    );
    
    const THRESHOLD = 0.5; // 50% confidence threshold
    
    console.log("Toxic item found:", toxicItem);
    console.log("Threshold check:", toxicItem ? toxicItem.score > THRESHOLD : false);
    
    const isToxic = toxicItem && toxicItem.score > THRESHOLD;

    if (isToxic) {
      console.warn("Content flagged as toxic:", toxicItem);
      return res.status(200).json({
        safe: false,
        reason: "Inappropriate content detected",
        categories: [{
          label: toxicItem.label,
          score: toxicItem.score.toFixed(2)
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