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

// Google Auth Provider
const googleProvider = new GoogleAuthProvider();
// Request Google Calendar scope during sign-in
googleProvider.addScope('https://www.googleapis.com/auth/calendar.readonly');
// Add additional scopes if needed for your app
// For example, if you need access to profile info:
googleProvider.addScope('profile');
googleProvider.addScope('email');

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
        // User is already logged in, return the current user
        return { user: currentUser, token: null };
      }
      return null;
    }
    
    // Try to get token directly from the credential first
    const credential = GoogleAuthProvider.credentialFromResult(result);
    let token = credential?.accessToken;
    console.log("Got credential:", credential ? "YES" : "NO");
    console.log("Got token from credential:", token ? "YES" : "NO");
    
    // If no token from credential, get a fresh ID token directly 
    if (!token && result.user) {
      console.log("No access token from credential, getting fresh ID token...");
      try {
        token = await getIdToken(result.user, true);
        console.log("Got fresh ID token");
      } catch (tokenError) {
        console.error("Error getting ID token:", tokenError);
      }
    }
    
    // Pass token to server to store or use for API calls
    if (token) {
      console.log("Sending token to server...");
      try {
        const response = await fetch('/api/auth/google', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ token, user: {
            uid: result.user.uid,
            displayName: result.user.displayName,
            email: result.user.email,
            photoURL: result.user.photoURL
          }}),
          credentials: 'include'
        });
        console.log("Server response:", response.status);
      } catch (serverError) {
        console.error("Error sending token to server:", serverError);
        // Continue anyway - we'll handle auth client-side
      }
    } else {
      console.warn("No token available after redirect auth, some features may not work");
    }
    
    console.log("Authentication successful, returning user");
    return { user: result.user, token };
  } catch (error) {
    console.error("Error processing redirect result", error);
    throw error;
  }
};

// Sign in with Google
export const signInWithGoogle = async () => {
  try {
    console.log("Starting Google sign-in with redirect...");
    console.log("Current URL:", window.location.href);
    
    // Try to use popup instead of redirect, more reliable in Replit
    const result = await signInWithPopup(auth, googleProvider);
    console.log("Sign in with popup successful:", result.user.displayName);
    
    // Try to get token directly from the credential first
    const credential = GoogleAuthProvider.credentialFromResult(result);
    let token = credential?.accessToken;
    
    // If no token from credential, get a fresh ID token directly 
    if (!token && result.user) {
      console.log("No access token from credential, getting fresh ID token...");
      try {
        token = await getIdToken(result.user, true);
        console.log("Got fresh ID token");
      } catch (tokenError) {
        console.error("Error getting ID token:", tokenError);
      }
    }
    
    // Send token to server
    if (token) {
      try {
        console.log("Sending token to server after popup auth...");
        const response = await fetch('/api/auth/google', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            token, 
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
          console.log("Server auth succeeded after popup");
        }
      } catch (err) {
        console.error("Error sending token to server:", err);
      }
    } else {
      console.warn("No token available after sign-in, some features may not work");
    }
    
    return { success: true, user: result.user };
  } catch (error) {
    console.error("Error signing in with Google", error);
    // Fall back to redirect method if popup fails
    try {
      console.log("Popup failed, trying redirect method instead");
      await signInWithRedirect(auth, googleProvider);
      return { success: true };
    } catch (redirectError) {
      console.error("Redirect method also failed", redirectError);
      throw redirectError;
    }
  }
};

// Sign out
export const signOut = async () => {
  try {
    await firebaseSignOut(auth);
    // Clear session on server
    await fetch('/api/auth/signout', {
      method: 'POST',
      credentials: 'include'
    });
    return true;
  } catch (error) {
    console.error("Error signing out", error);
    throw error;
  }
};

// Listen to auth state changes
export const onAuthChange = (callback: (user: User | null) => void) => {
  return onAuthStateChanged(auth, callback);
};

export { auth };
