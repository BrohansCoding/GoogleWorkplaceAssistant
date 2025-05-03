import { EmailThreadType, EmailCategoryType } from '@shared/schema';
import { getGoogleGmailToken } from './firebase';

/**
 * Fetch Gmail threads
 * @param maxResults Maximum number of threads to fetch (default: 100)
 * @returns Array of Gmail thread objects
 */
export const fetchGmailThreads = async (maxResults: number = 100): Promise<EmailThreadType[]> => {
  try {
    console.log("Starting Gmail threads fetch process...");
    
    // Get the OAuth token
    const token = await getGoogleGmailToken();
    console.log("Gmail token check:", token ? "✓ Token available" : "✗ Token not available");
    
    if (!token) {
      throw new Error('Not authenticated with Gmail (missing token)');
    }

    // Fetch the threads from our server endpoint
    const url = `/api/gmail/threads?maxResults=${maxResults}`;
    console.log(`Fetching Gmail threads from: ${url}`);
    
    const response = await fetch(url, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Accept': 'application/json'
      }
    });

    console.log(`Gmail API response status: ${response.status} ${response.statusText}`);
    
    if (!response.ok) {
      // Try to get detailed error info from response
      let errorDetail = '';
      try {
        const errorData = await response.json();
        errorDetail = `: ${errorData.message || errorData.error || JSON.stringify(errorData)}`;
      } catch (e) {
        // If we can't parse the error response, use the status text
        errorDetail = `: ${response.statusText}`;
      }
      
      throw new Error(`Failed to fetch email threads (${response.status})${errorDetail}`);
    }

    // Parse response data
    const data = await response.json();
    
    if (!data) {
      console.error('Empty response from Gmail API');
      return [];
    }
    
    if (!data.threads) {
      console.error('Unexpected response format (missing threads):', data);
      return [];
    }
    
    console.log(`Successfully fetched ${data.threads.length} email threads`);
    return data.threads;
  } catch (error) {
    console.error('Error fetching Gmail threads:', error);
    throw error;
  }
};

/**
 * Default email categories with descriptions
 */
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
 * Categorize Gmail threads using the server's LLM categorization
 * @param threads Array of Gmail threads to categorize
 * @param categories Array of category definitions
 * @param customPrompt Optional custom prompt for the LLM
 * @returns Categorized threads grouped by category
 */
export const categorizeGmailThreads = async (
  threads: EmailThreadType[],
  categories: EmailCategoryType[] = DEFAULT_EMAIL_CATEGORIES,
  customPrompt?: string
): Promise<{ category: string, threads: EmailThreadType[] }[]> => {
  try {
    console.log(`Starting Gmail categorization for ${threads.length} threads into ${categories.length} categories...`);
    
    // Get the OAuth token
    const token = await getGoogleGmailToken();
    console.log("Gmail token for categorization:", token ? "✓ Token available" : "✗ Token not available");
    
    if (!token) {
      throw new Error('Not authenticated with Gmail (missing token for categorization)');
    }

    // Call the server endpoint for categorization
    const url = '/api/gmail/categorize';
    console.log(`Sending categorization request to: ${url}`);
    console.log(`Categories in request: ${categories.map(c => c.name).join(', ')}`);
    
    const requestBody = {
      threads,
      categories,
      customPrompt
    };
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(requestBody),
      credentials: 'include'
    });

    console.log(`Categorization API response status: ${response.status} ${response.statusText}`);
    
    if (!response.ok) {
      // Try to get detailed error info from response
      let errorDetail = '';
      try {
        const errorData = await response.json();
        errorDetail = `: ${errorData.message || errorData.error || JSON.stringify(errorData)}`;
      } catch (e) {
        // If we can't parse the error response, use the status text
        errorDetail = `: ${response.statusText}`;
      }
      
      throw new Error(`Failed to categorize emails (${response.status})${errorDetail}`);
    }

    const data = await response.json();
    
    if (!data) {
      console.error('Empty response from categorization API');
      return [];
    }
    
    if (!data.categorizedThreads) {
      console.error('Unexpected categorization response format (missing categorizedThreads):', data);
      return [];
    }

    console.log(`Successfully categorized threads into ${data.categorizedThreads.length} categories`);
    return data.categorizedThreads;
  } catch (error) {
    console.error('Error categorizing Gmail threads:', error);
    throw error;
  }
};

// Moved to emailCategories.ts