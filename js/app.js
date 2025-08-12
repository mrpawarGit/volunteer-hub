import { auth } from "./firebase-config.js";
import { onAuthStateChanged } from "firebase/auth";

// Global auth state management
class App {
  constructor() {
    this.init();
  }

  init() {
    this.setupAuthStateListener();
    this.setupServiceWorker();
  }

  setupAuthStateListener() {
    onAuthStateChanged(auth, (user) => {
      this.updateNavigation(user);
    });
  }

  updateNavigation(user) {
    const userDropdown = document.getElementById("userDropdown");
    const authButtons = document.getElementById("authButtons");
    const userName = document.getElementById("userName");

    if (user && userDropdown && authButtons) {
      userDropdown.style.display = "block";
      authButtons.style.display = "none";
      if (userName) {
        userName.textContent = user.email.split("@")[0];
      }
    } else if (userDropdown && authButtons) {
      userDropdown.style.display = "none";
      authButtons.style.display = "block";
    }
  }

  setupServiceWorker() {
    if ("serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        navigator.serviceWorker
          .register("/sw.js")
          .then((registration) => console.log("SW registered"))
          .catch((error) => console.log("SW registration failed"));
      });
    }
  }
}

// Global logout function
window.logout = async () => {
  try {
    await auth.signOut();
    window.location.href = "/index.html";
  } catch (error) {
    console.error("Logout error:", error);
  }
};

// Initialize app
new App();
