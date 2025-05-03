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
  if (!user) {
    throw new Error("Cannot create category: No authenticated user");
  }
  
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
    
    // Add to Firestore
    await setDoc(
      doc(db, "users", user.uid, "emailCategories", id), 
      newCategory
    );
    
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
    // First, try to get from Firestore
    const categoriesRef = collection(db, "users", user.uid, "emailCategories");
    const categoriesSnapshot = await getDocs(categoriesRef);
    
    // If categories exist, return them
    if (!categoriesSnapshot.empty) {
      const categories: EmailCategoryType[] = [];
      categoriesSnapshot.forEach(doc => {
        categories.push(doc.data() as EmailCategoryType);
      });
      console.log(`Loaded ${categories.length} categories for user ${user.uid}`);
      return categories;
    }
    
    // If no categories found, initialize with defaults
    return initializeUserCategories(user);
  } catch (error) {
    console.error("Error getting user categories:", error);
    // Fall back to default categories if Firestore fails
    return DEFAULT_EMAIL_CATEGORIES;
  }
};