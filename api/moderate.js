// Simple keyword-based moderation as a fallback
// Place this at: pages/api/moderate.js

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { text } = req.body;
    
    if (!text || text.trim().length === 0) {
      return res.status(400).json({ 
        safe: false, 
        reason: "Empty text provided" 
      });
    }

    console.log("Moderating text:", text.substring(0, 50) + "...");

    // Basic keyword filtering (expand this list as needed)
    const bannedWords = [
      'hate', 'kill', 'die', 'stupid', 'idiot', 'dumb',
      'fuck', 'shit', 'damn', 'bitch', 'ass', 'crap',
      'moron', 'loser', 'trash', 'garbage', 'worthless'
    ];

    const lowerText = text.toLowerCase();
    const foundBadWords = bannedWords.filter(word => 
      lowerText.includes(word)
    );

    if (foundBadWords.length > 0) {
      console.log("Flagged words:", foundBadWords);
      return res.status(200).json({
        safe: false,
        reason: "Inappropriate language detected",
        categories: foundBadWords
      });
    }

    // If OpenAI key is available, use it
    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
    
    if (OPENAI_API_KEY) {
      try {
        console.log("Using OpenAI moderation...");
        
        const response = await fetch(
          "https://api.openai.com/v1/moderations",
          {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${OPENAI_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ input: text }),
          }
        );

        if (response.ok) {
          const result = await response.json();
          const moderationResult = result.results[0];
          
          if (moderationResult.flagged) {
            const flaggedCategories = Object.entries(moderationResult.categories)
              .filter(([_, flagged]) => flagged)
              .map(([category]) => category);

            console.log("OpenAI flagged:", flaggedCategories);
            
            return res.status(200).json({
              safe: false,
              reason: "Inappropriate content detected",
              categories: flaggedCategories
            });
          }
        } else {
          console.error("OpenAI API error:", response.status);
        }
      } catch (err) {
        console.error("OpenAI moderation failed:", err.message);
        // Continue to keyword check
      }
    }

    // Content passed all checks
    console.log("Content approved");
    return res.status(200).json({ safe: true });

  } catch (err) {
    console.error("Moderation error:", err);
    return res.status(200).json({ 
      safe: true, 
      reason: "Moderation service error" 
    });
  }
}