/**
 * User Session Management
 * This file handles fetching and displaying user data from the session endpoint
 *
 * IMPORTANT: This script uses variables that are already defined in the main HTML file.
 * It uses 'let' instead of 'const' to avoid redeclaration errors and adds 'Element' suffix
 * to variable names to distinguish them from the original variables.
 */

// Use existing elements from the page
// Note: We're not redeclaring these variables, just using the existing ones
let topCreditsElement = document.getElementById("topCredits");
let topLoginButtonElement = document.getElementById("topLoginButton");
let loginModalElement = document.getElementById("loginModal");
let prevVideosElement = document.getElementById("prevVideos");
let prevVideosContentElement = document.getElementById("prevVideosContent");

/**
 * Fetch and display user data from the session endpoint
 */
const checkForUser = async () => {
  console.log("Looking for user 👨🏻‍💻");

  // Show loading state
  const originalButtonText = topLoginButtonElement.innerHTML;
  topLoginButtonElement.innerHTML = "Cargando...";

  try {
    const response = await fetch("/session", {
      credentials: "include", // Correct parameter for including cookies
    });

    const data = await response.json();

    if (data.success && data.user) {
      // Hide login modal
      loginModalElement.classList.add("hidden");

      // Display user email and credits
      topCreditsElement.textContent = data.user.credits;

      // Update login button to show user email and logout option
      topLoginButtonElement.innerHTML = `
        <div>
          <p>${data.user.email}</p>
          <span class="text-xs">Cerrar sesión</span>
        </div>
      `;

      // Setup logout functionality
      setupLogoutHandler();

      // Display video history if available
      displayVideoHistory(data.user);
    } else {
      // Reset to login state if no valid session
      topLoginButtonElement.innerHTML = originalButtonText;
      topCreditsElement.textContent = "0";
    }
  } catch (error) {
    console.error("Error fetching user session:", error);
    topLoginButtonElement.innerHTML = originalButtonText;
    topCreditsElement.textContent = "0";
  }
};

/**
 * Setup logout handler with proper event listener management
 */
const setupLogoutHandler = () => {
  // Clone and replace to remove any existing event listeners
  const newLoginButton = topLoginButtonElement.cloneNode(true);
  topLoginButtonElement.parentNode.replaceChild(
    newLoginButton,
    topLoginButtonElement
  );

  // Update reference to the new button
  topLoginButtonElement = newLoginButton;

  // Add logout handler
  topLoginButtonElement.addEventListener("click", async () => {
    try {
      await fetch("/logout", {
        credentials: "include",
      });

      // Reset UI
      topLoginButtonElement.innerHTML = "Iniciar sesión";
      topCreditsElement.textContent = "0";
      setState("idle");

      // Setup login modal handler
      setupLoginModalHandler();

      // Hide video history
      prevVideosElement.classList.add("hidden");
    } catch (error) {
      console.error("Error during logout:", error);
    }
  });
};

/**
 * Setup login modal handler
 */
const setupLoginModalHandler = () => {
  // Clone and replace to remove any existing event listeners
  const newLoginButton = topLoginButtonElement.cloneNode(true);
  topLoginButtonElement.parentNode.replaceChild(
    newLoginButton,
    topLoginButtonElement
  );

  // Update reference to the new button
  topLoginButtonElement = newLoginButton;

  // Add login modal handler
  topLoginButtonElement.addEventListener("click", () => {
    loginModalElement.classList.remove("hidden");
  });
};

/**
 * Display video history from user data
 */
const displayVideoHistory = (user) => {
  if (user.videoIds && user.videoIds.length > 0) {
    // Show video history section
    prevVideosElement.classList.remove("hidden");

    // Generate HTML for video IDs
    prevVideosContentElement.innerHTML = user.videoIds
      .map((id) => `<p class="mb-1">${id}</p>`)
      .join("");
  } else {
    prevVideosElement.classList.add("hidden");
  }
};

// Initialize: Check for user session on page load and after user updates
document.addEventListener("DOMContentLoaded", checkForUser);
document.addEventListener("update_user", checkForUser);

// Initial setup for login button if not logged in
if (
  topLoginButtonElement &&
  topLoginButtonElement.textContent.trim() === "Iniciar sesión"
) {
  setupLoginModalHandler();
}
