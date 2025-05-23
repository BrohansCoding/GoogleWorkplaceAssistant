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

// Create Google Auth Provider with Calendar scopes only
const createGoogleCalendarProvider = () => {
  const provider = new GoogleAuthProvider();
  
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

// Create Google Auth Provider specifically for Drive access
const createGoogleDriveProvider = () => {
  const provider = new GoogleAuthProvider();
  
  console.log('Creating Google provider with FULL permissions for Drive...');
  // Add Drive access scopes for full access to Drive files and folders
  provider.addScope('https://www.googleapis.com/auth/drive');              // Full access to Drive
  provider.addScope('https://www.googleapis.com/auth/drive.file');         // Access to files created/opened by the app (redundant but kept for compatibility)
  
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

// Create a combined provider with ALL scopes (Calendar, Drive, and Gmail)
const createCombinedProvider = () => {
  const provider = new GoogleAuthProvider();
  
  console.log('Creating Google provider with FULL permissions for Calendar, Drive, and Gmail...');
  
  // Calendar scopes - full access
  provider.addScope('https://www.googleapis.com/auth/calendar');           // Full access to Calendar
  provider.addScope('https://www.googleapis.com/auth/calendar.events');    // Full access to Events
  
  // Drive scopes - full access
  provider.addScope('https://www.googleapis.com/auth/drive');              // Full access to Drive
  provider.addScope('https://www.googleapis.com/auth/drive.file');         // Access to files created/opened by the app
  
  // Gmail scopes
  provider.addScope('https://www.googleapis.com/auth/gmail.readonly');     // Read-only access to Gmail
  provider.addScope('https://www.googleapis.com/auth/gmail.modify');       // Modify but not delete emails
  provider.addScope('https://www.googleapis.com/auth/gmail.labels');       // Manage labels
  
  // Always include these basic scopes
  provider.addScope('profile');
  provider.addScope('email');
  
  // CRITICAL: These parameters ensure we get a refresh token
  // - 'prompt=consent' forces the consent screen always
  // - 'access_type=offline' requests a refresh token
  // - 'include_granted_scopes=true' ensures all previously granted scopes are included
  provider.setCustomParameters({
    prompt: 'consent',
    access_type: 'offline',
    include_granted_scopes: 'true'
  });
  
  return provider;
};

// Default provider now uses the combined provider that requests all scopes
const createGoogleProvider = createCombinedProvider;

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
    console.log("Starting Google sign-in with ALL required API scopes...");
    
    // First, clear any previous tokens to ensure we get a fresh consent screen
    // This helps ensure we'll get a refresh token 
    clearOAuthToken();
    
    // If we have any auth info stored locally, clear it first
    localStorage.removeItem('RE_AUTH_IN_PROGRESS');
    localStorage.removeItem('NEED_CALENDAR_WRITE');
    localStorage.removeItem('NEED_DRIVE_ACCESS');
    localStorage.removeItem('NEED_FULL_DRIVE_ACCESS');
    localStorage.removeItem('AUTH_TYPE');
    localStorage.removeItem('AUTH_MESSAGE');
    
    // Create provider with proper scopes - this is critical
    // The provider MUST request all needed scopes with prompt=consent, access_type=offline
    const googleProvider = createGoogleProvider();
    
    // Try to use popup which is more reliable in many environments
    const result = await signInWithPopup(auth, googleProvider);
    console.log("Sign in with popup successful:", result.user.displayName);
    
    // Get OAuth token for Google APIs
    const credential = GoogleAuthProvider.credentialFromResult(result);
    const oauthToken = credential?.accessToken;
    
    // Attempt to get refresh token if available (might be in the credential)
    // Note: popup flow doesn't always include refresh token in the credential
    // It will be returned in the exchange request to the server
    // TypeScript doesn't know this property exists, so we need to cast
    const refreshToken = (credential as any)?.refreshToken;
    console.log("OAuth refresh token in credential:", refreshToken ? "PRESENT" : "NOT AVAILABLE");
    
    if (!oauthToken) {
      console.error("Failed to get OAuth token from Google sign-in!");
      return { success: false, error: "No OAuth token received" };
    }
    
    console.log("OAuth token received:", {
      exists: !!oauthToken,
      length: oauthToken?.length
    });
    
    // Store OAuth token (and refresh token if available)
    if (refreshToken) {
      storeOAuthToken(oauthToken, 3600, refreshToken);
    } else {
      storeOAuthToken(oauthToken);
    }
    
    // Get Firebase ID token for our backend
    let idToken = null;
    try {
      idToken = await getIdToken(result.user, true);
      console.log("Firebase ID token received");
    } catch (err) {
      console.error("Error getting Firebase ID token:", err);
    }
    
    // Send tokens to server - important for server-side refresh
    try {
      console.log("Sending tokens to server...");
      const response = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          // Send all tokens with clear names
          oauthToken,         // For Google API access
          refreshToken,       // For OAuth refresh (if available)
          idToken,            // For Firebase auth
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
        // Check if the server response includes a refresh token
        try {
          const data = await response.json();
          if (data.refreshToken && !refreshToken) {
            console.log("Received refresh token from server exchange");
            storeOAuthToken(oauthToken, data.expiresIn || 3600, data.refreshToken);
          }
          console.log("Server auth succeeded");
        } catch (e) {
          console.log("Server auth succeeded (no JSON response)");
        }
      }
    } catch (err) {
      console.error("Error sending tokens to server:", err);
    }
    
    return { 
      success: true, 
      user: result.user,
      oauthToken,
      refreshToken,
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
// Generic OAuth token getter that can be used for any Google API
export const getGoogleOAuthToken = async (): Promise<string | null> => {
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

// Legacy function - uses the generic OAuth token getter
export const getGoogleCalendarToken = getGoogleOAuthToken;

// Get Gmail OAuth token (for API requests)
export const getGoogleGmailToken = getGoogleOAuthToken;

// Listen to auth state changes
export const onAuthChange = (callback: (user: User | null) => void) => {
  return onAuthStateChanged(auth, callback);
};

// Special function for Drive authentication
export const signInWithGoogleDriveScope = async () => {
  try {
    console.log("Starting Google sign-in with explicit DRIVE API scopes...");
    
    // Create provider with Drive-specific scopes
    const driveProvider = createGoogleDriveProvider();
    
    // Store that we're specifically authenticating for Drive
    window.localStorage.setItem('AUTH_TYPE', 'DRIVE');
    
    // Try to use popup which is more reliable in many environments
    const result = await signInWithPopup(auth, driveProvider);
    console.log("Sign in with popup successful for Drive access:", result.user.displayName);
    
    // Get OAuth token for Google Drive API
    const credential = GoogleAuthProvider.credentialFromResult(result);
    const oauthToken = credential?.accessToken;
    
    if (!oauthToken) {
      console.error("Failed to get OAuth token from Google sign-in for Drive!");
      return { success: false, error: "No OAuth token received for Drive access" };
    }
    
    console.log("OAuth token for Drive received:", {
      exists: !!oauthToken,
      length: oauthToken?.length
    });
    
    // Store OAuth token with Drive prefix to differentiate
    storeOAuthToken(oauthToken);
    
    // Get Firebase ID token for our backend
    let idToken = null;
    try {
      idToken = await getIdToken(result.user, true);
      console.log("Firebase ID token received for Drive auth");
    } catch (err) {
      console.error("Error getting Firebase ID token:", err);
    }
    
    // Send tokens to server with explicit Drive flag
    try {
      console.log("Sending Drive tokens to server...");
      const response = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          oauthToken,   // This token has full Drive scope
          idToken,      // Firebase auth
          isDriveAuth: true, // Explicitly mark as Drive auth
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
        console.error("Server Drive auth failed:", await response.text());
      } else {
        console.log("Server Drive auth succeeded");
      }
    } catch (err) {
      console.error("Error sending Drive tokens to server:", err);
    }
    
    return { 
      success: true, 
      user: result.user,
      oauthToken,
      idToken,
      forDrive: true
    };
  } catch (error) {
    console.error("Error signing in with Google popup for Drive:", error);
    
    // Fall back to redirect method if popup fails
    try {
      console.log("Popup failed for Drive auth, trying redirect method instead");
      const driveProvider = createGoogleDriveProvider();
      // Store that we're specifically authenticating for Drive in redirect flow
      window.localStorage.setItem('AUTH_TYPE', 'DRIVE');
      await signInWithRedirect(auth, driveProvider);
      return { success: true, redirecting: true };
    } catch (redirectError) {
      console.error("Drive redirect method also failed:", redirectError);
      return { success: false, error: redirectError };
    }
  }
};

// Force re-authentication with updated scopes to get write permission
export const forceReauthWithUpdatedScopes = async () => {
  try {
    console.log('Forcing re-auth with updated scopes for Drive file access...');
    
    // Clear all tokens first
    clearOAuthToken();
    
    // Store a message for the user explaining why they need to sign in again
    window.localStorage.setItem('AUTH_MESSAGE', 'You need to sign in again to grant permission to access selected Google Drive files.');
    
    // Add a flag to indicate we need full drive access
    window.localStorage.setItem('NEED_DRIVE_ACCESS', 'true');
    window.localStorage.setItem('NEED_FULL_DRIVE_ACCESS', 'true');
    
    // Sign out
    await signOut();
    
    // Return success
    return { 
      success: true, 
      message: 'Please sign in again to grant Google Drive file access permissions. You were signed out because your current permissions are insufficient for accessing your files.'
    };
  } catch (error) {
    console.error('Error during forced re-authentication:', error);
    return { success: false, error };
  }
};

export { auth };
