import { auth, db } from "./firebase-config.js";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import {
  doc,
  setDoc,
  getDoc,
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

// Login functionality
if (document.getElementById("loginForm")) {
  document.getElementById("loginForm").addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    try {
      await signInWithEmailAndPassword(auth, email, password);
      window.location.href = "../pages/dashboard.html";
    } catch (error) {
      showError(error.message);
    }
  });
}

// Registration functionality
if (document.getElementById("registerForm")) {
  document
    .getElementById("registerForm")
    .addEventListener("submit", async (e) => {
      e.preventDefault();

      const formData = new FormData(e.target);
      const userData = Object.fromEntries(formData);

      try {
        const userCredential = await createUserWithEmailAndPassword(
          auth,
          userData.email,
          userData.password
        );

        // Create user profile in Firestore
        await setDoc(doc(db, "users", userCredential.user.uid), {
          name: userData.name,
          email: userData.email,
          skills: userData.skills
            ? userData.skills.split(",").map((s) => s.trim())
            : [],
          interests: userData.interests
            ? userData.interests.split(",").map((s) => s.trim())
            : [],
          location: userData.location,
          totalHours: 0,
          createdAt: new Date(),
        });

        window.location.href = "../pages/dashboard.html";
      } catch (error) {
        showError(error.message);
      }
    });
}

// Auth state observer
onAuthStateChanged(auth, async (user) => {
  if (user) {
    // Update UI for logged-in user
    updateNavForLoggedInUser(user);
  } else {
    // Update UI for logged-out user
    updateNavForLoggedOutUser();
  }
});

function updateNavForLoggedInUser(user) {
  const userDropdown = document.getElementById("userDropdown");
  const authButtons = document.getElementById("authButtons");
  const userName = document.getElementById("userName");

  if (userDropdown && authButtons && userName) {
    userDropdown.style.display = "block";
    authButtons.style.display = "none";
    userName.textContent = user.email.split("@")[0];
  }
}

function updateNavForLoggedOutUser() {
  const userDropdown = document.getElementById("userDropdown");
  const authButtons = document.getElementById("authButtons");

  if (userDropdown && authButtons) {
    userDropdown.style.display = "none";
    authButtons.style.display = "block";
  }
}

// Logout function
window.logout = async () => {
  try {
    await signOut(auth);
    window.location.href = "../index.html";
  } catch (error) {
    console.error("Logout error:", error);
  }
};

function showError(message) {
  const errorDiv = document.getElementById("errorMessage");
  if (errorDiv) {
    errorDiv.textContent = message;
    errorDiv.classList.remove("d-none");
  }
}
