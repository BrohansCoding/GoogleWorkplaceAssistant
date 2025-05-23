import type { Express, Request, Response } from "express";
import { GmailCategorizeRequest } from "@shared/schema";
import { fetchGmailThreads, categorizeThreadsWithGroq, GmailThread } from "./gmailApi";
import { getGroqCompletion, getGroqEmailCategorization } from "./groqApi";

/**
 * Register Gmail-related routes
 * @param app Express application
 */
export function registerGmailRoutes(app: Express): void {
  // Gmail threads endpoint - Get threads and messages
  app.get("/api/gmail/threads", async (req: Request, res: Response) => {
    try {
      const { maxResults = "100" } = req.query;
      
      // Get token from session
      const token = (req.session as any)?.googleApiToken || (req.session as any)?.googleToken as string | undefined;
      
      if (!token) {
        return res.status(401).json({ 
          message: "Authentication required. Please sign in again.",
          code: "AUTH_REQUIRED"
        });
      }
      
      // Fetch Gmail threads with improved rate limiting handling
      console.log("Fetching Gmail threads with rate limit handling...");
      console.log(`Max results requested: ${maxResults}`);
      
      // Limit max results to a reasonable number
      const limitedMaxResults = Math.min(parseInt(maxResults as string), 200);
      console.log(`Using limited max results: ${limitedMaxResults}`);
      
      try {
        const threads = await fetchGmailThreads(token, limitedMaxResults);
        
        // Convert GmailThread to EmailThreadType format
        const emailThreads = threads.map((thread: any) => {
          // Extract email properties from the thread
          return {
            id: thread.id,
            threadId: thread.id,
            snippet: thread.snippet || '',
            subject: (thread as any).subject || '(No Subject)',
            from: (thread as any).from || '',
            date: (thread as any).date || new Date().toISOString(),
            messages: thread.messages?.map((message: any) => ({
              id: message.id,
              threadId: message.threadId,
              snippet: message.snippet || '',
              payload: message.payload,
              labelIds: message.labelIds,
              internalDate: message.internalDate
            })) || [],
            labelIds: thread.messages?.[0]?.labelIds || []
          };
        });
        
        console.log(`Successfully processed ${emailThreads.length} email threads`);
        
        return res.status(200).json({ 
          threads: emailThreads,
          count: emailThreads.length,
          status: "success"
        });
      } catch (fetchError: any) {
        // Check specifically for rate limiting errors
        if (fetchError.isAxiosError && fetchError.response && fetchError.response.status === 429) {
          console.log("Rate limit reached on Gmail API, returning specific error");
          return res.status(429).json({
            message: "Rate limit reached. Please try again in a moment.",
            code: "RATE_LIMIT_REACHED",
            error: fetchError.message
          });
        }
        
        // If token is expired or invalid
        if (fetchError.isAxiosError && fetchError.response && 
            (fetchError.response.status === 401 || fetchError.response.status === 403)) {
          console.log("Authentication error with Gmail API, token may be expired");
          return res.status(401).json({
            message: "Your Gmail authentication has expired. Please sign in again.",
            code: "AUTH_EXPIRED",
            error: fetchError.message
          });
        }
        
        // Re-throw for general handling
        throw fetchError;
      }
    } catch (error) {
      console.error("Error fetching Gmail threads:", error);
      
      // Provide a more user-friendly error message
      return res.status(500).json({ 
        message: "We had trouble fetching your emails. Please try again in a moment.",
        error: error instanceof Error ? error.message : String(error),
        code: "GMAIL_FETCH_ERROR"
      });
    }
  });
  
  // Gmail categorize endpoint - Categorize threads using Groq
  app.post("/api/gmail/categorize", async (req: Request, res: Response) => {
    try {
      const { threads, categories, customPrompt } = req.body as GmailCategorizeRequest;
      
      if (!threads || !threads.length || !categories || !categories.length) {
        return res.status(400).json({ message: "Threads and categories are required" });
      }
      
      // Get token from session
      const token = (req.session as any)?.googleApiToken || (req.session as any)?.googleToken as string | undefined;
      
      if (!token) {
        return res.status(401).json({ 
          message: "Authentication required",
          code: "AUTH_REQUIRED"
        });
      }
      
      // Limit the number of threads to process to avoid payload size issues
      const maxThreads = 50; 
      const threadsToProcess = threads.length > maxThreads ? threads.slice(0, maxThreads) : threads;
      
      console.log(`Categorizing ${threadsToProcess.length} threads into ${categories.length} categories`);
      
      // Format categories for Groq API - preserve isDefault flag
      let categoriesConfig = categories.map(cat => ({
        name: cat.name,
        description: cat.description,
        isDefault: cat.isDefault === false ? false : true // Ensure custom buckets have isDefault: false
      }));
      
      try {
        // Enhanced approach: Categorize threads using Groq with retry mechanism
        // Now with special handling for custom categories
        const rawCategorizedThreads = await categorizeThreadsWithGroq(
          threadsToProcess,
          categoriesConfig,
          // Pass the enhanced Groq completion function
          async (messages: any[]) => {
            try {
              console.log("Sending request to Groq AI for categorization with custom prompt");
              
              // Use the specialized email categorization function with more AI guidance
              // for custom categories
              return await getGroqEmailCategorization(
                "You are an AI assistant that specializes in email categorization with a focus on custom categories. " +
                "Your PRIMARY RESPONSIBILITY is to categorize emails into user-defined custom categories first, " +
                "and only use default categories when there is absolutely no match with custom categories. " +
                "Custom categories are marked with IsCustom: YES - these are HIGH PRIORITY and should be used " +
                "when the email content contains exact keywords from the category name or description. " +
                "Always prioritize exact keyword matching for best categorization performance. " +
                "Remember, the user specifically created these custom categories for their emails, " +
                "so they should be favored over default categories whenever possible.",
                messages
              );
            } catch (groqError: any) {
              // Check if it's a rate limit error
              if (groqError.status === 429 || (groqError.response && groqError.response.status === 429)) {
                console.log("Rate limit hit, waiting before retry...");
                // Wait 2 seconds and try again
                await new Promise(resolve => setTimeout(resolve, 2000));
                // Use specialized function for the retry as well
                return await getGroqEmailCategorization(
                  "You are an AI assistant that specializes in email categorization with a focus on custom categories. " +
                  "Your PRIMARY RESPONSIBILITY is to categorize emails into user-defined custom categories first, " +
                  "and only use default categories when there is absolutely no match with custom categories. " +
                  "Custom categories are marked with IsCustom: YES - these are HIGH PRIORITY and should be used " +
                  "when the email content contains exact keywords from the category name or description. " +
                  "Always prioritize exact keyword matching for best categorization performance. " +
                  "Remember, the user specifically created these custom categories for their emails, " +
                  "so they should be favored over default categories whenever possible.",
                  messages
                );
              }
              throw groqError; // Re-throw if it's not a rate limit error
            }
          },
          customPrompt
        );
        
        // Format the categorized threads to ensure they match the EmailThreadType structure
        const categorizedThreads = rawCategorizedThreads.map(categoryGroup => ({
          category: categoryGroup.category,
          threads: categoryGroup.threads.map((thread: any) => ({
            id: thread.id,
            threadId: thread.threadId || thread.id,
            snippet: thread.snippet || '',
            subject: thread.subject || '(No Subject)',
            from: thread.from || '',
            date: thread.date || new Date().toISOString(),
            category: categoryGroup.category,
            messages: thread.messages || []
          }))
        }));
        
        return res.status(200).json({ 
          categorizedThreads,
          totalThreads: threadsToProcess.length,
          categories: categories.map(c => c.name)
        });
      } catch (groqError) {
        console.error("Error with Groq API:", groqError);
        
        // Handle specific error types
        if (typeof groqError === 'object' && groqError !== null && 
            ('status' in groqError && (groqError as any).status === 429 || 
             'response' in groqError && (groqError as any).response && (groqError as any).response.status === 429)) {
          return res.status(429).json({
            message: "Rate limit exceeded for AI categorization. Please try again in a moment.",
            code: "RATE_LIMIT_EXCEEDED"
          });
        }
        
        throw groqError; // Re-throw for general handling
      }
    } catch (error: any) {
      console.error("Error categorizing Gmail threads:", error);
      
      // Check for payload size issues
      if ((error && error.type === 'entity.too.large') || 
          (error instanceof Error && error.message.includes('request entity too large'))) {
        return res.status(413).json({
          message: "Too many emails to process at once. Try with fewer emails.",
          code: "PAYLOAD_TOO_LARGE"
        });
      }
      
      return res.status(500).json({ 
        message: "Failed to categorize Gmail threads",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  // Delete a category and use AI to redistribute emails to remaining categories
  app.delete("/api/gmail/categories/:categoryId", async (req: Request, res: Response) => {
    try {
      const { categoryId } = req.params;
      const { threads, categories } = req.body;
      
      if (!categoryId || !threads || !categories) {
        return res.status(400).json({ 
          message: "Category ID, threads, and categories are required",
          code: "BAD_REQUEST" 
        });
      }
      
      // Find the category to delete
      const categoryToDelete = categories.find((cat: any) => cat.id === categoryId);
      
      if (!categoryToDelete) {
        return res.status(404).json({ 
          message: "Category not found",
          code: "NOT_FOUND" 
        });
      }
      
      // Get all emails that were in the category we're deleting
      const emailsToReassign = threads.filter((thread: any) => thread.category === categoryToDelete.name);
      
      // Remove the category we're deleting from the categories list
      const updatedCategories = categories.filter((cat: any) => cat.id !== categoryId);
      
      // If there are no emails to reassign, we can skip the recategorization
      if (emailsToReassign.length === 0 || updatedCategories.length === 0) {
        // Return the updated data without modifying threads
        return res.status(200).json({
          success: true,
          deletedCategory: categoryToDelete,
          updatedCategories,
          reassignedThreads: threads,
          reassignedCount: 0
        });
      }
      
      // Format categories for Groq API
      const categoriesConfig = updatedCategories.map((cat: any) => ({
        name: cat.name,
        description: cat.description,
        isDefault: cat.isDefault === false ? false : true
      }));
      
      try {
        // Use Groq AI to re-categorize all threads with the updated category list
        const rawCategorizedThreads = await categorizeThreadsWithGroq(
          threads,
          categoriesConfig,
          // Use the same enhanced prompt as the regular categorization
          async (messages: any[]) => {
            return await getGroqEmailCategorization(
              "You are an AI assistant that specializes in email categorization with a focus on custom categories. " +
              "Your PRIMARY RESPONSIBILITY is to categorize emails into user-defined custom categories first, " +
              "and only use default categories when there is absolutely no match with custom categories. " +
              "Custom categories are marked with IsCustom: YES - these are HIGH PRIORITY and should be used " +
              "when the email content contains exact keywords from the category name or description. " +
              "Always prioritize exact keyword matching for best categorization performance. " +
              "Remember, the user specifically created these custom categories for their emails, " +
              "so they should be favored over default categories whenever possible.",
              messages
            );
          }
        );
        
        // Convert the raw categorized data back to a flat list of threads
        let reassignedThreads: any[] = [];
        rawCategorizedThreads.forEach(categoryGroup => {
          categoryGroup.threads.forEach((thread: any) => {
            reassignedThreads.push({
              ...thread,
              category: categoryGroup.category
            });
          });
        });
        
        // Return the updated data
        return res.status(200).json({
          success: true,
          deletedCategory: categoryToDelete,
          updatedCategories,
          reassignedThreads,
          reassignedCount: emailsToReassign.length
        });
      } catch (groqError) {
        console.error("Groq API error during category deletion:", groqError);
        
        // If AI categorization fails, we need a fallback approach
        // Simply distribute emails across remaining categories
        let reassignedThreads = threads.map((thread: any) => {
          if (thread.category === categoryToDelete.name) {
            // Find a reasonable default category from remaining categories
            const defaultCategory = updatedCategories.find((cat: any) => cat.isDefault) || updatedCategories[0];
            return {
              ...thread,
              category: defaultCategory.name
            };
          }
          return thread;
        });
        
        return res.status(200).json({
          success: true,
          deletedCategory: categoryToDelete,
          updatedCategories,
          reassignedThreads,
          reassignedCount: emailsToReassign.length,
          note: "Used fallback redistribution due to AI error"
        });
      }
    } catch (error) {
      console.error("Error deleting category:", error);
      return res.status(500).json({
        message: "Failed to delete category",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
}