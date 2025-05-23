import { useState, useEffect, useRef } from "react";
import { Mail, Plus, X, Inbox, Loader2, Settings, Tag, RefreshCw, ShieldCheck, MoveRight, Trash2 } from "lucide-react";
import { useUnifiedAuth } from "@/hooks/useUnifiedAuth";
import { Button } from "@/components/ui/button";
import { fetchGmailThreads, categorizeGmailThreads } from "@/lib/gmailApi";
import { 
  getUserCategories, 
  createCustomCategory, 
  deleteCustomCategory,
  initializeUserCategories,
  DEFAULT_EMAIL_CATEGORIES 
} from "@/lib/emailCategories";
import { runAllFirebaseTests, createTestCategory } from "@/lib/firebase-test";
import { testFirestoreRules } from "@/lib/test-firebase-rules";
import { EmailThreadType, EmailCategoryType } from "@shared/schema";
import { Input } from "@/components/ui/input";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";

const EmailView = () => {
  const { user, isAuthenticated, hasOAuthToken } = useUnifiedAuth();
  const { toast } = useToast();
  const [threads, setThreads] = useState<EmailThreadType[]>([]);
  const [categorizedThreads, setCategorizedThreads] = useState<{ category: string, threads: EmailThreadType[] }[]>([]);
  const [categories, setCategories] = useState<EmailCategoryType[]>(DEFAULT_EMAIL_CATEGORIES);
  const [isLoading, setIsLoading] = useState(false);
  const [isCategorizing, setIsCategorizing] = useState(false);
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [newCategoryDialog, setNewCategoryDialog] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryDesc, setNewCategoryDesc] = useState("");
  
  // Refs for category section scrolling
  const categoryRefs = useRef<{[key: string]: HTMLDivElement | null}>({});
  
  // Load user's categories from Firebase
  useEffect(() => {
    const loadUserCategories = async () => {
      if (!user) return;
      
      try {
        console.log("Loading user categories from Firebase...");
        const userCategories = await getUserCategories(user);
        setCategories(userCategories);
        console.log(`Loaded ${userCategories.length} categories`);
      } catch (error) {
        console.error("Error loading user categories:", error);
        // Fall back to default categories
        setCategories(DEFAULT_EMAIL_CATEGORIES);
      }
    };
    
    loadUserCategories();
  }, [user]);
  
  // Fetch threads when user authenticates
  useEffect(() => {
    if (user) {
      fetchEmails();
    }
  }, [user]);
  
  // Fetch email threads from Gmail
  const fetchEmails = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const fetchedThreads = await fetchGmailThreads(200);
      setThreads(fetchedThreads);
      
      // Categorize the threads
      await categorizeEmails(fetchedThreads);
    } catch (error) {
      console.error("Error fetching emails:", error);
      toast({
        title: "Failed to load emails",
        description: "Could not fetch your emails. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Categorize email threads using LLM - with batch processing
  const categorizeEmails = async (emailThreads: EmailThreadType[] = threads) => {
    if (!emailThreads.length) return;
    
    setIsCategorizing(true);
    try {
      // Process only 50 emails at a time to avoid payload size limits
      const batchSize = 50;
      const emailsToProcess = emailThreads.slice(0, batchSize);
      
      // Log all available categories for debugging
      console.log("=== Available Categories for Categorization ===");
      categories.forEach((cat, index) => {
        console.log(`${index + 1}. ${cat.name}: ${cat.description} (isDefault: ${cat.isDefault})`);
      });
      console.log("===============================================");
      
      console.log(`Categorizing ${emailsToProcess.length} emails (out of ${emailThreads.length} total) into ${categories.length} categories`);
      
      // Always ensure we get the latest categories from Firestore
      if (user) {
        try {
          const refreshedCategories = await getUserCategories(user);
          if (refreshedCategories.length > 0) {
            console.log(`Using ${refreshedCategories.length} categories from Firestore`);
            setCategories(refreshedCategories);
            // Use the refreshed categories for this categorization
            const categorized = await categorizeGmailThreads(emailsToProcess, refreshedCategories);
            setCategorizedThreads(categorized);
          } else {
            // Fallback to existing categories
            const categorized = await categorizeGmailThreads(emailsToProcess, categories);
            setCategorizedThreads(categorized);
          }
        } catch (refreshError) {
          console.error("Error refreshing categories, using current ones:", refreshError);
          const categorized = await categorizeGmailThreads(emailsToProcess, categories);
          setCategorizedThreads(categorized);
        }
      } else {
        // No user, use current categories
        const categorized = await categorizeGmailThreads(emailsToProcess, categories);
        setCategorizedThreads(categorized);
      }
      
      // Let the user know we're only processing a subset
      if (emailThreads.length > batchSize) {
        toast({
          title: "Email categorization limited",
          description: `Showing categories for the ${batchSize} most recent emails (out of ${emailThreads.length} total)`,
          variant: "default"
        });
      }
    } catch (error) {
      console.error("Error categorizing emails:", error);
      toast({
        title: "Categorization failed",
        description: "We couldn't automatically categorize your emails. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsCategorizing(false);
    }
  };
  
  // Add a new custom category
  // Test Firebase security rules
  // Function to handle scrolling to category when clicked in sidebar
  const scrollToCategory = (categoryName: string) => {
    if (categoryRefs.current[categoryName]) {
      // Scroll to the element with offset to account for header
      const element = categoryRefs.current[categoryName];
      const headerOffset = 20; // Adjust this offset as needed
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
      
      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  };
  
  // Function to handle moving an email to a different category
  const moveEmailToCategory = (thread: EmailThreadType, fromCategory: string, toCategory: string) => {
    if (fromCategory === toCategory) return;
    
    // Create a copy of the current categorizedThreads
    const updatedCategorizedThreads = [...categorizedThreads];
    
    // Find the source and destination categories
    const sourceCategory = updatedCategorizedThreads.find(cat => cat.category === fromCategory);
    const destCategory = updatedCategorizedThreads.find(cat => cat.category === toCategory);
    
    if (!sourceCategory || !destCategory) {
      toast({
        title: "Move failed",
        description: "Could not find the source or destination category.",
        variant: "destructive"
      });
      return;
    }
    
    // Remove the thread from source category
    const updatedSourceThreads = sourceCategory.threads.filter(t => t.id !== thread.id);
    
    // Add the thread to destination category with updated category property
    const updatedThread = {...thread, category: toCategory};
    const updatedDestThreads = [...destCategory.threads, updatedThread];
    
    // Update the categorizedThreads state
    const newCategorizedThreads = updatedCategorizedThreads.map(cat => {
      if (cat.category === fromCategory) {
        return {...cat, threads: updatedSourceThreads};
      }
      if (cat.category === toCategory) {
        return {...cat, threads: updatedDestThreads};
      }
      return cat;
    });
    
    setCategorizedThreads(newCategorizedThreads);
    
    toast({
      title: "Email moved",
      description: `Email moved from "${fromCategory}" to "${toCategory}".`,
      variant: "default"
    });
  };
  
  // Function to delete a category and redistribute emails with AI
  const deleteCategory = async (categoryId: string) => {
    // Find the category to delete
    const categoryToDelete = categories.find(cat => cat.id === categoryId);
    
    if (!categoryToDelete) {
      toast({
        title: "Delete failed",
        description: "Could not find the category to delete.",
        variant: "destructive"
      });
      return;
    }
    
    // Find all emails in this category
    const categoryThreads = categorizedThreads.find(
      cat => cat.category === categoryToDelete.name
    )?.threads || [];
    
    // Remove the category first
    const updatedCategories = categories.filter(cat => cat.id !== categoryId);
    setCategories(updatedCategories);
    
    // First show a toast to let the user know what's happening
    setIsCategorizing(true);
    toast({
      title: "Category deleted",
      description: `Deleted "${categoryToDelete.name}" and redistributing emails using AI...`,
      variant: "default"
    });
    
    // If there are emails in this category, we need to re-categorize them
    if (categoryThreads.length > 0) {
      try {
        // Get the updated category list without the deleted category
        const remainingCategories = categories.filter(cat => cat.id !== categoryId);
        
        // Re-categorize all threads with the new category list
        // We recategorize ALL threads to ensure consistency
        const recategorized = await categorizeGmailThreads(threads, remainingCategories);
        setCategorizedThreads(recategorized);
        
        toast({
          title: "Emails redistributed",
          description: `${categoryThreads.length} emails from "${categoryToDelete.name}" have been reassigned to other categories.`,
          variant: "default"
        });
      } catch (error) {
        console.error("Error redistributing emails:", error);
        toast({
          title: "Redistribution failed",
          description: "Failed to reassign emails to new categories. Please try again.",
          variant: "destructive"
        });
      } finally {
        setIsCategorizing(false);
      }
    } else {
      setIsCategorizing(false);
      toast({
        title: "Category deleted",
        description: `Category "${categoryToDelete.name}" was deleted.`,
        variant: "default"
      });
    }
    
    // If this is a custom category stored in Firebase, delete it from Firestore
    if (user && !categoryToDelete.isDefault) {
      try {
        // First we'll delete the category from Firestore
        await deleteCustomCategory(user, categoryId);
        console.log(`Successfully deleted category "${categoryToDelete.name}" from Firestore`);
        
        // Then we'll also send a delete request to the server for email redistribution
        const response = await fetch(`/api/gmail/categories/${categoryId}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            threads: threads,
            categories: updatedCategories
          })
        });
        
        if (!response.ok) {
          console.error(`Error deleting category from server: ${response.status}`);
          // Continue anyway since we've already deleted from Firestore and updated the UI
        }
      } catch (error) {
        console.error("Error deleting category:", error);
        
        // Show a toast that the Firestore deletion might have failed
        toast({
          title: "Warning",
          description: "The category might not have been fully removed from your account. Please try again later.",
          variant: "default"
        });
        
        // Continue anyway since we've already updated the UI
      }
    }
  };
  
  const testFirebaseRules = async () => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "You need to be signed in to test Firebase security rules.",
        variant: "destructive"
      });
      return;
    }
    
    setIsCategorizing(true);
    
    try {
      // First verify the ID token is valid
      console.log("Checking Firebase auth status:", user ? "Authenticated" : "Not authenticated");
      console.log("User ID:", user.uid);
      console.log("User email:", user.email);
      
      try {
        // Check if the user token is still valid
        const idTokenResult = await user.getIdTokenResult(true);
        console.log("Token is valid until:", new Date(idTokenResult.expirationTime).toLocaleString());
        console.log("Token issued at:", new Date(idTokenResult.issuedAtTime).toLocaleString());
      } catch (tokenError) {
        console.error("Error refreshing token:", tokenError);
      }
      
      // Now run the comprehensive test
      const testResult = await testFirestoreRules(user);
      
      // Display detailed info about each test
      if (testResult.results) {
        console.log("DETAILED TEST RESULTS:");
        testResult.results.forEach((result, index) => {
          console.log(`Test ${index + 1}:`, {
            path: result.path,
            success: result.read && result.write,
            read: result.read ? "✓" : "✗",
            write: result.write ? "✓" : "✗",
            error: result.error ? result.error.toString() : "None" 
          });
        });
      }
      
      toast({
        title: testResult.success ? "Firebase rules test passed!" : "Firebase rules test failed",
        description: testResult.message,
        variant: testResult.success ? "default" : "destructive"
      });
      
      console.log("Firebase security rules test completed:", testResult);
    } catch (error) {
      console.error("Error testing Firebase security rules:", error);
      
      toast({
        title: "Test failed",
        description: "Could not complete Firebase security rules test. Check console for details.",
        variant: "destructive"
      });
    } finally {
      setIsCategorizing(false);
    }
  };
  
  const addNewCategory = async () => {
    if (newCategoryName.trim() === "" || newCategoryDesc.trim() === "") {
      toast({
        title: "Invalid category",
        description: "Category name and description are required.",
        variant: "destructive"
      });
      return;
    }
    
    // User auth check (Firebase User object required)
    if (!user) {
      toast({
        title: "Authentication required",
        description: "You need to be signed in to create categories.",
        variant: "destructive"
      });
      return;
    }
    
    try {
      // Close the dialog immediately to show the loading UI
      setNewCategoryDialog(false);
      
      // Set both loading states to true to show full-screen loading
      setIsCreatingCategory(true);
      setIsCategorizing(true);
      
      toast({
        title: "Creating category...",
        description: "Creating your new category and updating your emails...",
        variant: "default"
      });
      
      // Generate the clean bucket ID that will be used
      const bucketId = newCategoryName.toLowerCase().replace(/\s+/g, '-');
      console.log(`Creating custom bucket "${newCategoryName}" (ID: ${bucketId})...`);
      
      // First check if user token is valid
      try {
        const idTokenResult = await user.getIdTokenResult(true);
        console.log("Token is valid until:", new Date(idTokenResult.expirationTime).toLocaleString());
      } catch (tokenError) {
        console.error("Token validation error:", tokenError);
        // Continue anyway, token might still work
      }
      
      // Create the bucket in Firestore directly, no pre-tests 
      console.log(`Attempting to create bucket at: users/${user.uid}/customBuckets/${bucketId}`);
      
      // Try direct creation first 
      try {
        const newCategory = await createCustomCategory(
          user,
          newCategoryName,
          newCategoryDesc
        );
        
        console.log("Successfully created bucket in Firestore:", newCategory);
        
        // Add to categories list
        const updatedCategories = [...categories, newCategory];
        setCategories(updatedCategories);
        
        // Always reload emails and re-categorize when adding a new category
        // This ensures we have the most current data and they're properly categorized
        await fetchEmails();
        
        toast({
          title: "Category added",
          description: `New category "${newCategoryName}" has been created and your emails have been reorganized.`,
          variant: "default"
        });
        
        // Clear form data
        setNewCategoryName("");
        setNewCategoryDesc("");
        
        return; // Success path
      } catch (directCreateError) {
        console.error("Error creating bucket directly:", directCreateError);
        // Continue to fallback options
      }
      
      // If direct creation failed, try creating the user document first
      console.log("Direct bucket creation failed. Trying to create user document first...");
      try {
        // Import Firestore functions directly here for robustness
        const { doc, setDoc, serverTimestamp } = await import("firebase/firestore");
        const { db } = await import("@/lib/firebase-setup");
        
        // Create user document first
        const userDocRef = doc(db, "users", user.uid);
        await setDoc(userDocRef, {
          email: user.email,
          displayName: user.displayName,
          updatedAt: serverTimestamp()
        }, { merge: true });
        console.log("User document created/updated successfully");
        
        // Now create the bucket
        const bucketData = {
          name: newCategoryName,
          description: newCategoryDesc,
          createdAt: serverTimestamp()
        };
        
        const bucketRef = doc(db, "users", user.uid, "customBuckets", bucketId);
        await setDoc(bucketRef, bucketData);
        
        console.log("Bucket created successfully through manual process");
        
        // Create a category object for the UI
        const newCategory: EmailCategoryType = {
          id: bucketId,
          name: newCategoryName,
          description: newCategoryDesc,
          isDefault: false,
          color: '#64748B', // default color
          userId: user.uid
        };
        
        // Add to categories list
        const updatedCategories = [...categories, newCategory];
        setCategories(updatedCategories);
        
        // Always do a full refresh to ensure we have the most current data
        await fetchEmails();
        
        toast({
          title: "Category added (fixed method)",
          description: `New category "${newCategoryName}" has been created and your emails have been reorganized.`,
          variant: "default"
        });
        
        // Clear form data
        setNewCategoryName("");
        setNewCategoryDesc("");
        
        return; // Success through alternate method
      } catch (alternativeError) {
        console.error("Alternative bucket creation also failed:", alternativeError);
        // Fall through to the local-only option
        throw alternativeError;
      }
      
    } catch (error) {
      console.error("All bucket creation methods failed:", error);
      
      // Create a local-only category as a last resort
      const localCategory: EmailCategoryType = {
        id: newCategoryName.toLowerCase().replace(/\s+/g, '-'),
        name: newCategoryName,
        description: newCategoryDesc,
        isDefault: false,
        color: '#64748B', // slate (default color)
        userId: user.uid
      };
      
      // Add the local category to the list
      const updatedCategories = [...categories, localCategory];
      setCategories(updatedCategories);
      
      // Still try to categorize emails with the new category
      try {
        await categorizeEmails();
      } catch (categorizationError) {
        console.error("Error categorizing emails after local category creation:", categorizationError);
      }
      
      toast({
        title: "Category added (offline mode)",
        description: `Created "${newCategoryName}" in offline mode. This category may not persist between sessions.`,
        variant: "default"
      });
      
      // Clear form data
      setNewCategoryName("");
      setNewCategoryDesc("");
    } finally {
      // Clear both loading states
      setIsCreatingCategory(false);
      setIsCategorizing(false);
    }
  };
  
  // Render authentication prompt if not logged in
  if (!isAuthenticated || !hasOAuthToken) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 bg-gray-800/60 backdrop-blur-sm">
        <div className="text-center max-w-md p-8 rounded-xl bg-gray-800/80 shadow-lg border border-gray-700">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-purple-900 flex items-center justify-center">
            <Mail className="h-10 w-10 text-purple-400" />
          </div>
          <h2 className="text-2xl font-bold mb-4 text-purple-400">Email Loading</h2>
          <p className="text-gray-300 mb-6">
            We're connecting to your Gmail account. This should only take a moment...
          </p>
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-gray-600 border-t-purple-400 mx-auto"></div>
        </div>
      </div>
    );
  }
  
  // Loading state
  if (isLoading && !threads.length) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 bg-gray-800/60 backdrop-blur-sm">
        <div className="text-center max-w-md p-8 rounded-xl bg-gray-800/80 shadow-lg border border-gray-700">
          <Loader2 className="h-12 w-12 text-purple-400 mx-auto mb-4 animate-spin" />
          <h2 className="text-xl font-bold mb-2 text-purple-400">Loading Emails</h2>
          <p className="text-gray-300">
            Fetching your recent emails. This may take a moment...
          </p>
        </div>
      </div>
    );
  }
  
  // Main email interface with categories
  return (
    <div className="flex flex-col h-full bg-gray-900">
      {/* Email header with actions */}
      <div className="border-b border-gray-800 p-4 flex justify-between items-center">
        <div className="flex items-center">
          <Mail className="h-5 w-5 text-purple-400 mr-2" />
          <h2 className="text-lg font-medium text-white">Smart Inbox</h2>
        </div>
        <div className="flex space-x-2">
          <Button 
            size="sm" 
            variant="outline" 
            onClick={() => fetchEmails()}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button 
            size="sm" 
            variant="outline" 
            onClick={() => setNewCategoryDialog(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            New Category
          </Button>

        </div>
      </div>
      
      {/* Email content area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Categories sidebar */}
        <div className="w-64 border-r border-gray-800 bg-gray-900 p-4 overflow-y-auto">
          <h3 className="text-sm font-medium text-gray-400 mb-3 flex items-center">
            <Tag className="h-4 w-4 mr-2" />
            Categories
          </h3>
          
          <div className="space-y-1">
            {categories.map(category => (
              <div 
                key={category.id}
                className="flex items-center justify-between p-2 rounded-md hover:bg-gray-800 cursor-pointer group"
              >
                <div 
                  className="flex items-center flex-1"
                  onClick={() => scrollToCategory(category.name)}
                >
                  <span 
                    className="h-3 w-3 rounded-full mr-2"
                    style={{ backgroundColor: category.color }}
                  ></span>
                  <span className="text-sm text-gray-300">{category.name}</span>
                </div>
                <div className="flex items-center">
                  <span className="text-xs text-gray-500 mr-2">
                    {categorizedThreads.find(ct => ct.category === category.name)?.threads.length || 0}
                  </span>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity" 
                    onClick={() => deleteCategory(category.id)}
                  >
                    <Trash2 className="h-4 w-4 text-gray-400 hover:text-red-400" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* Email threads content */}
        <div className="flex-1 overflow-y-auto p-4">
          {isCreatingCategory ? (
            <div className="flex flex-col items-center justify-center h-full">
              <Loader2 className="h-10 w-10 text-purple-400 animate-spin mb-4" />
              <h3 className="text-xl font-medium text-white mb-2">Creating New Category</h3>
              <p className="text-gray-400 text-center max-w-md">
                Creating your new email category and refreshing your inbox. 
                This might take a moment...
              </p>
            </div>
          ) : isCategorizing ? (
            <div className="flex flex-col items-center justify-center h-full">
              <Loader2 className="h-8 w-8 text-purple-400 animate-spin mb-4" />
              <p className="text-gray-400">Categorizing your emails with AI...</p>
            </div>
          ) : (
            <div className="space-y-6">
              {categorizedThreads.map(category => (
                <div key={category.category} className="mb-6">
                  <div className="flex items-center mb-2">
                    <span 
                      className="h-3 w-3 rounded-full mr-2"
                      style={{ backgroundColor: categories.find(c => c.name === category.category)?.color || '#6366F1' }}
                    ></span>
                    <h3 className="text-md font-medium text-white">{category.category}</h3>
                    <span className="text-xs text-gray-500 ml-2">
                      {category.threads.length} {category.threads.length === 1 ? 'email' : 'emails'}
                    </span>
                  </div>
                  
                  <div className="space-y-1">
                    {category.threads.length > 0 ? (
                      category.threads.map(thread => (
                        <div 
                          key={thread.id}
                          className="p-3 rounded-md bg-gray-800/50 hover:bg-gray-800 cursor-pointer relative group"
                          ref={el => {
                            // Store a reference to this category section for scrolling
                            if (el && !categoryRefs.current[category.category]) {
                              categoryRefs.current[category.category] = el;
                            }
                          }}
                        >
                          <div className="flex justify-between">
                            <span className="text-sm font-medium text-gray-200">
                              {thread.from?.replace(/<.*>/, '').trim() || 'Unknown Sender'}
                            </span>
                            <div className="flex items-center">
                              <span className="text-xs text-gray-500 mr-2">
                                {new Date(thread.date).toLocaleDateString()}
                              </span>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-6 w-6 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                  >
                                    <MoveRight className="h-4 w-4 text-gray-400" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  {categories
                                    .filter(cat => cat.name !== category.category)
                                    .map(cat => (
                                      <DropdownMenuItem 
                                        key={cat.id}
                                        onClick={() => moveEmailToCategory(thread, category.category, cat.name)}
                                      >
                                        <span 
                                          className="h-2 w-2 rounded-full mr-2"
                                          style={{ backgroundColor: cat.color }}
                                        ></span>
                                        {cat.name}
                                      </DropdownMenuItem>
                                    ))}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </div>
                          <div className="text-sm font-medium text-gray-300 mt-1">{thread.subject || 'No Subject'}</div>
                          <div className="text-xs text-gray-400 mt-1 line-clamp-1">{thread.snippet}</div>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-gray-500 italic">No emails in this category</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      
      {/* New category dialog */}
      <Dialog open={newCategoryDialog} onOpenChange={setNewCategoryDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Category</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label htmlFor="categoryName" className="text-sm font-medium text-gray-400">
                Category Name
              </label>
              <Input
                id="categoryName"
                placeholder="e.g., Work, Personal, Finance"
                value={newCategoryName}
                onChange={e => setNewCategoryName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="categoryDesc" className="text-sm font-medium text-gray-400">
                Description
              </label>
              <Input
                id="categoryDesc"
                placeholder="Describe what types of emails belong in this category"
                value={newCategoryDesc}
                onChange={e => setNewCategoryDesc(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewCategoryDialog(false)}>
              Cancel
            </Button>
            <Button onClick={addNewCategory}>
              Create Category
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EmailView;