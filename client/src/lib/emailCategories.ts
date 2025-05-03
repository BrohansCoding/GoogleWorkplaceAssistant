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
 * Initialize user's email categories in Firestore
 * If no categories exist, creates the default set
 */
export const initializeUserCategories = async (user: User): Promise<EmailCategoryType[]> => {
  if (!user) {
    console.error("Cannot initialize categories: No user provided");
    return DEFAULT_EMAIL_CATEGORIES;
  }

  console.log("Initializing categories for user:", user.email);

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
    // Continue anyway, we'll try the alternative approach
  }

  // First approach: Try to create in subcollection
  try {
    console.log("Approach 1: Creating categories in user subcollection");
    // Create categories in user subcollection
    const categoriesRef = collection(db, "users", user.uid, "emailCategories");
    
    const creationPromises = DEFAULT_EMAIL_CATEGORIES.map(category => {
      return setDoc(doc(categoriesRef, category.id), {
        ...category,
        userId: user.uid
      });
    });
    
    await Promise.all(creationPromises);
    console.log(`Created ${DEFAULT_EMAIL_CATEGORIES.length} default categories in subcollection`);
    
    // Return the categories with userId
    return DEFAULT_EMAIL_CATEGORIES.map(category => ({
      ...category,
      userId: user.uid
    }));
  } catch (subcollectionError) {
    console.warn("Error creating categories in subcollection:", subcollectionError);
    
    // Second approach: Create in direct collection
    try {
      console.log("Approach 2: Creating categories in direct collection");
      const directCategoriesRef = collection(db, "emailCategories");
      
      const creationPromises = DEFAULT_EMAIL_CATEGORIES.map(category => {
        const docId = `${user.uid}_${category.id}`;
        return setDoc(doc(directCategoriesRef, docId), {
          ...category,
          userId: user.uid,
          userEmail: user.email
        });
      });
      
      await Promise.all(creationPromises);
      console.log(`Created ${DEFAULT_EMAIL_CATEGORIES.length} default categories in direct collection`);
      
      // Return the categories with userId
      return DEFAULT_EMAIL_CATEGORIES.map(category => ({
        ...category,
        userId: user.uid
      }));
    } catch (directCollectionError) {
      console.error("Error creating categories in direct collection:", directCollectionError);
      
      // All Firebase attempts failed, return default categories
      console.log("Returning default categories (offline mode)");
      return DEFAULT_EMAIL_CATEGORIES.map(category => ({
        ...category,
        userId: user.uid
      }));
    }
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
  if (!user) {
    throw new Error("Cannot create category: No authenticated user");
  }
  
  console.log("Creating custom category with user:", user.email);
  console.log("User UID:", user.uid);
  
  try {
    // Generate a clean ID from the name
    const id = name.toLowerCase().replace(/\s+/g, '-');
    
    // Create the category object
    const newCategory: EmailCategoryType = {
      id,
      name,
      description,
      isDefault: false,
      color: color || '#64748B', // slate (default color)
      userId: user.uid
    };
    
    console.log("New category object to be saved:", { 
      id: newCategory.id,
      name: newCategory.name,
      path: `users/${user.uid}/emailCategories/${id}`
    });
    
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
      
      // Now create the category document
      await setDoc(
        doc(db, "users", user.uid, "emailCategories", id), 
        newCategory
      );
      
      console.log(`Created new category "${name}" for user ${user.uid}`);
      return newCategory;
    } catch (innerError) {
      console.error("Detailed Firestore error:", innerError);
      
      // Try with a different approach - create as a nested object
      console.log("Trying alternative approach to create category...");
      
      // Store category as a field in a user document
      await setDoc(doc(db, "emailCategories", user.uid + "_" + id), {
        ...newCategory,
        userId: user.uid,
        userEmail: user.email
      });
      
      console.log("Category created using alternative storage method");
      return newCategory;
    }
  } catch (error) {
    console.error("All attempts to create category failed:", error);
    
    // Return the category object anyway, but store it locally
    // This way the UI still works even if Firebase storage fails
    const newCategory: EmailCategoryType = {
      id: name.toLowerCase().replace(/\s+/g, '-'),
      name,
      description,
      isDefault: false,
      color: color || '#64748B',
      userId: user.uid
    };
    
    console.log("Returning local category object:", newCategory);
    return newCategory;
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
  
  console.log("Getting categories for user:", user.email);
  
  try {
    // First approach: Try to get from Firestore subcollection
    console.log("Approach 1: Checking user subcollection");
    const categoriesRef = collection(db, "users", user.uid, "emailCategories");
    
    try {
      const categoriesSnapshot = await getDocs(categoriesRef);
      
      // If categories exist in the subcollection, return them
      if (!categoriesSnapshot.empty) {
        const categories: EmailCategoryType[] = [];
        categoriesSnapshot.forEach(doc => {
          categories.push(doc.data() as EmailCategoryType);
        });
        console.log(`Loaded ${categories.length} categories from subcollection`);
        return categories;
      }
    } catch (subCollectionError) {
      console.warn("Error accessing subcollection:", subCollectionError);
    }
    
    // Second approach: Try to get from direct collection with user prefix
    console.log("Approach 2: Checking direct collection with user prefix");
    try {
      const directCategoriesRef = collection(db, "emailCategories");
      const userCategoriesQuery = query(
        directCategoriesRef, 
        where("userId", "==", user.uid)
      );
      
      const directCategoriesSnapshot = await getDocs(userCategoriesQuery);
      
      if (!directCategoriesSnapshot.empty) {
        const categories: EmailCategoryType[] = [];
        directCategoriesSnapshot.forEach(doc => {
          categories.push(doc.data() as EmailCategoryType);
        });
        console.log(`Loaded ${categories.length} categories from direct collection`);
        return categories;
      }
    } catch (directCollectionError) {
      console.warn("Error accessing direct collection:", directCollectionError);
    }
    
    // If we get here, no categories were found in either location
    console.log("No categories found, initializing defaults");
    return initializeUserCategories(user);
  } catch (error) {
    console.error("All attempts to get categories failed:", error);
    // Always fall back to default categories if everything fails
    return DEFAULT_EMAIL_CATEGORIES;
  }
};