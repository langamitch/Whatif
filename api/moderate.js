// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM loaded, initializing form...');
  
  // Try multiple possible form IDs
  const suggestionForm = document.getElementById('suggestion-form') || 
                        document.getElementById('suggestionForm') ||
                        document.querySelector('form[name="suggestion"]') ||
                        document.querySelector('.suggestion-form');
  
  if (!suggestionForm) {
    console.error('Suggestion form not found! Available forms:', 
      Array.from(document.querySelectorAll('form')).map(f => f.id || f.className)
    );
    return;
  }

  console.log('Form found:', suggestionForm);

  suggestionForm.addEventListener("submit", async (e) => {
    e.preventDefault();

  const name = document.getElementById("name")?.value.trim();
  const suggestion = document.getElementById("suggestion")?.value.trim();
  const socialLink = document.getElementById("social-link")?.value.trim();
  const category = document.getElementById("category")?.value;
  const hashtags = extractHashtags(suggestion);
  const submitBtn = suggestionForm.querySelector(".submit-btn");

  if (!submitBtn) return;

  submitBtn.disabled = true;
  const originalText = submitBtn.textContent;
  submitBtn.textContent = "Submitting...";

  try {
    // Basic validation
    if (!name || !suggestion || !socialLink || !category) {
      alert("Please fill in all fields.");
      return;
    }

    if (!/^https?:\/\//.test(socialLink)) {
      alert("Social link must start with http:// or https://");
      return;
    }

    // Word limit check
    const words = suggestion.split(/\s+/).filter(Boolean);
    if (words.length > 200) {
      alert("Your suggestion exceeds the 200 word limit.");
      return;
    }

    // --- AI Moderation Check ---
    submitBtn.textContent = "Checking content...";
    
    let moderationData;
    try {
      const moderationResponse = await fetch("/api/moderate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: `${name} ${suggestion}` }),
      });

      if (!moderationResponse.ok) {
        throw new Error(`Moderation API returned ${moderationResponse.status}`);
      }

      moderationData = await moderationResponse.json();
      console.log("Moderation result:", moderationData);

    } catch (err) {
      console.error("Error contacting moderation endpoint:", err);
      alert("Could not verify content safety. Please try again later.");
      return;
    }

    // Block if flagged
    if (!moderationData.safe) {
      const reason = moderationData.reason || "Inappropriate content detected";
      const details = moderationData.categories 
        ? `\n\nDetected: ${moderationData.categories.map(c => c.label).join(", ")}`
        : "";
      
      alert(`⚠️ Submission blocked: ${reason}${details}`);
      console.warn("Moderation categories flagged:", moderationData.categories);
      return;
    }

    // --- Submit to Firestore ---
    submitBtn.textContent = "Saving...";
    
    await addDoc(postsRef, {
      name,
      suggestion,
      socialLink,
      category,
      hashtags,
      timestamp: serverTimestamp(),
      moderated: true,
      moderationTimestamp: new Date().toISOString(),
    });

    // Reset form and close overlay
    suggestionForm.reset();
    if (typeof updateWordCount === 'function') {
      updateWordCount();
    }
    if (formOverlay) {
      formOverlay.style.display = "none";
    }

    alert("✅ Suggestion submitted successfully!");

  } catch (err) {
    console.error("Submission error:", err);
    alert("❌ Failed to submit suggestion. Please try again.\n\nError: " + err.message);
  } finally {
    // Always re-enable button
    submitBtn.disabled = false;
    submitBtn.textContent = originalText;
  }
  });
});

// Helper function if not already defined
function extractHashtags(text) {
  const matches = text.match(/#\w+/g);
  return matches || [];
}
