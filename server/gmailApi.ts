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

// Function to fetch Gmail threads
export async function fetchGmailThreads(
  accessToken: string,
  maxResults: number = 100
): Promise<GmailThread[]> {
  console.log("=========== GMAIL API REQUEST ===========");
  console.log("Fetching Gmail threads with OAuth token");
  console.log(`- Max results: ${maxResults}`);
  console.log(`- Token available: ${!!accessToken}`);
  
  try {
    // First, fetch threads list
    const threadsResponse = await axios.get(
      `https://gmail.googleapis.com/gmail/v1/users/me/threads`,
      {
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

    // Now fetch each thread with full messages
    const threadPromises = threadsResponse.data.threads.map(async (thread: { id: string }) => {
      const threadDetails = await axios.get(
        `https://gmail.googleapis.com/gmail/v1/users/me/threads/${thread.id}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          params: {
            format: 'metadata',
            metadataHeaders: ['Subject', 'From', 'Date']
          },
        }
      );

      return threadDetails.data;
    });

    // Wait for all thread details to be fetched
    const threads = await Promise.all(threadPromises);
    
    console.log(`Successfully retrieved ${threads.length} Gmail threads with details`);

    // Process the threads to extract useful info
    return threads.map((thread) => {
      // Find the most recent message in the thread
      const latestMessage = thread.messages.reduce((latest, current) => {
        const latestDate = parseInt(latest.internalDate || '0');
        const currentDate = parseInt(current.internalDate || '0');
        return currentDate > latestDate ? current : latest;
      }, thread.messages[0]);

      // Extract headers from the latest message
      const subject = latestMessage.payload?.headers.find(h => h.name.toLowerCase() === 'subject')?.value || '(No Subject)';
      const from = latestMessage.payload?.headers.find(h => h.name.toLowerCase() === 'from')?.value || '';
      const date = latestMessage.payload?.headers.find(h => h.name.toLowerCase() === 'date')?.value || '';

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

// Function to categorize Gmail threads using Groq
export async function categorizeThreadsWithGroq(
  threads: any[],
  categoriesConfig: { name: string, description: string }[],
  groqApiFunction: Function,
  customPrompt?: string
): Promise<{ category: string, threads: any[] }[]> {
  // Prepare message with category descriptions and emails
  const defaultPrompt = `
    You are an expert email classifier. Your task is to categorize the following emails into the most appropriate category.
    
    Here are the available categories:
    ${categoriesConfig.map(c => `${c.name}: ${c.description}`).join('\n')}
    
    For each email, you should determine the most appropriate category based on the subject, sender, and content.
    
    Here are the emails to classify, with their subjects and snippets:
    
    ${threads.map((t, i) => 
      `Email ${i+1}:
      - Subject: ${t.subject}
      - From: ${t.from}
      - Snippet: ${t.snippet}
      - Thread ID: ${t.id}
      `
    ).join('\n\n')}
    
    Return your categorization in JSON format as follows:
    {
      "categorization": [
        { "threadId": "thread_id_1", "category": "category_name" },
        { "threadId": "thread_id_2", "category": "category_name" },
        ...
      ]
    }
    
    Do not include any other text or explanations in your response, only the JSON.
  `;

  const prompt = customPrompt || defaultPrompt;
  
  try {
    // Call the provided Groq API function with our prompt
    const groqResponse = await groqApiFunction([
      { role: 'system', content: 'You are an AI assistant that specializes in email categorization.' },
      { role: 'user', content: prompt }
    ]);
    
    // Parse the response which should be JSON
    let categorization;
    try {
      // First try to see if the entire response is valid JSON
      categorization = JSON.parse(groqResponse);
    } catch (e) {
      // If that fails, try to extract JSON from the string
      const jsonMatch = groqResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          categorization = JSON.parse(jsonMatch[0]);
        } catch (e2) {
          console.error("Failed to parse JSON from Groq response:", e2);
          throw new Error("Invalid response format from categorization");
        }
      }
    }
    
    if (!categorization || !categorization.categorization) {
      console.error("Unexpected response format from Groq:", groqResponse);
      throw new Error("Invalid categorization response format");
    }
    
    // Group threads by category
    const categorizedThreads: { [key: string]: any[] } = {};
    
    // Initialize all categories with empty arrays
    categoriesConfig.forEach(cat => {
      categorizedThreads[cat.name] = [];
    });
    
    // Add threads to their assigned categories
    categorization.categorization.forEach((item: { threadId: string, category: string }) => {
      const thread = threads.find(t => t.id === item.threadId);
      if (thread && categorizedThreads[item.category]) {
        categorizedThreads[item.category].push(thread);
      }
    });
    
    // Convert to array format for return
    return Object.keys(categorizedThreads).map(category => ({
      category,
      threads: categorizedThreads[category]
    }));
  } catch (error) {
    console.error("Error categorizing threads with Groq:", error);
    throw error;
  }
}