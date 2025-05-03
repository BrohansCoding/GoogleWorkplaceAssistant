import type { Express, Request, Response } from "express";
import { GmailCategorizeRequest } from "@shared/schema";
import { fetchGmailThreads, categorizeThreadsWithGroq, GmailThread } from "./gmailApi";
import { getGroqCompletion } from "./groqApi";

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
          message: "Authentication required",
          code: "AUTH_REQUIRED"
        });
      }
      
      // Fetch Gmail threads
      console.log("Fetching Gmail threads...");
      const threads = await fetchGmailThreads(token, parseInt(maxResults as string));
      
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
      
      return res.status(200).json({ 
        threads: emailThreads,
        count: emailThreads.length
      });
    } catch (error) {
      console.error("Error fetching Gmail threads:", error);
      return res.status(500).json({ 
        message: "Failed to fetch Gmail threads",
        error: error instanceof Error ? error.message : String(error)
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
      
      // Format categories for Groq API
      const categoriesConfig = categories.map(cat => ({
        name: cat.name,
        description: cat.description
      }));
      
      try {
        // Categorize threads using Groq with retry mechanism for rate limiting
        const rawCategorizedThreads = await categorizeThreadsWithGroq(
          threadsToProcess,
          categoriesConfig,
          // Pass the Groq completion function
          async (messages: any[]) => {
            try {
              return await getGroqCompletion(
                "You are an AI assistant that specializes in email categorization.",
                messages
              );
            } catch (groqError: any) {
              // Check if it's a rate limit error
              if (groqError.status === 429 || (groqError.response && groqError.response.status === 429)) {
                console.log("Rate limit hit, waiting before retry...");
                // Wait 2 seconds and try again
                await new Promise(resolve => setTimeout(resolve, 2000));
                return await getGroqCompletion(
                  "You are an AI assistant that specializes in email categorization.",
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
}