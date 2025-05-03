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
import { EmailCategoryType } from "@shared/schema";
import { User } from "firebase/auth";

// Default categories
export const DEFAULT_EMAIL_CATEGORIES: EmailCategoryType[] = [
  {
    id: 'important',
    name: 'Important',
    description: 'Critical emails that require immediate attention, such as urgent requests or time-sensitive information.',
    isDefault: true,
    color: '#EF4444' // red
  },
  {
    id: 'action',
    name: 'Action Required',
    description: 'Emails that need you to do something, like reply, make a decision, or complete a task.',
    isDefault: true,
    color: '#F59E0B' // amber
  },
  {
    id: 'waiting',
    name: 'Can Wait',
    description: 'Lower priority emails that don\'t need immediate attention and can be handled later.',
    isDefault: true,
    color: '#10B981' // emerald
  },
  {
    id: 'newsletter',
    name: 'Newsletter',
    description: 'Subscriptions, updates, and regular communications from websites, companies, or organizations.',
    isDefault: true,
    color: '#6366F1' // indigo
  },
  {
    id: 'auto-archive',
    name: 'Auto-Archive',
    description: 'Automated notifications, receipts, confirmations, and other emails that don\'t need further action.',
    isDefault: true,
    color: '#8B5CF6' // violet
  }
];

/**
 * Initialize user's email category buckets in Firestore
 * If no buckets exist, creates the default set
 */
export const initializeUserCategories = async (user: User): Promise<EmailCategoryType[]> => {
  if (!user) {
    console.error("Cannot initialize buckets: No user provided");
    return DEFAULT_EMAIL_CATEGORIES;
  }

  console.log("Initializing buckets for user:", user.email);

  // Create user document first if it doesn't exist
  try {
    const userDocRef = doc(db, "users", user.uid);
    const userDoc = await getDoc(userDocRef);
    
    if (!userDoc.exists()) {
      console.log("Creating user document first");
      await setDoc(userDocRef, {
        email: user.email,
        displayName: user.displayName,
        createdAt: serverTimestamp()
      });
      console.log("User document created successfully");
    }
  } catch (userDocError) {
    console.warn("Error creating user document:", userDocError);
    // Continue anyway, we'll try again
  }

  // Create buckets in customBuckets subcollection (new structure)
  try {
    console.log("Creating buckets in customBuckets subcollection");
    // Create buckets in user subcollection
    const bucketsRef = collection(db, "users", user.uid, "customBuckets");
    
    const creationPromises = DEFAULT_EMAIL_CATEGORIES.map(category => {
      // Only store name, description, and createdAt as requested
      return setDoc(doc(bucketsRef, category.id), {
        name: category.name,
        description: category.description,
        createdAt: serverTimestamp()
      });
    });
    
    await Promise.all(creationPromises);
    console.log(`Created ${DEFAULT_EMAIL_CATEGORIES.length} default buckets`);
    
    // Return the categories with userId for the UI
    return DEFAULT_EMAIL_CATEGORIES.map(category => ({
      ...category,
      userId: user.uid
    }));
  } catch (error) {
    console.error("Error creating buckets:", error);
    
    // Firebase attempt failed, return default categories for UI
    console.log("Returning default categories (offline mode)");
    return DEFAULT_EMAIL_CATEGORIES.map(category => ({
      ...category,
      userId: user.uid
    }));
  }
};

/**
 * Create a new custom email category bucket
 * @param user Current authenticated user
 * @param name Category/bucket name
 * @param description Category/bucket description
 * @param color Optional color for the category (hex code) - only used in UI, not stored in DB
 * @returns The newly created category
 */
export const createCustomCategory = async (
  user: User,
  name: string,
  description: string,
  color?: string
): Promise<EmailCategoryType> => {
  if (!user) {
    throw new Error("Cannot create bucket: No authenticated user");
  }
  
  console.log("=======================================");
  console.log(`CREATING BUCKET: "${name}"`);
  console.log("User:", user.email);
  console.log("User UID:", user.uid);
  console.log("Description:", description);
  console.log("=======================================");
  
  // Generate a clean ID from the name
  const bucketId = name.toLowerCase().replace(/\s+/g, '-');
  
  // First check current token status
  let idToken;
  try {
    // Refreshing the token to ensure it's up-to-date
    idToken = await user.getIdToken(true);
    const idTokenResult = await user.getIdTokenResult();
    
    console.log("Firebase ID token details:");
    console.log("- Token length:", idToken.length);
    console.log("- Token expiration:", new Date(idTokenResult.expirationTime).toLocaleString());
    console.log("- Is token expired:", new Date() > new Date(idTokenResult.expirationTime));
  } catch (tokenError) {
    console.warn("Could not refresh token:", tokenError);
  }
  
  try {
    console.log(`Bucket creation attempt - Step 1: Checking for user document at "users/${user.uid}"`);
    
    // First ensure the user document exists
    const userDocRef = doc(db, "users", user.uid);
    
    try {
      const userDoc = await getDoc(userDocRef);
      
      if (userDoc.exists()) {
        console.log("User document already exists:", userDoc.data());
      } else {
        console.log("Creating new user document");
        await setDoc(userDocRef, {
          email: user.email,
          displayName: user.displayName,
          createdAt: serverTimestamp(),
          lastAccess: serverTimestamp()
        });
        console.log("User document created successfully");
      }
    } catch (userDocError) {
      console.error("Error handling user document:", userDocError);
      console.log("Continuing anyway to try bucket creation...");
    }
    
    // Now create the bucket document in customBuckets subcollection
    console.log(`Bucket creation attempt - Step 2: Creating bucket in "users/${user.uid}/customBuckets/${bucketId}"`);
    
    const bucketData = {
      name,
      description,
      createdAt: serverTimestamp()
    };
    
    const bucketDocRef = doc(db, "users", user.uid, "customBuckets", bucketId); 
    await setDoc(bucketDocRef, bucketData);
    
    console.log("Bucket document created successfully!");
    
    // Try to verify the bucket was actually created
    try {
      const bucketDoc = await getDoc(bucketDocRef);
      if (bucketDoc.exists()) {
        console.log("✓ Verified bucket exists in Firestore");
      } else {
        console.warn("⚠️ Bucket creation succeeded but document not found on verification");
      }
    } catch (verifyError) {
      console.warn("Could not verify bucket creation:", verifyError);
    }
    
    // Return the complete category object for UI
    return {
      id: bucketId,
      name,
      description,
      isDefault: false,
      color: color || '#64748B', // slate (default color)
      userId: user.uid
    };
  } catch (error: any) {
    console.error("Firebase bucket creation error:", error);
    
    // Log specific details about the error
    if (error && error.code) {
      console.error(`Firebase error code: ${error.code}`);
      
      if (error.code === 'permission-denied') {
        console.error("PERMISSION DENIED ERROR: Your Firebase security rules are preventing bucket creation.");
        console.error("Please make sure your security rules allow writing to the customBuckets subcollection.");
        console.error("Recommended rules:");
        console.error(`
        rules_version = '2';
        service cloud.firestore {
          match /databases/{database}/documents {
            match /users/{userId} {
              allow read, write: if request.auth != null && request.auth.uid == userId;
              
              match /customBuckets/{bucketId} {
                allow read, write: if request.auth != null && request.auth.uid == userId;
              }
            }
          }
        }
        `);
      }
    }
    
    // Generate a local fallback category
    const newCategory: EmailCategoryType = {
      id: bucketId,
      name,
      description,
      isDefault: false,
      color: color || '#64748B',
      userId: user.uid
    };
    
    console.log("Returning local-only bucket object as fallback:", newCategory);
    
    // We're throwing the error to let the caller know there was a problem
    // This way the UI can show appropriate messaging
    throw error;
  }
};

/**
 * Get all category buckets for a user (custom + default)
 */
export const getUserCategories = async (user: User): Promise<EmailCategoryType[]> => {
  if (!user) {
    console.warn("No authenticated user, returning default categories");
    return DEFAULT_EMAIL_CATEGORIES;
  }
  
  console.log("=======================================");
  console.log("GETTING USER CATEGORIES");
  console.log("User:", user.email);
  console.log("User UID:", user.uid);
  console.log("=======================================");
  
  // First ensure token is fresh
  try {
    const idToken = await user.getIdToken(true);
    console.log("Refreshed token, length:", idToken?.length);
  } catch (tokenError) {
    console.warn("Could not refresh token but continuing anyway:", tokenError);
  }
  
  try {
    // First check if the user document exists
    console.log("Step 1: Checking if user document exists");
    const userDocRef = doc(db, "users", user.uid);
    let userExists = false;
    
    try {
      const userDocSnap = await getDoc(userDocRef);
      userExists = userDocSnap.exists();
      console.log("User document exists:", userExists);
      
      if (userExists) {
        console.log("User document data:", userDocSnap.data());
      }
    } catch (userDocError: any) {
      console.error("Error checking user document:", userDocError?.code || userDocError);
    }
    
    // Try getting from customBuckets subcollection (new structure)
    console.log("Step 2: Checking customBuckets subcollection");
    console.log(`Path: users/${user.uid}/customBuckets`);
    
    try {
      const bucketsRef = collection(db, "users", user.uid, "customBuckets");
      const bucketsSnapshot = await getDocs(bucketsRef);
      
      console.log("Query executed, empty:", bucketsSnapshot.empty);
      console.log("Document count:", bucketsSnapshot.size);
      
      if (!bucketsSnapshot.empty) {
        const categories: EmailCategoryType[] = [];
        
        // Log details about each bucket found
        bucketsSnapshot.forEach((doc, index) => {
          console.log(`Bucket ${index + 1}:`);
          console.log("- Document ID:", doc.id);
          
          const data = doc.data();
          console.log("- Data:", data);
          
          // Find a matching default category to get a color
          const matchingDefault = DEFAULT_EMAIL_CATEGORIES.find(
            c => c.name.toLowerCase() === data.name?.toLowerCase()
          );
          
          // Create category object for UI
          categories.push({
            id: doc.id,
            name: data.name || doc.id,
            description: data.description || "No description available",
            isDefault: false,
            color: matchingDefault?.color || '#64748B', // Get color from defaults or use slate
            userId: user.uid
          });
        });
        
        console.log(`✓ Successfully loaded ${categories.length} custom buckets`);
        return categories;
      } else {
        console.log("No custom buckets found in customBuckets subcollection");
      }
    } catch (bucketsError: any) {
      console.error("Error accessing customBuckets:", bucketsError?.code || bucketsError);
      
      // Check specifically for permission errors
      if (bucketsError?.code === 'permission-denied') {
        console.error("PERMISSION DENIED: Firebase security rules are preventing access to customBuckets");
        console.error("Please update your security rules to allow access to customBuckets subcollection");
      }
    }
    
    // Fallback: check in old emailCategories location
    console.log("Step 3: Fallback - Checking emailCategories subcollection");
    try {
      const categoriesRef = collection(db, "users", user.uid, "emailCategories");
      const categoriesSnapshot = await getDocs(categoriesRef);
      
      console.log("Old categories query executed, empty:", categoriesSnapshot.empty);
      console.log("Old categories document count:", categoriesSnapshot.size);
      
      if (!categoriesSnapshot.empty) {
        const categories: EmailCategoryType[] = [];
        
        categoriesSnapshot.forEach((doc, index) => {
          console.log(`Old category ${index + 1}:`, doc.id);
          const data = doc.data();
          
          categories.push({
            id: doc.id,
            name: data.name || doc.id,
            description: data.description || "No description available",
            isDefault: data.isDefault || false,
            color: data.color || '#64748B',
            userId: user.uid
          });
        });
        
        console.log(`Loaded ${categories.length} categories from old subcollection`);
        return categories;
      }
    } catch (subCollectionError: any) {
      console.warn("Error accessing old subcollection:", subCollectionError?.code || subCollectionError);
    }
    
    // If we get here, no categories were found in either location
    console.log("Step 4: No buckets found, initializing defaults");
    return initializeUserCategories(user);
  } catch (error: any) {
    console.error("All attempts to get buckets failed:", error?.code || error);
    
    // Always fall back to default categories if everything fails
    console.log("Returning default categories as last resort");
    return DEFAULT_EMAIL_CATEGORIES;
  }
};