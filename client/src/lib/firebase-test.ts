import { 
  doc, 
  getDoc, 
  setDoc, 
  collection,
  getDocs
} from "firebase/firestore";
import { db } from "./firebase-setup";
import { User } from "firebase/auth";

/**
 * Tests writing to Firestore by creating a basic document
 * @param user Firebase user object
 */
export async function testFirebaseWrite(user: User | null): Promise<boolean> {
  if (!user) {
    console.error("Cannot test Firebase write: No user provided");
    return false;
  }

  console.log("Testing Firebase write with user:", user.email);
  
  try {
    // Create a test document in a 'test' collection
    const testDocRef = doc(db, "test_collection", user.uid);
    
    // Set document data
    await setDoc(testDocRef, {
      email: user.email,
      uid: user.uid,
      timestamp: new Date().toISOString(),
      test: true
    });
    
    console.log("Firebase write test: Success - created test document");
    return true;
  } catch (error) {
    console.error("Firebase write test: Failed", error);
    return false;
  }
}

/**
 * Tests reading from Firestore by reading user's test document
 * @param user Firebase user object 
 */
export async function testFirebaseRead(user: User | null): Promise<boolean> {
  if (!user) {
    console.error("Cannot test Firebase read: No user provided");
    return false;
  }
  
  console.log("Testing Firebase read with user:", user.email);
  
  try {
    // Try to read the test document
    const testDocRef = doc(db, "test_collection", user.uid);
    const testDoc = await getDoc(testDocRef);
    
    if (testDoc.exists()) {
      console.log("Firebase read test: Success - document exists with data:", testDoc.data());
      return true;
    } else {
      console.log("Firebase read test: Document doesn't exist yet");
      return false;
    }
  } catch (error) {
    console.error("Firebase read test: Failed", error);
    return false;
  }
}

/**
 * Creates a test email category directly without any complex logic
 * @param user Firebase user object
 */
export async function createTestCategory(user: User | null): Promise<boolean> {
  if (!user) {
    console.error("Cannot create test category: No user provided");
    return false;
  }
  
  console.log("Creating test category with user:", user.email);
  
  try {
    // Create a test category document
    const categoryDocRef = doc(db, "email_categories", "test_" + user.uid);
    
    // Set simple category data
    await setDoc(categoryDocRef, {
      id: "test-category",
      name: "Test Category",
      description: "A test category created to verify Firestore write access",
      userId: user.uid,
      createdAt: new Date().toISOString()
    });
    
    console.log("Test category created successfully");
    return true;
  } catch (error) {
    console.error("Failed to create test category:", error);
    return false;
  }
}

/**
 * Run all Firebase tests in sequence
 * @param user Firebase user object
 */
export async function runAllFirebaseTests(user: User | null): Promise<boolean> {
  if (!user) {
    console.error("Cannot run Firebase tests: No user provided");
    return false;
  }
  
  console.log("=== RUNNING FIREBASE TESTS ===");
  console.log("User:", user.email);
  console.log("User UID:", user.uid);
  
  let writeSuccess = false;
  let readSuccess = false;
  let categorySuccess = false;
  
  // Test write
  try {
    writeSuccess = await testFirebaseWrite(user);
    console.log("Write test result:", writeSuccess ? "SUCCESS" : "FAILED");
  } catch (error) {
    console.error("Write test error:", error);
  }
  
  // Test read
  try {
    readSuccess = await testFirebaseRead(user);
    console.log("Read test result:", readSuccess ? "SUCCESS" : "FAILED");
  } catch (error) {
    console.error("Read test error:", error);
  }
  
  // Test category creation
  try {
    categorySuccess = await createTestCategory(user);
    console.log("Category test result:", categorySuccess ? "SUCCESS" : "FAILED");
  } catch (error) {
    console.error("Category test error:", error);
  }
  
  const allSuccess = writeSuccess && readSuccess && categorySuccess;
  console.log("=== FIREBASE TESTS COMPLETE ===");
  console.log("Overall result:", allSuccess ? "SUCCESS" : "FAILED");
  
  if (!allSuccess) {
    console.log("\n=== FIREBASE SECURITY RULES INFO ===");
    console.log("If you're experiencing 'permission-denied' errors, you may need to update your Firebase security rules.");
    console.log("For testing purposes, consider these permissive rules in the Firebase console:");
    console.log(`
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow authenticated users to read/write their own data
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Allow authenticated users to read/write their categories
    match /emailCategories/{document} {
      allow read, write: if request.auth != null;
    }
    
    // Allow authenticated users to read/write test collections
    match /test_collection/{document} {
      allow read, write: if request.auth != null;
    }
  }
}
    `);
  }
  
  return allSuccess;
}