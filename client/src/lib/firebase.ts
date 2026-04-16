import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
// If you want to use analytics later: import { getAnalytics } from "firebase/analytics";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyBj5rw060I5bZRk2iwHTTxo4FuG8_pLpKY",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "ai-web-builder-274d5.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "ai-web-builder-274d5",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "ai-web-builder-274d5.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "452320715514",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:452320715514:web:22330f65f553b87144df43",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-WMEG59Z32L"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
// const analytics = getAnalytics(app);

export { app, auth };
