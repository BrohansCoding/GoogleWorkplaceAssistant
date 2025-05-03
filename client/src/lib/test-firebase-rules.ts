import { 
  doc, 
  setDoc, 
  getDoc, 
  collection, 
  getDocs,
  query,
  where,
  serverTimestamp 
} from "firebase/firestore";
import { db } from "./firebase-setup";
import { User } from "firebase/auth";

/**
 * Tests if Firestore read/write is working with current security rules
 * @param user Firebase user object
 */
export async function testFirestoreRules(user: User | null) {
  console.log("=== TESTING FIREBASE SECURITY RULES ===");
  
  if (!user) {
    console.error("Cannot test: No authenticated user");
    return {
      success: false,
      message: "You need to be logged in to test Firebase security rules"
    };
  }
  
  console.log("User:", user.email);
  console.log("User UID:", user.uid);
  
  // Test collections to try
  const testPaths = [
    // Test user subcollection
    {
      path: `users/${user.uid}/test`,
      id: "test-doc",
      data: { test: true, timestamp: serverTimestamp() }
    },
    // Test email categories
    {
      path: "emailCategories",
      id: `${user.uid}_test-category`,
      data: { 
        name: "Test Category", 
        userId: user.uid,
        timestamp: serverTimestamp()
      }
    },
    // Test direct collection
    {
      path: "test_collection",
      id: user.uid,
      data: { uid: user.uid, timestamp: serverTimestamp() }
    }
  ];
  
  const results = [];
  
  // Try each test path
  for (const testPath of testPaths) {
    try {
      console.log(`\nTesting path: ${testPath.path}`);
      
      // Try writing to the path
      const docRef = doc(db, testPath.path, testPath.id);
      console.log(`- Attempting to write to: ${testPath.path}/${testPath.id}`);
      
      await setDoc(docRef, testPath.data);
      console.log("✓ Write successful");
      
      // Try reading from the path
      console.log(`- Attempting to read from: ${testPath.path}/${testPath.id}`);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        console.log("✓ Read successful");
        results.push({
          path: `${testPath.path}/${testPath.id}`,
          write: true,
          read: true
        });
      } else {
        console.error("✗ Document exists but couldn't be read");
        results.push({
          path: `${testPath.path}/${testPath.id}`,
          write: true,
          read: false
        });
      }
    } catch (error) {
      console.error(`✗ Error with path ${testPath.path}:`, error);
      results.push({
        path: `${testPath.path}/${testPath.id}`,
        write: false,
        read: false,
        error: error
      });
    }
  }
  
  // Summarize results
  const allSuccessful = results.every(r => r.write && r.read);
  
  console.log("\n=== FIREBASE SECURITY RULES TEST RESULTS ===");
  for (const result of results) {
    console.log(`${result.path}: ${result.write && result.read ? "✓ SUCCESS" : "✗ FAILED"}`);
  }
  console.log(`Overall result: ${allSuccessful ? "✓ ALL TESTS PASSED" : "✗ SOME TESTS FAILED"}`);
  
  return {
    success: allSuccessful,
    results,
    message: allSuccessful 
      ? "Firebase security rules are correctly configured! You can now create and access email categories."
      : "Some Firebase security rules tests failed. Please check the console for details."
  };
}