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
 * 
 * Recommended security rules:
 * ```
 * rules_version = '2';
 * service cloud.firestore {
 *   match /databases/{database}/documents {
 *     // Allow authenticated users to read/write their own data
 *     match /users/{userId} {
 *       allow read, write: if request.auth != null && request.auth.uid == userId;
 *       
 *       // Allow users to read/write their own customBuckets
 *       match /customBuckets/{bucketId} {
 *         allow read, write: if request.auth != null && request.auth.uid == userId;
 *       }
 *       
 *       // Allow users to read/write their old emailCategories (for backward compatibility)
 *       match /emailCategories/{categoryId} {
 *         allow read, write: if request.auth != null && request.auth.uid == userId;
 *       }
 *     }
 *   }
 * }
 * ```
 * 
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
    // Test user document
    {
      path: `users`,
      id: user.uid,
      data: { 
        email: user.email,
        displayName: user.displayName,
        timestamp: serverTimestamp() 
      }
    },
    // Test customBuckets subcollection (new structure)
    {
      path: `users/${user.uid}/customBuckets`,
      id: "test-bucket",
      data: { 
        name: "Test Bucket", 
        description: "A test bucket for verifying security rules",
        createdAt: serverTimestamp()
      }
    },
    // Test old email categories subcollection (for backward compatibility)
    {
      path: `users/${user.uid}/emailCategories`,
      id: "test-category",
      data: { 
        name: "Test Category", 
        description: "A test category",
        isDefault: false,
        timestamp: serverTimestamp()
      }
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
      ? "Firebase security rules are correctly configured! You can now create and access custom email buckets."
      : "Some Firebase security rules tests failed. Please check the console for details and update your security rules to match the recommended pattern."
  };
}