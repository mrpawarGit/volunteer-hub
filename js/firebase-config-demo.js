// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-analytics.js";

// Your web app's Firebase configuration
// paste your credentials
const firebaseConfig = {
  apiKey: "use-your-cred",
  authDomain: "use-your-cred",
  projectId: "use-your-cred",
  storageBucket: "use-your-cred",
  messagingSenderId: "use-your-cred",
  appId: "use-your-cred",
  measurementId: "use-your-cred",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const analytics = getAnalytics(app);

// Export the app instance if needed
export default app;
