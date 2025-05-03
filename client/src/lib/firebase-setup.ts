import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  setPersistence, 
  browserLocalPersistence
} from "firebase/auth";
import { getFirestore, enableIndexedDbPersistence } from "firebase/firestore";

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

// Verify Firebase configuration
const missingConfigItems = [];
if (!firebaseConfig.apiKey) missingConfigItems.push("apiKey");
if (!firebaseConfig.projectId) missingConfigItems.push("projectId");
if (!firebaseConfig.appId) missingConfigItems.push("appId");

if (missingConfigItems.length > 0) {
  console.error("FIREBASE CONFIGURATION ERROR: Missing required config items:", missingConfigItems);
  console.error("Please ensure you have set all required environment variables:");
  console.error("- VITE_FIREBASE_API_KEY");
  console.error("- VITE_FIREBASE_PROJECT_ID");
  console.error("- VITE_FIREBASE_APP_ID");
}

// Debug Firebase configuration (without showing the entire API key)
console.log("Firebase Configuration (Debug):", {
  apiKeyPrefix: firebaseConfig.apiKey ? firebaseConfig.apiKey.substring(0, 5) + "..." : "missing",
  authDomain: firebaseConfig.authDomain,
  projectId: firebaseConfig.projectId,
  appIdPrefix: firebaseConfig.appId ? firebaseConfig.appId.substring(0, 5) + "..." : "missing",
  configComplete: missingConfigItems.length === 0
});

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Enable offline persistence for Firestore
enableIndexedDbPersistence(db)
  .then(() => {
    console.log("Firestore: Offline persistence enabled");
  })
  .catch((err) => {
    if (err.code === 'failed-precondition') {
      console.warn("Firestore: Multiple tabs open, persistence can only be enabled in one tab at a time");
    } else if (err.code === 'unimplemented') {
      console.warn("Firestore: The current browser does not support all of the features required to enable persistence");
    } else {
      console.error("Firestore: Error enabling persistence:", err);
    }
  });

// Set persistence to LOCAL (browser persistence)
// This will keep the user logged in even after page refresh
setPersistence(auth, browserLocalPersistence)
  .then(() => {
    console.log("Firebase: Set persistence to LOCAL");
  })
  .catch((error) => {
    console.error("Firebase: Error setting persistence", error);
  });

// Test Firestore connection
const testFirestore = async () => {
  try {
    console.log("Testing Firestore connection...");
    const testCollection = db.collection("__test_connection__");
    console.log("Firestore connection successful");
  } catch (error) {
    console.error("Firestore connection test failed:", error);
  }
};

// Run test
testFirestore();

export { auth, app, db };