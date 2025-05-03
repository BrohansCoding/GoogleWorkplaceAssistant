/**
 * Gmail API Service
 * This service handles interactions with the Gmail API
 */

import axios from "axios";

// Types for Gmail messages
export interface GmailMessage {
  id: string;
  threadId: string;
  snippet: string;
  payload?: {
    headers: {
      name: string;
      value: string;
    }[];
    mimeType: string;
    body?: {
      data?: string;
      size?: number;
    };
    parts?: {
      mimeType: string;
      body?: {
        data?: string;
        size?: number;
      };
    }[];
  };
  labelIds?: string[];
  internalDate?: string;
  sizeEstimate?: number;
}

export interface GmailThread {
  id: string;
  snippet: string;
  historyId: string;
  messages: GmailMessage[];
}

// Function to make a rate-limit aware API request
async function makeGmailApiRequest(url: string, options: any, retries = 3, delay = 1000): Promise<any> {
  try {
    return await axios(url, options);
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      // Check for rate limit (429) or server error (5xx)
      if ((error.response.status === 429 || error.response.status >= 500) && retries > 0) {
        console.log(`Rate limit hit (${error.response.status}). Retrying after ${delay}ms... (${retries} retries left)`);
        // Wait using exponential backoff
        await new Promise(resolve => setTimeout(resolve, delay));
        // Retry with increased delay (exponential backoff)
        return makeGmailApiRequest(url, options, retries - 1, delay * 2);
      }
    }
    throw error;
  }
}

// Function to fetch Gmail threads with rate limiting support
export async function fetchGmailThreads(
  accessToken: string,
  maxResults: number = 100
): Promise<GmailThread[]> {
  console.log("=========== GMAIL API REQUEST ===========");
  console.log("Fetching Gmail threads with OAuth token");
  console.log(`- Max results: ${maxResults}`);
  console.log(`- Token available: ${!!accessToken}`);
  
  try {
    // First, fetch threads list with rate limit awareness
    const threadsResponse = await makeGmailApiRequest(
      `https://gmail.googleapis.com/gmail/v1/users/me/threads`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        params: {
          maxResults
        },
      }
    );

    // Check if we got threads
    if (!threadsResponse.data.threads || !threadsResponse.data.threads.length) {
      console.log("No Gmail threads found");
      return [];
    }

    // Log success
    console.log(`Retrieved ${threadsResponse.data.threads.length} Gmail threads`);

    // Now fetch each thread with full messages, but in batches to avoid rate limits
    const batchSize = 10; // Process 10 threads at a time
    let allThreads: any[] = [];
    const threadIds = threadsResponse.data.threads.map((t: any) => t.id);
    
    // Process in batches
    for (let i = 0; i < threadIds.length; i += batchSize) {
      console.log(`Processing batch ${Math.floor(i/batchSize) + 1} of ${Math.ceil(threadIds.length/batchSize)}`);
      
      const batchIds = threadIds.slice(i, i + batchSize);
      
      // Create batch promises with slight delays between requests
      const batchPromises = batchIds.map(async (threadId: string, index: number) => {
        // Add a small delay between requests within the batch
        if (index > 0) {
          await new Promise(resolve => setTimeout(resolve, 200 * index));
        }
        
        // Make the request with rate limit handling
        return makeGmailApiRequest(
          `https://gmail.googleapis.com/gmail/v1/users/me/threads/${threadId}`,
          {
            method: 'GET',
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
            params: {
              format: 'metadata',
              metadataHeaders: ['Subject', 'From', 'Date']
            },
          }
        ).then(response => response.data);
      });
      
      // Wait for this batch to complete
      const batchResults = await Promise.all(batchPromises);
      allThreads = [...allThreads, ...batchResults];
      
      // Add a delay between batches if we have more to process
      if (i + batchSize < threadIds.length) {
        console.log("Pausing between batches to avoid rate limiting...");
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    console.log(`Successfully retrieved ${allThreads.length} Gmail threads with details`);

    // Process the threads to extract useful info
    return allThreads.map((thread) => {
      // Check if thread has messages
      if (!thread.messages || !thread.messages.length) {
        console.log(`Thread ${thread.id} has no messages, skipping details extraction`);
        return {
          ...thread,
          subject: '(No Subject)',
          from: '',
          date: '',
        };
      }
      
      // Find the most recent message in the thread
      const latestMessage = thread.messages.reduce((latest: GmailMessage, current: GmailMessage) => {
        const latestDate = parseInt(latest.internalDate || '0');
        const currentDate = parseInt(current.internalDate || '0');
        return currentDate > latestDate ? current : latest;
      }, thread.messages[0]);

      // Check if we have payload data
      if (!latestMessage.payload || !latestMessage.payload.headers) {
        console.log(`Message ${latestMessage.id} has no payload or headers, using default values`);
        return {
          ...thread,
          latestMessage,
          subject: '(No Subject)',
          from: '',
          date: '',
          snippet: latestMessage.snippet || thread.snippet
        };
      }

      // Extract headers from the latest message
      const subject = latestMessage.payload?.headers.find((h: {name: string, value: string}) => h.name.toLowerCase() === 'subject')?.value || '(No Subject)';
      const from = latestMessage.payload?.headers.find((h: {name: string, value: string}) => h.name.toLowerCase() === 'from')?.value || '';
      const date = latestMessage.payload?.headers.find((h: {name: string, value: string}) => h.name.toLowerCase() === 'date')?.value || '';

      // Add these as computed properties to the thread object
      return {
        ...thread,
        latestMessage,
        subject,
        from,
        date,
        snippet: latestMessage.snippet || thread.snippet
      };
    });
  } catch (error) {
    console.error("Error fetching Gmail threads:", error);
    if (axios.isAxiosError(error) && error.response) {
      console.error("Response status:", error.response.status);
      console.error("Response data:", error.response.data);
    }
    throw error;
  }
}

// Function to categorize Gmail threads using Groq (enhanced version)
export async function categorizeThreadsWithGroq(
  threads: GmailThread[] | any[],
  categoriesConfig: { name: string, description: string, isDefault?: boolean }[],
  groqApiFunction: Function,
  customPrompt?: string
): Promise<{ category: string, threads: GmailThread[] | any[] }[]> {
  try {
    console.log(`Categorizing ${threads.length} emails using enhanced rule-based categorization`);
    console.log(`Categories available: ${categoriesConfig.map(c => c.name).join(', ')}`);
    
    // Initialize result arrays by category
    const categorizedResults: { [key: string]: any[] } = {};
    categoriesConfig.forEach(cat => {
      categorizedResults[cat.name] = [];
    });
    
    // Categorize emails based on advanced rules with scoring
    threads.forEach(thread => {
      // Parse email content
      const subject = (thread.subject || '').toLowerCase();
      const snippet = (thread.snippet || '').toLowerCase();
      const from = (thread.from || '').toLowerCase();
      const fullText = `${subject} ${snippet} ${from}`;
      
      // Track if email has been assigned to a category
      let assigned = false;
      
      // Score each category based on relevance
      let categoryScores: {[key: string]: number} = {};
      
      // First pass: Score each category based on keyword matches
      for (const category of categoriesConfig) {
        categoryScores[category.name] = 0;
        const name = category.name.toLowerCase();
        const description = category.description.toLowerCase();
        
        // Extract keywords from the category description
        const descKeywords = description
          .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "")
          .split(/\s+/)
          .filter(word => word.length > 3); // Only use meaningful words
        
        // Check for category name match (highest priority)
        if (fullText.includes(name)) {
          categoryScores[category.name] += 10;
        }
        
        // Check for keywords from description
        descKeywords.forEach(keyword => {
          if (fullText.includes(keyword)) {
            categoryScores[category.name] += 2;
          }
        });
        
        // Add standard rules for known categories
        if (name.includes('important') || name.includes('action') || name.includes('urgent')) {
          if (subject.includes('urgent') || subject.includes('important') || 
              subject.includes('action') || subject.includes('required') ||
              subject.includes('asap') || subject.includes('immediately') ||
              subject.includes('deadline')) {
            categoryScores[category.name] += 8;
          }
        }
        
        if (name.includes('newsletter') || name.includes('updates') || name.includes('subscription')) {
          if (subject.includes('newsletter') || subject.includes('weekly update') || 
              subject.includes('digest') || subject.includes('subscription') ||
              from.includes('newsletter') || from.includes('noreply') ||
              from.includes('updates') || subject.includes('latest news')) {
            categoryScores[category.name] += 8;
          }
        }
        
        if (name.includes('auto') || name.includes('archive') || name.includes('notification')) {
          if (from.includes('notification') || from.includes('noreply') || 
              from.includes('alert') || from.includes('system') ||
              from.includes('no-reply') || from.includes('donotreply') ||
              subject.includes('receipt') || subject.includes('confirmation') ||
              subject.includes('notification') || subject.includes('automated')) {
            categoryScores[category.name] += 8;
          }
        }
        
        // Special handling for custom categories (examine subject and content for relevance)
        if (category.isDefault === false) {
          // Check for any word from the name in the email
          const nameWords = name.split(/\s+/);
          nameWords.forEach(word => {
            if (word.length > 2 && fullText.includes(word)) {
              categoryScores[category.name] += 5;
            }
          });
        }
      }
      
      // Find the category with the highest score
      let bestCategory = categoriesConfig[0];
      let highestScore = 0;
      
      Object.entries(categoryScores).forEach(([categoryName, score]) => {
        if (score > highestScore) {
          highestScore = score;
          bestCategory = categoriesConfig.find(c => c.name === categoryName) || categoriesConfig[0];
        }
      });
      
      // If we have a score, assign to the best category
      if (highestScore > 0) {
        categorizedResults[bestCategory.name].push(thread);
        assigned = true;
      }
      
      // If not assigned, add to default category (Can Wait or first one)
      if (!assigned && categoriesConfig.length > 0) {
        const defaultCategory = categoriesConfig.find(cat => 
          cat.name.toLowerCase().includes('wait') || 
          cat.name.toLowerCase().includes('other')
        ) || categoriesConfig[0];
        
        categorizedResults[defaultCategory.name].push(thread);
      }
    });
    
    // Format for return
    return Object.keys(categorizedResults).map(category => ({
      category,
      threads: categorizedResults[category]
    }));
  } catch (error) {
    console.error("Error categorizing threads:", error);
    throw error;
  }
}