import { useState, useEffect } from "react";
import { Mail, Plus, X, Inbox, Loader2, Settings, Tag, RefreshCw } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import EmailAuthButton from "./EmailAuthButton";
import { Button } from "@/components/ui/button";
import { fetchGmailThreads, categorizeGmailThreads } from "@/lib/gmailApi";
import { 
  getUserCategories, 
  createCustomCategory, 
  initializeUserCategories,
  DEFAULT_EMAIL_CATEGORIES 
} from "@/lib/emailCategories";
import { EmailThreadType, EmailCategoryType } from "@shared/schema";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

const EmailView = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [threads, setThreads] = useState<EmailThreadType[]>([]);
  const [categorizedThreads, setCategorizedThreads] = useState<{ category: string, threads: EmailThreadType[] }[]>([]);
  const [categories, setCategories] = useState<EmailCategoryType[]>(DEFAULT_EMAIL_CATEGORIES);
  const [isLoading, setIsLoading] = useState(false);
  const [isCategorizing, setIsCategorizing] = useState(false);
  const [newCategoryDialog, setNewCategoryDialog] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryDesc, setNewCategoryDesc] = useState("");
  
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
      
      console.log(`Categorizing ${emailsToProcess.length} emails (out of ${emailThreads.length} total)`);
      
      const categorized = await categorizeGmailThreads(emailsToProcess, categories);
      setCategorizedThreads(categorized);
      
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
  const addNewCategory = async () => {
    if (newCategoryName.trim() === "" || newCategoryDesc.trim() === "") {
      toast({
        title: "Invalid category",
        description: "Category name and description are required.",
        variant: "destructive"
      });
      return;
    }
    
    if (!user) {
      toast({
        title: "Authentication required",
        description: "You need to be signed in to create categories.",
        variant: "destructive"
      });
      return;
    }
    
    try {
      setIsCategorizing(true);
      
      // Create the new category in Firebase
      const newCategory = await createCustomCategory(
        user,
        newCategoryName,
        newCategoryDesc
      );
      
      // Add to categories list
      const updatedCategories = [...categories, newCategory];
      setCategories(updatedCategories);
      
      // Re-categorize all threads with the new category set
      await categorizeEmails();
      
      // Reset and close dialog
      setNewCategoryName("");
      setNewCategoryDesc("");
      setNewCategoryDialog(false);
      
      toast({
        title: "Category added",
        description: `New category "${newCategoryName}" has been created and your emails have been reorganized.`,
        variant: "default"
      });
    } catch (error) {
      console.error("Error creating category:", error);
      toast({
        title: "Error creating category",
        description: "There was a problem creating your category. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsCategorizing(false);
    }
  };
  
  // Render authentication prompt if not logged in
  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 bg-gray-800/60 backdrop-blur-sm">
        <div className="text-center max-w-md p-8 rounded-xl bg-gray-800/80 shadow-lg border border-gray-700">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-purple-900 flex items-center justify-center">
            <Mail className="h-10 w-10 text-purple-400" />
          </div>
          <h2 className="text-2xl font-bold mb-4 text-purple-400">Email Integration</h2>
          <p className="text-gray-300 mb-6">
            Connect your Gmail account to access your emails and enable AI-powered email categorization.
          </p>
          <EmailAuthButton onAuthSuccess={fetchEmails} />
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
                <div className="flex items-center">
                  <span 
                    className="h-3 w-3 rounded-full mr-2"
                    style={{ backgroundColor: category.color }}
                  ></span>
                  <span className="text-sm text-gray-300">{category.name}</span>
                </div>
                <span className="text-xs text-gray-500">
                  {categorizedThreads.find(ct => ct.category === category.name)?.threads.length || 0}
                </span>
              </div>
            ))}
          </div>
        </div>
        
        {/* Email threads content */}
        <div className="flex-1 overflow-y-auto p-4">
          {isCategorizing ? (
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
                          className="p-3 rounded-md bg-gray-800/50 hover:bg-gray-800 cursor-pointer"
                        >
                          <div className="flex justify-between">
                            <span className="text-sm font-medium text-gray-200">
                              {thread.from?.replace(/<.*>/, '').trim() || 'Unknown Sender'}
                            </span>
                            <span className="text-xs text-gray-500">
                              {new Date(thread.date).toLocaleDateString()}
                            </span>
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