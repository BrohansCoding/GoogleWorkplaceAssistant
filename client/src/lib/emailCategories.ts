import { doc, setDoc, getDoc, collection, getDocs, query, where } from "firebase/firestore";
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
 * Initialize user's email categories in Firestore
 * If no categories exist, creates the default set
 */
export const initializeUserCategories = async (user: User): Promise<EmailCategoryType[]> => {
  if (!user) {
    console.error("Cannot initialize categories: No user provided");
    return DEFAULT_EMAIL_CATEGORIES;
  }

  try {
    // Reference to user's categories collection
    const categoriesRef = collection(db, "users", user.uid, "emailCategories");
    
    // Check if user already has categories
    const categoriesSnapshot = await getDocs(categoriesRef);
    
    // If categories already exist, return them
    if (!categoriesSnapshot.empty) {
      const categories: EmailCategoryType[] = [];
      categoriesSnapshot.forEach(doc => {
        categories.push(doc.data() as EmailCategoryType);
      });
      console.log(`Loaded ${categories.length} existing categories for user ${user.uid}`);
      return categories;
    }
    
    // If no categories exist, create default ones
    console.log(`Creating default categories for new user ${user.uid}`);
    const creationPromises = DEFAULT_EMAIL_CATEGORIES.map(category => 
      setDoc(doc(categoriesRef, category.id), {
        ...category,
        userId: user.uid
      })
    );
    
    await Promise.all(creationPromises);
    console.log(`Created ${DEFAULT_EMAIL_CATEGORIES.length} default categories`);
    
    // Return default categories with userId
    return DEFAULT_EMAIL_CATEGORIES.map(category => ({
      ...category,
      userId: user.uid
    }));
  } catch (error) {
    console.error("Error initializing user categories:", error);
    // Fall back to default categories if Firestore fails
    return DEFAULT_EMAIL_CATEGORIES;
  }
};

/**
 * Create a new custom email category
 * @param user Current authenticated user
 * @param name Category name
 * @param description Category description
 * @param color Optional color for the category (hex code)
 * @returns The newly created category
 */
export const createCustomCategory = async (
  user: User,
  name: string,
  description: string,
  color?: string
): Promise<EmailCategoryType> => {
  console.log("Creating custom category:", { name, description, color });
  
  if (!user) {
    console.error("Cannot create category: No authenticated user");
    throw new Error("Cannot create category: No authenticated user");
  }
  
  console.log("User information:", { 
    uid: user.uid,
    email: user.email,
    isAnonymous: user.isAnonymous
  });
  
  try {
    // Generate a clean ID from the name
    const id = name.toLowerCase().replace(/\s+/g, '-');
    console.log("Generated category ID:", id);
    
    // Create the category object
    const newCategory: EmailCategoryType = {
      id,
      name,
      description,
      isDefault: false,
      color: color || '#64748B', // slate (default color)
      userId: user.uid
    };
    
    console.log("Firebase database reference:", db ? "Available" : "Missing");
    
    // Try an alternative approach
    try {
      console.log("Attempting to write to Firestore using a simpler approach...");
      // First, let's check the key Firebase variables
      console.log("Firebase secrets status:", {
        projectId: !!import.meta.env.VITE_FIREBASE_PROJECT_ID,
        apiKey: !!import.meta.env.VITE_FIREBASE_API_KEY,
        appId: !!import.meta.env.VITE_FIREBASE_APP_ID
      });
      
      // For now, let's use memory storage as a fallback if Firestore fails
      // This isn't ideal but will allow functionality to continue
      try {
        const docRef = doc(db, "users", user.uid, "emailCategories", id);
        console.log("Got document reference:", docRef ? "Yes" : "No");
        
        // Add to Firestore with more error detail
        console.log("Attempting to write to Firestore...");
        await setDoc(docRef, JSON.parse(JSON.stringify(newCategory)));
        console.log(`Created new category "${name}" for user ${user.uid} in Firestore`);
      } catch (error) {
        const firestoreError = error as Error;
        console.error("Firestore error details:", firestoreError.message);
        // Instead of crashing, we'll store it in localStorage as a fallback
        console.log("Using localStorage as temporary fallback");
        const userCategories = JSON.parse(localStorage.getItem(`email_categories_${user.uid}`) || '[]');
        userCategories.push(newCategory);
        localStorage.setItem(`email_categories_${user.uid}`, JSON.stringify(userCategories));
        console.log("Saved to localStorage as fallback");
      }
    } catch (detailedError) {
      console.error("Detailed error during category creation:", detailedError);
      // Don't throw here to allow the operation to continue with localStorage fallback
    }
    
    console.log(`Created new category "${name}" for user ${user.uid}`);
    return newCategory;
  } catch (error) {
    console.error("Error creating custom category:", error);
    throw error;
  }
};

/**
 * Get all categories for a user (custom + default)
 */
export const getUserCategories = async (user: User): Promise<EmailCategoryType[]> => {
  if (!user) {
    console.warn("No authenticated user, returning default categories");
    return DEFAULT_EMAIL_CATEGORIES;
  }
  
  try {
    console.log("Getting categories for user:", user.uid);
    
    // First check localStorage for fallback categories
    try {
      const localStorageKey = `email_categories_${user.uid}`;
      const localData = localStorage.getItem(localStorageKey);
      
      if (localData) {
        const localCategories = JSON.parse(localData) as EmailCategoryType[];
        console.log(`Found ${localCategories.length} categories in localStorage`);
        
        if (localCategories.length > 0) {
          return [...DEFAULT_EMAIL_CATEGORIES, ...localCategories.filter(c => !c.isDefault)];
        }
      }
    } catch (localError) {
      console.error("Error reading from localStorage:", localError);
    }
    
    // Try to get from Firestore
    try {
      const categoriesRef = collection(db, "users", user.uid, "emailCategories");
      const categoriesSnapshot = await getDocs(categoriesRef);
      
      // If categories exist, return them
      if (!categoriesSnapshot.empty) {
        const categories: EmailCategoryType[] = [];
        categoriesSnapshot.forEach(doc => {
          categories.push(doc.data() as EmailCategoryType);
        });
        console.log(`Loaded ${categories.length} categories from Firestore`);
        return categories;
      }
    } catch (firestoreError) {
      console.error("Firestore error getting categories:", firestoreError);
    }
    
    // If no categories found, initialize with defaults
    console.log("No categories found, initializing defaults");
    return initializeUserCategories(user);
  } catch (error) {
    console.error("Error getting user categories:", error);
    // Fall back to default categories if everything fails
    return DEFAULT_EMAIL_CATEGORIES;
  }
};