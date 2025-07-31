// Import Firebase (v9+ modular syntax for Firestore)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  onSnapshot,
  serverTimestamp,
  getDocs,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// --- IMPORTANT ---
const firebaseConfig = {
  apiKey: "AIzaSyDb2cl7lsypR1ZoqHGD-mKhzN_lnDcyVEQ",
  authDomain: "website-6a5f1.firebaseapp.com",
  databaseURL: "https://website-6a5f1-default-rtdb.firebaseio.com",
  projectId: "website-6a5f1",
  storageBucket: "website-6a5f1.firebasestorage.app",
  messagingSenderId: "510903945172",
  appId: "1:510903945172:web:a5f5120db75c938721f841",
};

// --- Global Variables ---
let db, postsRef;

// --- DOM Elements ---
const formOverlay = document.getElementById("form-overlay");
const searchOverlay = document.getElementById("search-overlay");
const suggestionForm = document.getElementById("suggestion-form");
const postContainer = document.getElementById("post-container");
const searchInput = document.getElementById("search-input");
const searchResults = document.getElementById("search-results");

// ===================================================================
//  ✅ FIX: MOVE ALL FUNCTION DECLARATIONS HERE (BEFORE THEY ARE CALLED)
// ===================================================================

// Hashtag utility functions
function extractHashtags(text) {
  const hashtagRegex = /#[\w\u0590-\u05ff]+/g;
  return text.match(hashtagRegex) || [];
}

function highlightHashtags(text) {
  const hashtagRegex = /#[\w\u0590-\u05ff]+/g;
  return text.replace(hashtagRegex, '<span class="hashtag-highlight">$&</span>');
}

function renderHashtags(hashtags) {
  if (!hashtags || hashtags.length === 0) return '';
  return `
    <div class="post-hashtags">
      ${hashtags.map(tag => `<span class="post-hashtag">${tag}</span>`).join('')}
    </div>
  `;
}

function updateHashtagDisplay(text) {
  const hashtags = extractHashtags(text);
  const hashtagsDisplay = document.getElementById('extracted-hashtags');
  const hashtagsContainer = document.getElementById('hashtags-display');
  
  if (hashtagsDisplay && hashtagsContainer) {
    if (hashtags.length > 0) {
      hashtagsDisplay.innerHTML = hashtags.map(tag => 
        `<span class="extracted-hashtag">${tag}</span>`
      ).join('');
      hashtagsContainer.style.display = 'flex';
    } else {
      hashtagsContainer.style.display = 'none';
    }
  }
}

function toggleHashtagSuggestions() {
  const suggestions = document.getElementById('hashtag-suggestions');
  if (suggestions) {
    suggestions.style.display = suggestions.style.display === 'none' ? 'block' : 'none';
  }
}

function insertHashtag(tag) {
  const textarea = document.getElementById('suggestion');
  if (textarea) {
    const cursorPos = textarea.selectionStart;
    const textBefore = textarea.value.substring(0, cursorPos);
    const textAfter = textarea.value.substring(cursorPos);
    
    // Add space before hashtag if not at beginning and previous char is not space
    const spaceBefore = cursorPos > 0 && !textBefore.endsWith(' ') ? ' ' : '';
    
    textarea.value = textBefore + spaceBefore + tag + textAfter;
    textarea.focus();
    
    // Set cursor position after the inserted hashtag
    const newPos = cursorPos + spaceBefore.length + tag.length;
    textarea.setSelectionRange(newPos, newPos);
    
    // Update hashtag display
    updateHashtagDisplay(textarea.value);
  }
}

function toggleOverlay(overlay) {
  if (overlay) {
    overlay.style.display =
      overlay.style.display === "block" ? "none" : "block";
  }
}

function listenForPosts() {
  // Ensure postsRef and postContainer are defined in your actual code
  if (!postsRef || !postContainer) return;

  const loadingIndicator = document.getElementById("loading-indicator");

  // Show the loading indicator at the start
  if (loadingIndicator) {
    loadingIndicator.style.display = "block";
  }
  postContainer.innerHTML = ""; // Clear previous posts

  onSnapshot(
    postsRef,
    (snapshot) => {
      // Hide the loading indicator once data is received
      if (loadingIndicator) {
        loadingIndicator.style.display = "none";
      }
      postContainer.innerHTML = ""; // Clear again to be safe

      if (snapshot.empty) {
        postContainer.innerHTML = "<p>No posts to display.</p>";
        return;
      }

      // 🔁 Convert snapshot to array and shuffle
      const docsArray = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      // 🔀 Fisher-Yates shuffle
      for (let i = docsArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [docsArray[i], docsArray[j]] = [docsArray[j], docsArray[i]];
      }

      // 🎴 Render shuffled posts
      docsArray.forEach((post) => {
        const postId = post.id;
        const postCard = document.createElement("div");

        postCard.className = "post-card";
        postCard.innerHTML = `
          <div class="top" onclick="window.open('${
            post.socialLink || "#"
          }', '_blank')">
            <div class="profilepic"></div>
            <div class="profile">${post.name || "Unknown"}</div>
          </div>

          <div class="content">${highlightHashtags(post.suggestion || "")}</div>
          ${renderHashtags(post.hashtags)}

          <div class="post-actions">
            <button class="action-btn" onclick="likePost(this, '${postId}')" aria-label="Like">
              <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="currentColor">
                <path d="M0 0h24v24H0V0z" fill="none"/>
                <path d="M16.5 3c-1.74 0-3.41.81-4.5 2.09C10.91 3.81 9.24 3 7.5 3 4.42 3 2 5.42 2 8.5c0 3.78 3.4 6.86 8.55 11.54L12 21.35l1.45-1.32C18.6 15.36 22 12.28 22 8.5 22 5.42 19.58 3 16.5 3zm-4.4 15.55l-.1.1-.1-.1C7.14 14.24 4 11.39 4 8.5 4 6.5 5.5 5 7.5 5c1.54 0 3.04.99 3.57 2.36h1.87C13.46 5.99 14.96 5 16.5 5c2 0 3.5 1.5 3.5 3.5 0 2.89-3.14 5.74-7.9 10.05z"/>
              </svg>
            </button>
            
            <button class="action-btn save-btn" onclick="savePost(this, '${postId}')" aria-label="Save">
              <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="currentColor">
                <path d="M0 0h24v24H0V0z" fill="none"/>
                <path d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2zm0 15l-5-2.18L7 18V5h10v13z"/>
              </svg>
            </button>
            
            <button class="action-btn save-btn" onclick="window.open('${
              post.socialLink || "#"
            }', '_blank')" aria-label="Open link">
              <svg class="rotate-45" xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor">
                <path d="M665.08-450H180v-60h485.08L437.23-737.85 480-780l300 300-300 300-42.77-42.15L665.08-450Z"/>
              </svg>
            </button>
          </div>
        `;

        postContainer.appendChild(postCard);
        addViewMoreLogic(postCard);
      });
    },
    (error) => {
      console.error("Error fetching posts:", error);
      if (loadingIndicator) {
        loadingIndicator.style.display = "none";
      }
      postContainer.innerHTML =
        "<p>Error loading posts. Please try again later.</p>";
    }
  );
}


/**
 * Handles the click event for the like button.
 * @param {HTMLElement} button - The button element that was clicked.
 * @param {string} postId - The ID of the post to be liked.
 */
function likePost(button, postId) {
  console.log("Liked post:", postId);
  button.classList.toggle("active");
  // TODO: Add your Firestore logic here to update the like count.
}

/**
 * Handles the click event for the save button.
 * @param {HTMLElement} button - The button element that was clicked.
 *- @param {string} postId - The ID of the post to be saved.
 */
function savePost(button, postId) {
  console.log("Saved post:", postId);
  button.classList.toggle("saved");
  // TODO: Add your Firestore logic here to add/remove the post from a user's saved list.
}

async function searchPosts() {
  const searchTerm = searchInput.value.toLowerCase();

  if (!searchResults || !postContainer) return;
  searchResults.innerHTML = "";
  searchResults.classList.remove("active");

  if (searchTerm) {
    // Fetch all posts from Firestore
    try {
      const querySnapshot = await getDocs(postsRef);
      let found = false;
      querySnapshot.forEach((doc) => {
        const post = doc.data();
        const postId = doc.id;
        // Check if any field contains the search term
        if (
          (post.name && post.name.toLowerCase().includes(searchTerm)) ||
          (post.suggestion &&
            post.suggestion.toLowerCase().includes(searchTerm)) ||
          (post.socialLink &&
            post.socialLink.toLowerCase().includes(searchTerm)) ||
          (post.hashtags && post.hashtags.some(tag => 
            tag.toLowerCase().includes(searchTerm)
          ))
        ) {
          found = true;
          const postCard = document.createElement("div");
          postCard.className = "post-card";
          postCard.innerHTML = `
            <div class="top" onclick="window.open('${
              post.socialLink || "#"
            }', '_blank')">
              <div class="profilepic"></div>
              <div class="profile">${post.name || "Unknown"}</div>
            </div>
            <div class="content">${highlightHashtags(post.suggestion || "")}</div>
            ${renderHashtags(post.hashtags)}
            <div class="post-actions">
              <button class="action-btn" onclick="likePost(this, '${postId}')" aria-label="Like">
                <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="currentColor">
                  <path d="M0 0h24v24H0V0z" fill="none"/>
                  <path d="M16.5 3c-1.74 0-3.41.81-4.5 2.09C10.91 3.81 9.24 3 7.5 3 4.42 3 2 5.42 2 8.5c0 3.78 3.4 6.86 8.55 11.54L12 21.35l1.45-1.32C18.6 15.36 22 12.28 22 8.5 22 5.42 19.58 3 16.5 3zm-4.4 15.55l-.1.1-.1-.1C7.14 14.24 4 11.39 4 8.5 4 6.5 5.5 5 7.5 5c1.54 0 3.04.99 3.57 2.36h1.87C13.46 5.99 14.96 5 16.5 5c2 0 3.5 1.5 3.5 3.5 0 2.89-3.14 5.74-7.9 10.05z"/>
                </svg>
              </button>
              <button class="action-btn save-btn" onclick="savePost(this, '${postId}')" aria-label="Save">
                <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="currentColor">
                  <path d="M0 0h24v24H0V0z" fill="none"/>
                  <path d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2zm0 15l-5-2.18L7 18V5h10v13z"/>
                </svg>
              </button>
              <button class="action-btn save-btn" onclick="window.open('${
                post.socialLink || "#"
              }', '_blank')" aria-label="Open link">
                <svg class="rotate-45" xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor">
                  <path d="M665.08-450H180v-60h485.08L437.23-737.85 480-780l300 300-300 300-42.77-42.15L665.08-450Z"/>
                </svg>
              </button>
            </div>
          `;
          searchResults.appendChild(postCard);
        }
      });
      postContainer.style.display = "none";
      searchResults.style.display = "block";
      if (found) {
        searchResults.classList.add("active");
      } else {
        const noResult = document.createElement("div");
        noResult.className = "no-results-message";
        noResult.textContent = "No results found.";
        searchResults.appendChild(noResult);
        searchResults.classList.add("active");
      }
    } catch (error) {
      searchResults.innerHTML =
        '<div class="no-results-message">Error searching posts.</div>';
      searchResults.classList.add("active");
      postContainer.style.display = "none";
      searchResults.style.display = "block";
      console.error("Error fetching posts for search:", error);
    }
  } else {
    postContainer.style.display = "block";
    searchResults.style.display = "none";
    searchResults.classList.remove("active");
  }
}

// Add a close button for search results overlay
const searchCloseBtn = document.getElementById("search-close-btn");
if (searchCloseBtn) {
  searchCloseBtn.addEventListener("click", () => {
    searchInput.value = "";
    postContainer.style.display = "block";
    searchResults.style.display = "none";
    searchResults.classList.remove("active");
  });
}

// ===================================================================
//  END OF FUNCTIONS
// ===================================================================

function addViewMoreLogic(postCard, contentSelector = ".content") {
  const contentDiv = postCard.querySelector(contentSelector);
  if (!contentDiv) return;

  // Wait for DOM to render so we can measure height
  setTimeout(() => {
    if (contentDiv.scrollHeight > 350) {
      // 350px is a good threshold for text
      // Add fade-out effect
      const fade = document.createElement("div");
      fade.className = "fade-out";
      postCard.appendChild(fade);

      // Add view more button
      const btn = document.createElement("button");
      btn.className = "view-more-btn";
      btn.textContent = "View more details";
      postCard.appendChild(btn);

      btn.addEventListener("click", () => {
        if (postCard.classList.contains("expanded")) {
          postCard.classList.remove("expanded");
          btn.textContent = "View more details";
        } else {
          postCard.classList.add("expanded");
          btn.textContent = "View less";
        }
      });
    }
  }, 0);
}

// --- Initialize Firebase ---
// This block runs immediately. Now it can safely call listenForPosts().
try {
  const app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  postsRef = collection(db, "posts");
  console.log("Firebase initialized successfully");
  listenForPosts(); // This will now work correctly
} catch (error) {
  console.error("Firebase initialization failed:", error);
  alert(
    "Could not connect to the database. Please check the console for errors."
  );
}

// --- Event Listeners ---
suggestionForm?.addEventListener("submit", async (e) => {
  e.preventDefault();

  const name = document.getElementById("name")?.value.trim();
  const suggestion = document.getElementById("suggestion")?.value.trim();
  const socialLink = document.getElementById("social-link")?.value.trim();
  const category = document.getElementById("category")?.value;
  const hashtags = extractHashtags(suggestion);
  const submitBtn = suggestionForm.querySelector(".submit-btn");

  if (submitBtn) {
    submitBtn.disabled = true;
    const originalText = submitBtn.textContent;
    submitBtn.textContent = "Submitting...";

    try {
      if (
        name &&
        suggestion &&
        socialLink &&
        category &&
        /^https?:\/\//.test(socialLink)
      ) {
        await addDoc(postsRef, {
          name: name,
          suggestion: suggestion,
          socialLink: socialLink,
          category: category,
          hashtags: hashtags,
          timestamp: serverTimestamp(),
        });

        suggestionForm.reset();
        if (formOverlay) formOverlay.style.display = "none";

        alert("Suggestion submitted successfully!");
      } else {
        alert(
          "Please fill in all fields. The URL must start with http:// or https://"
        );
      }
    } catch (error) {
      console.error("Error writing to Firestore:", error);
      alert("Failed to submit suggestion. Check console for details.");
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = originalText;
    }
  }
});

// Add word count limit for suggestion textarea
const suggestionTextarea = document.getElementById("suggestion");
if (suggestionTextarea) {
  // Create counter element
  let counter = document.createElement("div");
  counter.id = "suggestion-word-count";
  counter.style.fontSize = "0.85em";
  counter.style.color = "#888";
  counter.style.marginTop = "4px";
  suggestionTextarea.parentNode.appendChild(counter);

  let limitReached = false;

  function updateWordCount() {
    const words = suggestionTextarea.value.trim().split(/\s+/).filter(Boolean);
    counter.textContent = `${words.length}/200 words`;
    if (words.length >= 200) {
      counter.textContent = "200/200 words (limit reached)";
      counter.style.color = "#d00";
      limitReached = true;
    } else {
      counter.style.color = "#888";
      limitReached = false;
    }
  }

  // Word count functionality
  suggestionTextarea.addEventListener("input", function (e) {
    let words = suggestionTextarea.value.trim().split(/\s+/).filter(Boolean);
    if (words.length > 200) {
      suggestionTextarea.value = words.slice(0, 200).join(" ");
      words = suggestionTextarea.value.trim().split(/\s+/).filter(Boolean);
    }
    updateWordCount();
    // Update hashtag display
    updateHashtagDisplay(this.value);
  });

  suggestionTextarea.addEventListener("keydown", function (e) {
    const allowedKeys = [8, 46, 37, 38, 39, 40]; // backspace, delete, arrows
    const words = suggestionTextarea.value.trim().split(/\s+/).filter(Boolean);
    if (
      words.length >= 200 &&
      !allowedKeys.includes(e.keyCode) &&
      !e.ctrlKey &&
      !e.metaKey
    ) {
      e.preventDefault();
    }
  });

  // Show hashtag suggestions when user types #
  suggestionTextarea.addEventListener("keyup", function(e) {
    const suggestions = document.getElementById("hashtag-suggestions");
    if (e.key === "#" || this.value.includes("#")) {
      if (suggestions) {
        suggestions.style.display = "block";
      }
    }
  });

  updateWordCount();
}

searchInput?.addEventListener("keyup", searchPosts);

// Hashtag functionality event listeners
// Hide suggestions when clicking outside
document.addEventListener("click", function(e) {
  const suggestions = document.getElementById("hashtag-suggestions");
  const suggestionTextarea = document.getElementById("suggestion");
  if (suggestions && !suggestions.contains(e.target) && e.target !== suggestionTextarea) {
    suggestions.style.display = "none";
  }
});

// Add click handlers for hashtag chips
document.addEventListener("click", function(e) {
  if (e.target.classList.contains("hashtag-chip")) {
    const tag = e.target.getAttribute("data-tag");
    insertHashtag(tag);
  }
});

// Add click handlers for post hashtags (for future search functionality)
document.addEventListener("click", function(e) {
  if (e.target.classList.contains("post-hashtag")) {
    const tag = e.target.textContent;
    if (searchInput) {
      searchInput.value = tag;
      searchPosts();
    }
  }
});

document
  .querySelector(".search-icon")
  ?.addEventListener("click", () => toggleOverlay(searchOverlay));
document
  .querySelector(".toggle")
  ?.addEventListener("click", () => toggleOverlay(formOverlay));
document
  .querySelector("#search-overlay .close-btn")
  ?.addEventListener("click", () => toggleOverlay(searchOverlay));
document
  .querySelector("#form-overlay .close-btn")
  ?.addEventListener("click", () => toggleOverlay(formOverlay));

const openPopupBtn = document.getElementById("openPopup");
const popupOverlay = document.getElementById("popupOverlay");
const submissionForm = document.getElementById("submissionForm");
const closePopupBtn = document.getElementById("closePopup");

openPopupBtn.addEventListener("click", () => {
  popupOverlay.style.display = "flex";
});

popupOverlay.addEventListener("click", (e) => {
  if (e.target === popupOverlay) {
    popupOverlay.style.display = "none";
  }
});

closePopupBtn.addEventListener("click", () => {
  popupOverlay.style.display = "none";
});

const loadingOverlay = document.getElementById("loading-overlay");
if (loadingOverlay) {
  loadingOverlay.style.display = "flex"; // Show full-screen overlay
}

// later when posts are loaded or on error
if (loadingOverlay) {
  loadingOverlay.style.display = "none"; // Hide overlay
}
