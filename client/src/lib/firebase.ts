import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
// If you want to use analytics later: import { getAnalytics } from "firebase/analytics";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBj5rw060I5bZRk2iwHTTxo4FuG8_pLpKY",
  authDomain: "ai-web-builder-274d5.firebaseapp.com",
  projectId: "ai-web-builder-274d5",
  storageBucket: "ai-web-builder-274d5.firebasestorage.app",
  messagingSenderId: "452320715514",
  appId: "1:452320715514:web:22330f65f553b87144df43",
  measurementId: "G-WMEG59Z32L"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
// const analytics = getAnalytics(app);

export { app, auth };
