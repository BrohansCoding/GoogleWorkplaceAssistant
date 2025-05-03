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
  
  console.log("Creating custom bucket with user:", user.email);
  console.log("User UID:", user.uid);
  
  try {
    // Generate a clean ID from the name
    const bucketId = name.toLowerCase().replace(/\s+/g, '-');
    
    try {
      // First try creating user document if it doesn't exist
      const userDocRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userDocRef);
      
      if (!userDoc.exists()) {
        console.log("User document doesn't exist, creating it first");
        await setDoc(userDocRef, {
          email: user.email,
          displayName: user.displayName,
          createdAt: serverTimestamp()
        });
        console.log("User document created");
      }
      
      // Now create the bucket document in customBuckets subcollection (instead of emailCategories)
      // Only storing name, description, and createdAt as requested
      await setDoc(
        doc(db, "users", user.uid, "customBuckets", bucketId), 
        {
          name,
          description,
          createdAt: serverTimestamp()
        }
      );
      
      console.log(`Created new bucket "${name}" for user ${user.uid}`);
      
      // Return the complete category object for UI
      return {
        id: bucketId,
        name,
        description,
        isDefault: false,
        color: color || '#64748B', // slate (default color)
        userId: user.uid
      };
    } catch (innerError) {
      console.error("Detailed Firestore error:", innerError);
      throw innerError;
    }
  } catch (error) {
    console.error("Failed to create bucket:", error);
    
    // Return the category object anyway for UI, but store it locally
    // This way the UI still works even if Firebase storage fails
    const newCategory: EmailCategoryType = {
      id: name.toLowerCase().replace(/\s+/g, '-'),
      name,
      description,
      isDefault: false,
      color: color || '#64748B',
      userId: user.uid
    };
    
    console.log("Returning local bucket object:", newCategory);
    return newCategory;
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
  
  console.log("Getting category buckets for user:", user.email);
  
  try {
    // First try getting from customBuckets subcollection (new structure)
    console.log("Checking customBuckets subcollection");
    const bucketsRef = collection(db, "users", user.uid, "customBuckets");
    
    try {
      const bucketsSnapshot = await getDocs(bucketsRef);
      
      if (!bucketsSnapshot.empty) {
        const categories: EmailCategoryType[] = [];
        
        bucketsSnapshot.forEach(doc => {
          const data = doc.data();
          
          // Find a matching default category to get a color
          const matchingDefault = DEFAULT_EMAIL_CATEGORIES.find(
            c => c.name.toLowerCase() === data.name.toLowerCase()
          );
          
          // Create category object for UI
          categories.push({
            id: doc.id,
            name: data.name,
            description: data.description,
            isDefault: false,
            color: matchingDefault?.color || '#64748B', // Get color from defaults or use slate
            userId: user.uid
          });
        });
        
        console.log(`Loaded ${categories.length} custom buckets`);
        return categories;
      }
    } catch (bucketsError) {
      console.warn("Error accessing customBuckets:", bucketsError);
    }
    
    // Fallback: check in old emailCategories location
    console.log("Fallback: Checking emailCategories subcollection");
    try {
      const categoriesRef = collection(db, "users", user.uid, "emailCategories");
      const categoriesSnapshot = await getDocs(categoriesRef);
      
      if (!categoriesSnapshot.empty) {
        const categories: EmailCategoryType[] = [];
        categoriesSnapshot.forEach(doc => {
          categories.push(doc.data() as EmailCategoryType);
        });
        console.log(`Loaded ${categories.length} categories from old subcollection`);
        return categories;
      }
    } catch (subCollectionError) {
      console.warn("Error accessing old subcollection:", subCollectionError);
    }
    
    // If we get here, no categories were found in either location
    console.log("No buckets found, initializing defaults");
    return initializeUserCategories(user);
  } catch (error) {
    console.error("All attempts to get buckets failed:", error);
    // Always fall back to default categories if everything fails
    return DEFAULT_EMAIL_CATEGORIES;
  }
};