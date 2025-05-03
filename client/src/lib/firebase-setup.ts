import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  setPersistence, 
  browserLocalPersistence
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "",
  authDomain: `${import.meta.env.VITE_FIREBASE_PROJECT_ID || ""}.firebaseapp.com`,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "",
  storageBucket: `${
    import.meta.env.VITE_FIREBASE_PROJECT_ID || ""
  }.appspot.com`,
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "",
};

// Debug Firebase configuration (without showing the entire API key)
console.log("Firebase Configuration (Debug):", {
  apiKeyPrefix: firebaseConfig.apiKey ? firebaseConfig.apiKey.substring(0, 5) + "..." : "missing",
  authDomain: firebaseConfig.authDomain,
  projectId: firebaseConfig.projectId,
  appIdPrefix: firebaseConfig.appId ? firebaseConfig.appId.substring(0, 5) + "..." : "missing",
});

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Set persistence to LOCAL (browser persistence)
// This will keep the user logged in even after page refresh
setPersistence(auth, browserLocalPersistence)
  .then(() => {
    console.log("Firebase: Set persistence to LOCAL");
  })
  .catch((error) => {
    console.error("Firebase: Error setting persistence", error);
  });

export { auth, app, db };