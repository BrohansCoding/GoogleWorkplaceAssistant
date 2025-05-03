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

// Function to categorize Gmail threads using Groq (enhanced version with AI integration)
// Define a type for categories
export interface CategoryConfig { 
  name: string;
  description: string;
  isDefault?: boolean;
}

export async function categorizeThreadsWithGroq(
  threads: GmailThread[] | any[],
  categoriesConfig: CategoryConfig[],
  groqApiFunction: Function,
  customPrompt?: string
): Promise<{ category: string, threads: GmailThread[] | any[] }[]> {
  try {
    console.log(`Categorizing ${threads.length} emails using enhanced rule-based categorization with AI assistance`);
    console.log(`Categories available: ${categoriesConfig.map(c => c.name).join(', ')}`);
    
    // Check for custom categories
    const customCategories = categoriesConfig.filter(cat => cat.isDefault === false);
    const hasCustomCategories = customCategories.length > 0;
    
    if (hasCustomCategories) {
      console.log(`Found ${customCategories.length} custom categories:`);
      customCategories.forEach(cat => {
        console.log(`- ${cat.name}: "${cat.description}"`);
      });
    }
    
    // Initialize result arrays by category
    const categorizedResults: { [key: string]: any[] } = {};
    categoriesConfig.forEach(cat => {
      categorizedResults[cat.name] = [];
    });
    
    // Prepare detailed category descriptions for the AI
    const categoryDescriptions = categoriesConfig.map(cat => 
      `Category: ${cat.name}\nDescription: ${cat.description}\nIsCustom: ${cat.isDefault === false ? 'YES' : 'no'}`
    ).join('\n\n');
    
    // For custom categories, we'll use Groq AI to help with categorization
    // But we'll only do this if there are custom categories to avoid unnecessary API calls
    if (hasCustomCategories && threads.length > 0) {
      try {
        console.log("Using Groq AI for enhanced categorization of custom categories...");
        
        // Create batches of emails for processing (max 5 at a time to avoid token limits)
        const BATCH_SIZE = 5;
        const batches = [];
        
        for (let i = 0; i < Math.min(threads.length, 50); i += BATCH_SIZE) {
          batches.push(threads.slice(i, i + BATCH_SIZE));
        }
        
        console.log(`Processing ${batches.length} batches of emails for AI categorization`);
        
        for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
          const batch = batches[batchIndex];
          console.log(`\nProcessing batch ${batchIndex + 1}/${batches.length} with ${batch.length} emails`);
          
          // Create a prompt for the AI that includes all categories and emails in this batch
          const emailTexts = batch.map((thread, idx) => {
            const subject = thread.subject || '(No subject)';
            const snippet = thread.snippet || '(No content)';
            const from = thread.from || 'unknown@example.com';
            return `Email ${idx + 1}:\nFrom: ${from}\nSubject: ${subject}\nContent: ${snippet}`;
          }).join('\n\n');
          
          // Incorporate custom prompt if provided
          const customInstructions = customPrompt ? 
            `\nUSER INSTRUCTIONS: ${customPrompt}\n` : '';
            
          const prompt = `You are an expert email categorization system. Your primary responsibility is to categorize emails into custom user-created categories when they match, and only use default categories as a fallback.

CATEGORIES (in priority order):
${categoryDescriptions}

CATEGORIZATION RULES:
1. CUSTOM CATEGORIES (marked as IsCustom: YES) are the TOP PRIORITY - these are explicitly defined by the user and should be used whenever there's ANY reasonable match.
2. Look for specific keywords, phrases, or themes from custom category descriptions in the email content.
3. Only use default categories (IsCustom: no) when NO custom category is a reasonable match.
4. Be precise and thorough in your matching - consider the full context of custom categories.
5. Look for semantic meaning beyond exact keyword matching - understand the intent and content of emails.
${customInstructions}
EMAILS TO CATEGORIZE:
${emailTexts}

Respond with just the categorizations in this exact format:
Email 1: [Category Name]
Email 2: [Category Name]
...and so on.`;

          try {
            // Call Groq API with our custom prompt
            const aiResponse = await groqApiFunction([
              { role: "system", content: "You are an expert email categorization assistant specializing in custom category systems. Your primary job is to recognize user-defined categories first, and only use default categories as a fallback. ALWAYS prioritize custom categories (marked as IsCustom: YES) over default ones whenever there's any reasonable match." },
              { role: "user", content: prompt }
            ]);
            
            console.log(`Received AI categorization response for batch ${batchIndex + 1}`);
            
            // Parse the response
            const responseLines = aiResponse.split('\n');
            
            for (const line of responseLines) {
              if (line.trim() === '') continue;
              
              // Extract email number and category
              const match = line.match(/Email\s+(\d+):\s+(.*)/i);
              if (match) {
                const emailIndex = parseInt(match[1]) - 1;
                const categoryName = match[2].trim();
                
                // Make sure it's a valid category name
                if (categoriesConfig.some(cat => cat.name === categoryName) && emailIndex < batch.length) {
                  const email = batch[emailIndex];
                  console.log(`AI categorized email "${email.subject?.substring(0, 30) || '(No subject)'}..." as "${categoryName}"`);
                  
                  // Only use AI categorization if the category exists
                  if (categorizedResults[categoryName]) {
                    categorizedResults[categoryName].push(email);
                  } else {
                    console.log(`Warning: AI suggested category "${categoryName}" doesn't exist`);
                    // Use rule-based fallback for this email
                    categorizeEmailWithRules(email, categoriesConfig, categorizedResults);
                  }
                } else {
                  console.log(`Warning: Invalid category "${categoryName}" or email index ${emailIndex}`);
                  // Use rule-based fallback for this email
                  if (emailIndex < batch.length) {
                    categorizeEmailWithRules(batch[emailIndex], categoriesConfig, categorizedResults);
                  }
                }
              }
            }
          } catch (aiError) {
            console.error("Error using AI for categorization:", aiError);
            console.log("Falling back to rule-based categorization for this batch");
            
            // Fallback to rule-based for this batch
            batch.forEach(email => {
              categorizeEmailWithRules(email, categoriesConfig, categorizedResults);
            });
          }
        }
        
        // For any remaining emails (beyond the first 50), use rule-based categorization
        if (threads.length > 50) {
          console.log(`Using rule-based categorization for the remaining ${threads.length - 50} emails`);
          threads.slice(50).forEach(email => {
            categorizeEmailWithRules(email, categoriesConfig, categorizedResults);
          });
        }
      } catch (aiCategorizeError) {
        console.error("AI categorization failed, falling back to rule-based:", aiCategorizeError);
        
        // If AI categorization fails, fall back to rule-based for all emails
        threads.forEach(email => {
          categorizeEmailWithRules(email, categoriesConfig, categorizedResults);
        });
      }
    } else {
      // No custom categories, use rule-based approach for all emails
      console.log("Using rule-based categorization for all emails (no custom categories)");
      threads.forEach(email => {
        categorizeEmailWithRules(email, categoriesConfig, categorizedResults);
      });
    }
    
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

// Helper function for rule-based email categorization
function categorizeEmailWithRules(
  thread: any,
  categoriesConfig: CategoryConfig[],
  categorizedResults: { [key: string]: any[] }
): void {
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
    const categoryName = category.name;
    const name = categoryName.toLowerCase();
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
    
    // Enhanced special handling for custom categories 
    // Give higher priority to custom user-created categories
    if (category.isDefault === false) {
      // Check for any word from the name in the email (higher weight)
      const nameWords = name.split(/\s+/);
      nameWords.forEach(word => {
        if (word.length > 2 && fullText.includes(word)) {
          categoryScores[category.name] += 8; // Increased from 5 to 8
        }
      });
      
      // Give more weight to description keywords for custom categories
      descKeywords.forEach(keyword => {
        if (fullText.includes(keyword)) {
          // Add more points for description matches in custom categories
          categoryScores[category.name] += 3; // Additional points beyond the 2 already given
        }
      });
      
      // Special bonus for exact matches of important terms
      const importantTerms = description
        .split(/[.,;:]/)
        .map(phrase => phrase.trim())
        .filter(phrase => phrase.length > 0);
        
      importantTerms.forEach(phrase => {
        if (fullText.includes(phrase)) {
          categoryScores[category.name] += 10;
        }
      });
    }
  }
  
  // Find the category with the highest score
  // But also give custom categories an advantage
  let bestCategory = categoriesConfig[0];
  let highestScore = 0;
  let highestCustomScore = 0;
  let bestCustomCategory: CategoryConfig | null = null;
  
  // Log all category scores for this email
  console.log(`\nRule-based scoring for email: "${subject.substring(0, 30)}..."`);
  
  Object.entries(categoryScores).forEach(([categoryName, score]) => {
    const category = categoriesConfig.find(c => c.name === categoryName);
    const isCustom = category?.isDefault === false;
    
    // Check for exact category name match in the email - this is the highest priority
    // If the category name appears in the email text, this should be a very strong signal
    let exactNameMatch = false;
    
    if (category) {
      const catNameLower = category.name.toLowerCase();
      const categoryNameWords = catNameLower.split(/\s+/);
      
      exactNameMatch = categoryNameWords.some((word: string) => {
        if (word.length > 2) {
          const wordRegex = new RegExp(`\\b${word}\\b`, 'i'); // Match whole word with word boundaries
          return wordRegex.test(fullText);
        }
        return false;
      });
    }
    
    if (exactNameMatch) {
      // If we have an exact match with a word from the category name, give it a massive boost
      score += 50; // Very high score for exact matches
      console.log(`EXACT MATCH found for category "${categoryName}" - adding 50 points`);
    }
    
    // Add a small boost to ALL custom categories to increase their chances
    if (isCustom) {
      score += 3; // Small boost just for being a custom category
    }
    
    console.log(`- ${categoryName}${isCustom ? ' (custom)' : ''}: ${score} points${exactNameMatch ? ' (EXACT MATCH)' : ''}${isCustom ? ' (includes custom boost)' : ''}`);
    
    // Keep track of the best custom category separately
    if (isCustom && score > highestCustomScore && category) {
      highestCustomScore = score;
      // Explicitly type-cast category to resolve TypeScript issue
      bestCustomCategory = category as CategoryConfig;
    }
    
    // Also track overall highest score
    if (score > highestScore) {
      highestScore = score;
      bestCategory = category || categoriesConfig[0];
    }
  });
  
  // If we have an exact match with a score over 50, that's our category, period.
  const hasExactMatch = highestScore >= 50;
  
  // If no exact match but the best custom category has a reasonable score (at least 40% of highest),
  // and there's any score at all, prioritize it even if not the absolute highest
  if (!hasExactMatch && bestCustomCategory && highestCustomScore > 0 && 
      highestCustomScore >= Math.max(5, highestScore * 0.4)) {
    console.log(`Prioritizing custom category score: ${highestCustomScore} over default category with score ${highestScore}`);
    bestCategory = bestCustomCategory;
    highestScore = highestCustomScore;
  }
  
  // Log the winning category
  console.log(`Selected category: ${bestCategory.name} (score: ${highestScore})`);
  console.log(`IsDefault: ${bestCategory.isDefault !== false ? 'Yes' : 'No (Custom)'}`);
  console.log('-----------------------------------------');
  
  // If we have a score, assign to the best category
  if (highestScore > 0) {
    categorizedResults[bestCategory.name].push(thread);
    assigned = true;
  }
  
  // If not assigned, find the best fallback category
  if (!assigned && categoriesConfig.length > 0) {
    // Look for a default category that seems appropriate for low-priority items
    let fallbackCategory = categoriesConfig.find(cat => 
      cat.name.toLowerCase().includes('wait') || 
      cat.description.toLowerCase().includes('low priority') ||
      cat.isDefault === true
    ) || categoriesConfig[0];
    
    console.log(`Email not matched to any category, assigning to fallback: "${fallbackCategory.name}"`);
    categorizedResults[fallbackCategory.name].push(thread);
  }
}