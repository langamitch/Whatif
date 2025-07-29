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

      snapshot.forEach((doc) => {
        const post = doc.data();
        const postId = doc.id;
        const postCard = document.createElement("div");

        postCard.className = "post-card";
        postCard.innerHTML = `
          <div class="top" onclick="window.open('${
            post.socialLink || "#"
          }', '_blank')">
            <div class="profilepic"></div>
            <div class="profile">${post.name || "Unknown"}</div>
          </div>

          <div class="content">${post.suggestion || ""}</div>

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
      // Also hide the loading indicator in case of an error
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
            post.socialLink.toLowerCase().includes(searchTerm))
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
            <div class="content">${post.suggestion || ""}</div>
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
  const submitBtn = suggestionForm.querySelector(".submit-btn");
  if (submitBtn) {
    submitBtn.disabled = true;
    const originalText = submitBtn.textContent;
    submitBtn.textContent = "Submitting...";
    try {
      if (name && suggestion && socialLink && /^https?:\/\//.test(socialLink)) {
        await addDoc(postsRef, {
          name: name,
          suggestion: suggestion,
          socialLink: socialLink,
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

searchInput?.addEventListener("keyup", searchPosts);

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
