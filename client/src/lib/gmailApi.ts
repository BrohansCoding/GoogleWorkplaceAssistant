import { EmailThreadType, EmailCategoryType } from '@shared/schema';
import { getGoogleGmailToken } from './firebase';
import { apiRequest } from './queryClient';

/**
 * Fetch Gmail threads
 * @param maxResults Maximum number of threads to fetch (default: 100)
 * @returns Array of Gmail thread objects
 */
export const fetchGmailThreads = async (maxResults: number = 100): Promise<EmailThreadType[]> => {
  try {
    // Get the OAuth token
    const token = await getGoogleGmailToken();
    if (!token) {
      throw new Error('Not authenticated with Gmail');
    }

    // Fetch the threads from our server endpoint
    const response = await apiRequest({
      url: `/api/gmail/threads?maxResults=${maxResults}`,
      method: 'GET',
    });

    return response.threads || [];
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
    // Get the OAuth token
    const token = await getGoogleGmailToken();
    if (!token) {
      throw new Error('Not authenticated with Gmail');
    }

    // Call the server endpoint for categorization
    const response = await apiRequest({
      url: '/api/gmail/categorize',
      method: 'POST',
      data: {
        threads,
        categories,
        customPrompt
      }
    });

    return response.categorizedThreads || [];
  } catch (error) {
    console.error('Error categorizing Gmail threads:', error);
    throw error;
  }
};

/**
 * Create a new custom email category
 * @param name Category name
 * @param description Category description
 * @param color Optional color for the category
 * @returns The newly created category
 */
export const createCustomCategory = (
  name: string,
  description: string,
  color?: string
): EmailCategoryType => {
  return {
    id: name.toLowerCase().replace(/\s+/g, '-'),
    name,
    description,
    isDefault: false,
    color: color || '#64748B' // slate (default color)
  };
};