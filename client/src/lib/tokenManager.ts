import { User, getIdToken } from "firebase/auth";
import { auth } from "./firebase-setup";

// Constants
const OAUTH_TOKEN_STORAGE_KEY = 'google_oauth_token';
const TOKEN_REFRESH_THRESHOLD = 5 * 60 * 1000; // 5 minutes before expiry

// Type for token data
export interface TokenData {
  token: string;
  expiry: number;
  refreshToken?: string;
  tokenType: 'oauth' | 'firebase';
}

// Store OAuth token with expiration
export const storeOAuthToken = (
  token: string, 
  expiresIn: number = 3600, 
  refreshToken?: string
): TokenData => {
  // First, check if we already have a refresh token we should keep
  let existingRefreshToken: string | undefined;
  try {
    const existingData = localStorage.getItem(OAUTH_TOKEN_STORAGE_KEY);
    if (existingData) {
      const parsed = JSON.parse(existingData) as TokenData;
      existingRefreshToken = parsed.refreshToken;
    }
  } catch (e) {
    console.error('Error reading existing token data:', e);
  }
  
  // Use the provided refresh token, or fall back to an existing one
  const finalRefreshToken = refreshToken || existingRefreshToken;
  
  const expiry = Date.now() + (expiresIn * 1000);
  const tokenData: TokenData = { 
    token, 
    expiry,
    refreshToken: finalRefreshToken,
    tokenType: 'oauth'
  };
  
  // Store in localStorage to persist across browser sessions
  localStorage.setItem(OAUTH_TOKEN_STORAGE_KEY, JSON.stringify(tokenData));
  console.log(`OAuth token stored. Access token expires in ${expiresIn} seconds.`);
  console.log(`Refresh token ${finalRefreshToken ? 'stored' : 'not provided'}`);
  
  // Dispatch event for cross-tab communication
  try {
    const event = new CustomEvent('oauth-token-updated', { 
      detail: { hasToken: true, hasRefreshToken: !!finalRefreshToken }
    });
    window.dispatchEvent(event);
  } catch (e) {
    console.error('Error broadcasting token update:', e);
  }
  
  // Set up refresh timer
  scheduleTokenRefresh(tokenData);
  
  return tokenData;
};

// Get stored OAuth token if valid
export const getStoredOAuthToken = (): TokenData | null => {
  const tokenData = localStorage.getItem(OAUTH_TOKEN_STORAGE_KEY);
  if (!tokenData) {
    console.log('No OAuth token found in storage');
    return null;
  }
  
  try {
    const data = JSON.parse(tokenData) as TokenData;
    
    // Ensure token type is set
    data.tokenType = 'oauth'; 
    
    // Always return data if we have a refresh token, even if access token is expired
    // This allows the token refresh mechanism to work
    if (data.refreshToken) {
      return data;
    }
    
    // When we don't have a refresh token, check if the access token is still valid
    const timeUntilExpiry = data.expiry - Date.now();
    if (timeUntilExpiry <= TOKEN_REFRESH_THRESHOLD) {
      console.log(`Stored OAuth token is expired or will expire soon (${Math.floor(timeUntilExpiry/1000)}s left) and no refresh token available`);
      return null;
    }
    
    return data;
  } catch (e) {
    console.error('Error parsing stored OAuth token:', e);
    // Clear the invalid token data
    localStorage.removeItem(OAUTH_TOKEN_STORAGE_KEY);
    return null;
  }
};

// Clear OAuth token from storage
export const clearOAuthToken = () => {
  localStorage.removeItem(OAUTH_TOKEN_STORAGE_KEY);
  console.log('OAuth token cleared from storage');
};

// Get a fresh Firebase ID token
export const getFreshFirebaseToken = async (): Promise<string | null> => {
  if (!auth.currentUser) {
    console.log('No authenticated user found, cannot get Firebase token');
    return null;
  }
  
  try {
    // Force refresh the token
    const token = await getIdToken(auth.currentUser, true);
    console.log('Fresh Firebase ID token generated');
    return token;
  } catch (err) {
    console.error('Error getting fresh Firebase ID token:', err);
    return null;
  }
};

// Refresh OAuth token
export const refreshOAuthToken = async (): Promise<TokenData | null> => {
  const storedToken = getStoredOAuthToken();
  if (!storedToken || !storedToken.refreshToken) {
    console.log('No valid refresh token available');
    return null;
  }

  try {
    // Get current user to include in the request
    const currentUser = auth.currentUser;
    if (!currentUser) {
      console.log('No authenticated user found, cannot refresh token');
      return null;
    }
    
    // Get a fresh Firebase ID token for authentication with our server
    const idToken = await getFreshFirebaseToken();
    if (!idToken) {
      console.log('No valid Firebase ID token available for refresh');
      return null;
    }
    
    // Use our server endpoint to refresh the token
    const response = await fetch('/api/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        refreshToken: storedToken.refreshToken,
        idToken,
        user: {
          uid: currentUser.uid,
          displayName: currentUser.displayName,
          email: currentUser.email,
          photoURL: currentUser.photoURL
        }
      }),
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error(`Failed to refresh token: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.oauthToken) {
      console.log('Successfully refreshed OAuth token');
      
      // Store the new token
      return storeOAuthToken(
        data.oauthToken, 
        data.expiresIn || 3600, 
        data.refreshToken || storedToken.refreshToken // Keep old refresh token if not provided
      );
    } else {
      throw new Error('No OAuth token returned from refresh endpoint');
    }
  } catch (error) {
    console.error('Error refreshing token:', error);
    return null;
  }
};

// Store timer ID for cleanup
let tokenRefreshTimerId: number | null = null;

// Schedule token refresh
export const scheduleTokenRefresh = (tokenData: TokenData) => {
  // Clear any existing refresh timer
  if (tokenRefreshTimerId !== null) {
    clearTimeout(tokenRefreshTimerId);
    tokenRefreshTimerId = null;
  }

  if (!tokenData.refreshToken) return;
  
  const timeUntilRefresh = tokenData.expiry - Date.now() - TOKEN_REFRESH_THRESHOLD;
  if (timeUntilRefresh <= 0) {
    // Token is already expired or will expire soon, refresh immediately
    console.log('Token is already near expiration, refreshing immediately');
    refreshOAuthToken();
    return;
  }
  
  // Schedule refresh at 50% of the remaining time to ensure we don't cut it too close
  const refreshTime = Math.min(timeUntilRefresh, (tokenData.expiry - Date.now()) / 2);
  
  console.log(`Scheduling token refresh in ${Math.floor(refreshTime / 1000 / 60)} minutes (${refreshTime}ms)`);
  
  // Set timeout to refresh token
  tokenRefreshTimerId = window.setTimeout(() => {
    console.log('Token refresh timer triggered');
    refreshOAuthToken().then(newToken => {
      if (newToken) {
        console.log('Token refreshed successfully');
        // The refreshOAuthToken function already schedules the next refresh
      } else {
        console.log('Token refresh failed');
        
        // Try again in 1 minute if refresh failed but we still have time
        const retryTime = tokenData.expiry - Date.now() - 30000; // 30 seconds before actual expiry
        if (retryTime > 0) {
          console.log(`Will retry refresh in 1 minute`);
          tokenRefreshTimerId = window.setTimeout(() => refreshOAuthToken(), 60000);
        }
      }
    });
  }, refreshTime);
};

// Function to synchronize token with the server
export const syncTokensWithServer = async (user: User | null): Promise<boolean> => {
  if (!user) return false;
  
  try {
    // Get a fresh Firebase ID token
    const idToken = await getFreshFirebaseToken();
    
    // Get the current OAuth token
    const oauthToken = getStoredOAuthToken()?.token;
    
    if (!idToken) return false;
    
    // Send both tokens to the server
    const response = await fetch('/api/auth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        idToken,
        oauthToken,
        user: {
          uid: user.uid,
          displayName: user.displayName,
          email: user.email,
          photoURL: user.photoURL
        }
      }),
      credentials: 'include'
    });
    
    return response.ok;
  } catch (err) {
    console.error('Error syncing tokens with server:', err);
    return false;
  }
};

// Initialize token refresh if we have a valid token
export const initializeTokenRefresh = () => {
  const storedToken = getStoredOAuthToken();
  if (storedToken && storedToken.refreshToken) {
    console.log('Initializing token refresh system');
    scheduleTokenRefresh(storedToken);
  }
};

// Get Google OAuth token (for API requests)
export const getGoogleOAuthToken = async (): Promise<string | null> => {
  // First check if we have a valid stored token
  const storedToken = getStoredOAuthToken();
  if (!storedToken) {
    console.log('No OAuth token available - user needs to re-authenticate');
    return null;
  }
  
  // If the access token is valid, return it
  if (Date.now() < (storedToken.expiry - TOKEN_REFRESH_THRESHOLD)) {
    console.log('Using valid stored OAuth access token');
    return storedToken.token;
  }
  
  // If token is expired or will expire soon, refresh it
  const refreshedToken = await refreshOAuthToken();
  return refreshedToken?.token || null;
};

// Export legacy aliases for backward compatibility
export const getGoogleCalendarToken = getGoogleOAuthToken;
export const getGoogleGmailToken = getGoogleOAuthToken;
export const getGoogleDriveToken = getGoogleOAuthToken;