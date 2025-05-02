import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  signInWithPopup, 
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider, 
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User
} from "firebase/auth";

// Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "",
  authDomain: `${import.meta.env.VITE_FIREBASE_PROJECT_ID || ""}.firebaseapp.com`,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "",
  storageBucket: `${
    import.meta.env.VITE_FIREBASE_PROJECT_ID || ""
  }.appspot.com`,
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "",
};

// Debug Firebase configuration (without showing the entire API key)
console.log("Firebase Configuration (Debug):", {
  apiKeyPrefix: firebaseConfig.apiKey ? firebaseConfig.apiKey.substring(0, 5) + "..." : "missing",
  authDomain: firebaseConfig.authDomain,
  projectId: firebaseConfig.projectId,
  appIdPrefix: firebaseConfig.appId ? firebaseConfig.appId.substring(0, 5) + "..." : "missing",
});

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Google Auth Provider
const googleProvider = new GoogleAuthProvider();
// Request Google Calendar scope during sign-in
googleProvider.addScope('https://www.googleapis.com/auth/calendar.readonly');

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
    
    // This gives you a Google Access Token
    const credential = GoogleAuthProvider.credentialFromResult(result);
    const token = credential?.accessToken;
    console.log("Got credential:", credential ? "YES" : "NO");
    console.log("Got token:", token ? "YES" : "NO");
    
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
    // Use redirect instead of popup
    await signInWithRedirect(auth, googleProvider);
    // The page will redirect to Google and then back to the app
    // The result will be handled by checkRedirectResult on page load
    return { success: true };
  } catch (error) {
    console.error("Error signing in with Google", error);
    throw error;
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
