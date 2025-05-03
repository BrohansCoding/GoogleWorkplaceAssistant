import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  setPersistence, 
  browserLocalPersistence
} from "firebase/auth";
import { 
  getFirestore, 
  collection, 
  getDocs,
  enableIndexedDbPersistence,
  doc,
  setDoc,
  serverTimestamp
} from "firebase/firestore";

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

// Set persistence to LOCAL (browser persistence)
// This will keep the user logged in even after page refresh
setPersistence(auth, browserLocalPersistence)
  .then(() => {
    console.log("Firebase: Set persistence to LOCAL");
  })
  .catch((error) => {
    console.error("Firebase: Error setting persistence", error);
  });

// Execute this only if configuration is complete
if (missingConfigItems.length === 0) {
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

  // Test Firestore connection
  const testFirestore = async () => {
    try {
      // Test by trying to access a test collection
      const testCollection = collection(db, "test_connection");
      console.log("Firestore: Collection reference created");
      
      try {
        // Try to query the collection - this might fail if it doesn't exist yet
        const testSnapshot = await getDocs(testCollection);
        console.log("Firestore: Test query successful - collection exists with", testSnapshot.size, "documents");
      } catch (queryError: any) {
        console.log("Firestore: Query failed, but that might be expected if collection doesn't exist yet");
        
        // Try to create a test document to confirm write access
        try {
          const testDocRef = doc(testCollection, "test_doc");
          await setDoc(testDocRef, { 
            timestamp: serverTimestamp(),
            test: true 
          });
          console.log("Firestore: Successfully created test document - write access confirmed");
        } catch (writeError: any) {
          console.error("Firestore: Failed to create test document", writeError);
          if (writeError.code === 'permission-denied') {
            console.error("Firestore: Permission denied. Check your Firebase security rules.");
          }
        }
      }
    } catch (error: any) {
      console.error("Firestore connection test failed:", error);
    }
  };

  // Run the test
  testFirestore();
}

export { auth, app, db };