import { 
  signInWithPopup, 
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider, 
  signOut as firebaseSignOut,
  onAuthStateChanged,
  getIdToken,
  User
} from "firebase/auth";
import { auth } from "./firebase-setup";

// OAUTH TOKEN STORAGE
// Best practice: Store OAuth tokens separately from Firebase auth
// These are different tokens with different purposes
const OAUTH_TOKEN_STORAGE_KEY = 'google_oauth_token';

// Store OAuth token with expiration
export const storeOAuthToken = (
  token: string, 
  expiresIn: number = 3600, 
  refreshToken?: string
) => {
  const expiry = Date.now() + (expiresIn * 1000);
  const tokenData = { 
    token, 
    expiry,
    refreshToken 
  };
  
  // Store in localStorage to persist across browser sessions
  // This is important for refresh tokens
  localStorage.setItem(OAUTH_TOKEN_STORAGE_KEY, JSON.stringify(tokenData));
  console.log(`OAuth token stored. Access token expires in ${expiresIn} seconds.`);
  console.log(`Refresh token ${refreshToken ? 'stored' : 'not provided'}`);
  
  return tokenData;
};

// Get stored OAuth token if valid
export const getStoredOAuthToken = (): { 
  token: string, 
  expiry: number, 
  refreshToken?: string 
} | null => {
  const tokenData = localStorage.getItem(OAUTH_TOKEN_STORAGE_KEY);
  if (!tokenData) return null;
  
  try {
    const data = JSON.parse(tokenData);
    
    // Return data even if access token is expired when refresh token is available
    if (data.refreshToken) {
      // If we have a refresh token, return the data even if token is expired
      // The caller can use the refresh token to get a new access token
      if (Date.now() > (data.expiry - 5 * 60 * 1000)) {
        console.log('Access token is expired or will expire soon, but refresh token is available');
        return data; // Return anyway since we have a refresh token
      }
      return data;
    }
    
    // No refresh token, only return if access token is still valid
    if (Date.now() > (data.expiry - 5 * 60 * 1000)) {
      console.log('Stored OAuth token is expired or will expire soon and no refresh token available');
      return null;
    }
    
    return data;
  } catch (e) {
    console.error('Error parsing stored OAuth token:', e);
    return null;
  }
};

// Clear OAuth token from storage
export const clearOAuthToken = () => {
  localStorage.removeItem(OAUTH_TOKEN_STORAGE_KEY);
  console.log('OAuth token cleared from storage');
};

// Create Google Auth Provider with proper Calendar scopes
const createGoogleProvider = () => {
  const provider = new GoogleAuthProvider();
  
  // ALWAYS request full access to calendars to avoid re-authentication later
  // These are the EXACT scopes needed for Google Calendar API with write access
  console.log('Creating Google provider with FULL permissions for calendar...');
  provider.addScope('https://www.googleapis.com/auth/calendar');           // Full access to Calendar
  provider.addScope('https://www.googleapis.com/auth/calendar.events');    // Full access to Events
  
  // Always include these basic scopes
  provider.addScope('profile');
  provider.addScope('email');
  
  // Force consent screen to ensure we get all permissions and refresh token
  provider.setCustomParameters({
    prompt: 'consent',
    access_type: 'offline'
  });
  
  return provider;
};

// Check for redirect result on page load
export const checkRedirectResult = async () => {
  try {
    console.log("Checking for redirect result...");
    const result = await getRedirectResult(auth);
    console.log("Redirect result:", result ? "SUCCESS" : "NO RESULT");
    
    if (!result) {
      // Check if user is already logged in
      const currentUser = auth.currentUser;
      console.log("Current user:", currentUser ? "LOGGED IN" : "NOT LOGGED IN");
      
      if (currentUser) {
        // User is already logged in, check if we have a valid OAuth token
        const storedToken = getStoredOAuthToken();
        
        if (storedToken) {
          console.log("Found valid OAuth token in storage");
          return { user: currentUser, oauthToken: storedToken.token };
        } else {
          console.warn("No valid OAuth token found for current user");
          return { user: currentUser, oauthToken: null };
        }
      }
      return null;
    }
    
    // Try to get OAuth token from the credential
    const credential = GoogleAuthProvider.credentialFromResult(result);
    const oauthToken = credential?.accessToken;
    
    console.log("Got credential:", credential ? "YES" : "NO");
    console.log("Got OAuth token from credential:", oauthToken ? "YES" : "NO");
    
    // Also get Firebase ID token for our backend auth
    let idToken = null;
    try {
      idToken = await getIdToken(result.user, true);
      console.log("Got Firebase ID token");
    } catch (tokenError) {
      console.error("Error getting Firebase ID token:", tokenError);
    }
    
    // Store OAuth token if available (crucial for Google Calendar API)
    if (oauthToken) {
      storeOAuthToken(oauthToken);
    } else {
      console.error("No OAuth token received! Calendar API access may fail.");
    }
    
    // Pass both tokens to server
    try {
      console.log("Sending tokens to server...");
      const response = await fetch('/api/auth/google', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          // Send both tokens separately with clear names
          oauthToken,    // For Google Calendar API
          idToken,       // For Firebase authentication
          user: {
            uid: result.user.uid,
            displayName: result.user.displayName,
            email: result.user.email,
            photoURL: result.user.photoURL
          }
        }),
        credentials: 'include'
      });
      console.log("Server response:", response.status);
    } catch (serverError) {
      console.error("Error sending tokens to server:", serverError);
      // Continue anyway - we'll handle auth client-side if needed
    }
    
    console.log("Authentication successful, returning user");
    return { user: result.user, oauthToken };
  } catch (error) {
    console.error("Error processing redirect result", error);
    throw error;
  }
};

// Sign in with Google
export const signInWithGoogle = async () => {
  try {
    console.log("Starting Google sign-in with correct Calendar API scopes...");
    
    // Create provider with proper scopes
    const googleProvider = createGoogleProvider();
    
    // Try to use popup which is more reliable in many environments
    const result = await signInWithPopup(auth, googleProvider);
    console.log("Sign in with popup successful:", result.user.displayName);
    
    // Get OAuth token for Google Calendar API
    const credential = GoogleAuthProvider.credentialFromResult(result);
    const oauthToken = credential?.accessToken;
    
    if (!oauthToken) {
      console.error("Failed to get OAuth token from Google sign-in!");
      return { success: false, error: "No OAuth token received" };
    }
    
    console.log("OAuth token received:", {
      exists: !!oauthToken,
      length: oauthToken?.length
    });
    
    // Store OAuth token
    storeOAuthToken(oauthToken);
    
    // Check if we successfully acquired write permission and clear flag
    const hadRequestedWritePermission = window.localStorage.getItem('NEED_CALENDAR_WRITE') === 'true';
    if (hadRequestedWritePermission) {
      console.log("Successfully obtained calendar write permissions!");
      // Clear the flag after use
      window.localStorage.removeItem('NEED_CALENDAR_WRITE');
    }
    
    // Get Firebase ID token for our backend
    let idToken = null;
    try {
      idToken = await getIdToken(result.user, true);
      console.log("Firebase ID token received");
    } catch (err) {
      console.error("Error getting Firebase ID token:", err);
    }
    
    // Send tokens to server
    try {
      console.log("Sending tokens to server...");
      const response = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          // Send both tokens with clear names
          oauthToken,   // For Google Calendar API
          idToken,      // For Firebase auth
          user: {
            uid: result.user.uid,
            displayName: result.user.displayName,
            email: result.user.email,
            photoURL: result.user.photoURL
          }
        }),
        credentials: 'include'
      });
      
      if (!response.ok) {
        console.error("Server auth failed:", await response.text());
      } else {
        console.log("Server auth succeeded");
      }
    } catch (err) {
      console.error("Error sending tokens to server:", err);
    }
    
    return { 
      success: true, 
      user: result.user,
      oauthToken,
      idToken 
    };
  } catch (error) {
    console.error("Error signing in with Google popup:", error);
    
    // Fall back to redirect method if popup fails
    try {
      console.log("Popup failed, trying redirect method instead");
      const googleProvider = createGoogleProvider();
      await signInWithRedirect(auth, googleProvider);
      return { success: true };
    } catch (redirectError) {
      console.error("Redirect method also failed:", redirectError);
      return { success: false, error: redirectError };
    }
  }
};

// Sign out - properly clears all tokens
export const signOut = async () => {
  try {
    // Clear OAuth token from storage
    clearOAuthToken();
    
    // Sign out from Firebase
    await firebaseSignOut(auth);
    console.log("Firebase sign out complete");
    
    // Clear session on server
    await fetch('/api/auth/signout', {
      method: 'POST',
      credentials: 'include'
    });
    
    return { success: true };
  } catch (error) {
    console.error("Error signing out:", error);
    return { success: false, error };
  }
};

// Get Google Calendar OAuth token (for API requests)
// This function returns the OAuth token, refreshing if needed
export const getGoogleCalendarToken = async (): Promise<string | null> => {
  // First check if we have a valid stored token
  const storedToken = getStoredOAuthToken();
  if (!storedToken) {
    console.log("No OAuth token available - user needs to re-authenticate");
    return null;
  }
  
  // If the access token is valid, return it
  if (Date.now() < (storedToken.expiry - 5 * 60 * 1000)) {
    console.log("Using valid stored OAuth access token");
    return storedToken.token;
  }
  
  // If we have a refresh token, use it to get a new access token
  if (storedToken.refreshToken) {
    console.log("Access token expired, attempting to refresh with refresh token");
    
    try {
      // Get current user to include in the request
      const currentUser = auth.currentUser;
      if (!currentUser) {
        console.log("No authenticated user found, cannot refresh token");
        return null;
      }
      
      // Get a fresh Firebase ID token for authentication with our server
      const idToken = await getIdToken(currentUser, true);
      
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
        console.log("Successfully refreshed OAuth token");
        
        // Store the new token
        const newTokenData = storeOAuthToken(
          data.oauthToken, 
          data.expiresIn || 3600, 
          data.refreshToken || storedToken.refreshToken // Keep old refresh token if not provided
        );
        
        return newTokenData.token;
      } else {
        throw new Error("No OAuth token returned from refresh endpoint");
      }
    } catch (error) {
      console.error("Error refreshing token:", error);
      
      // If refresh fails and we're still logged in, we might need to re-authenticate
      if (auth.currentUser) {
        console.log("Token refresh failed, user may need to re-authenticate");
      }
      
      return null;
    }
  }
  
  console.log("No refresh token available - user needs to re-authenticate");
  return null;
};

// Listen to auth state changes
export const onAuthChange = (callback: (user: User | null) => void) => {
  return onAuthStateChanged(auth, callback);
};

// Force re-authentication with updated scopes to get write permission
export const forceReauthWithUpdatedScopes = async () => {
  try {
    console.log('Forcing re-auth with updated scopes for write permission...');
    
    // Clear all tokens first
    clearOAuthToken();
    
    // Store a message for the user explaining why they need to sign in again
    window.localStorage.setItem('AUTH_MESSAGE', 'You need to sign in again to grant permission to modify your calendar.');
    
    // Add a flag to indicate we need calendar write permission
    window.localStorage.setItem('NEED_CALENDAR_WRITE', 'true');
    
    // Sign out
    await signOut();
    
    // Return success
    return { 
      success: true, 
      message: 'Please sign in again to grant calendar write permission. You were signed out because your current permissions only allow reading your calendar, not modifying it.'
    };
  } catch (error) {
    console.error('Error during forced re-authentication:', error);
    return { success: false, error };
  }
};

export { auth };
