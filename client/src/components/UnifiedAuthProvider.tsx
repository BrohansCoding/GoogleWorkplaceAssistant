import { createContext, useState, useEffect, ReactNode } from "react";
import { User, onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase-setup";
import { useToast } from "@/hooks/use-toast";
import { 
  getStoredOAuthToken, 
  syncTokensWithServer, 
  initializeTokenRefresh 
} from "@/lib/tokenManager";

// Type for our unified auth context
export interface UnifiedAuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  hasOAuthToken: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
}

// Create the context with default values
export const UnifiedAuthContext = createContext<UnifiedAuthContextType>({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  hasOAuthToken: false,
  login: async () => {},
  logout: async () => {}
});

interface UnifiedAuthProviderProps {
  children: ReactNode;
}

export const UnifiedAuthProvider = ({ children }: UnifiedAuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasOAuthToken, setHasOAuthToken] = useState(false);
  const { toast } = useToast();

  // Import these dynamically to avoid circular dependency issues
  const importAuthFunctions = async () => {
    const { signInWithGoogle, signOut } = await import("@/lib/firebase");
    return { signInWithGoogle, signOut };
  };

  // Login function
  const login = async () => {
    try {
      setIsLoading(true);
      const { signInWithGoogle } = await importAuthFunctions();
      const result = await signInWithGoogle();
      
      if (!result.success) {
        throw new Error(typeof result.error === 'string' ? result.error : "Authentication failed");
      }

      // User will be set by auth state change listener
      // OAuth tokens will be checked in useEffect
    } catch (error) {
      console.error("Login error:", error);
      toast({
        title: "Sign in failed",
        description: "There was a problem signing in with Google.",
        variant: "destructive",
      });
      setIsLoading(false);
    }
  };

  // Logout function
  const logout = async () => {
    try {
      setIsLoading(true);
      const { signOut } = await importAuthFunctions();
      await signOut();
      setHasOAuthToken(false);
      
      toast({
        title: "Signed out",
        description: "You have been successfully signed out.",
      });
    } catch (error) {
      console.error("Logout error:", error);
      toast({
        title: "Sign out failed",
        description: "There was a problem signing out.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Set up auth state listener
  useEffect(() => {
    console.log("UnifiedAuthProvider: Initializing");
    
    // Clear loading state after a maximum time to prevent infinite loading
    const loadingTimeout = setTimeout(() => {
      if (isLoading) {
        console.log("Force-clearing loading state after timeout");
        setIsLoading(false);
      }
    }, 5000);
    
    // Subscribe to Firebase auth state changes
    const unsubscribe = onAuthStateChanged(auth, (authUser) => {
      console.log("Auth state changed:", authUser ? "LOGGED IN" : "LOGGED OUT");
      setUser(authUser);
      
      // If user is authenticated, check for OAuth token
      if (authUser) {
        // Check for stored OAuth token
        const token = getStoredOAuthToken();
        const hasToken = !!token;
        console.log("OAuth token found:", hasToken);
        setHasOAuthToken(hasToken);
        
        // Always sync tokens with server
        syncTokensWithServer(authUser).then(success => {
          console.log("Token sync result:", success ? "SUCCESS" : "FAILED");
        });
        
        // If we have a token, initialize refresh
        if (token) {
          initializeTokenRefresh();
          // Clear loading state
          setIsLoading(false);
        } else {
          // Give a short delay to avoid infinite loading during redirect
          setTimeout(() => {
            // If still no token after delay, trigger re-auth
            const latestToken = getStoredOAuthToken();
            if (!latestToken) {
              handleAutoReauth(authUser);
            } else {
              setHasOAuthToken(true);
              setIsLoading(false);
            }
          }, 1000);
        }
      } else {
        // Not authenticated, clear loading
        setIsLoading(false);
      }
    });
    
    // Clean up subscription
    return () => {
      clearTimeout(loadingTimeout);
      unsubscribe();
    };
  }, []);
  
  // Function to automatically re-authenticate if needed
  const handleAutoReauth = async (currentUser: User) => {
    try {
      // Check if we're already processing re-auth
      if (localStorage.getItem('RE_AUTH_IN_PROGRESS') === 'true') {
        return;
      }
      
      console.log("User authenticated but no OAuth token, initiating automatic re-auth");
      localStorage.setItem('RE_AUTH_IN_PROGRESS', 'true');
      
      // Temporarily set loading to true during re-auth
      setIsLoading(true);
      
      // Import the signInWithGoogle function dynamically
      const { signInWithGoogle } = await importAuthFunctions();
      
      // Attempt to sign in with Google to get OAuth token
      await signInWithGoogle();
      
      // Clear the re-auth flag
      localStorage.removeItem('RE_AUTH_IN_PROGRESS');
      
    } catch (error) {
      console.error("Auto re-auth failed:", error);
      localStorage.removeItem('RE_AUTH_IN_PROGRESS');
      setIsLoading(false);
    }
  };

  // Store authentication state in local storage to handle tab syncing
  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'auth_state') {
        // Refresh the page to sync auth state across tabs
        window.location.reload();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    
    // Set auth state in storage when it changes
    if (!isLoading) {
      localStorage.setItem('auth_state', JSON.stringify({
        isAuthenticated: !!user,
        hasOAuthToken
      }));
    }

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [user, hasOAuthToken, isLoading]);

  // Log auth state for debugging
  useEffect(() => {
    console.log("UnifiedAuthProvider: Current state", { 
      user: user ? "LOGGED IN" : "NOT LOGGED IN",
      isLoading,
      hasOAuthToken
    });
  }, [user, isLoading, hasOAuthToken]);

  return (
    <UnifiedAuthContext.Provider 
      value={{ 
        user, 
        isLoading, 
        isAuthenticated: !!user,
        hasOAuthToken,
        login,
        logout
      }}
    >
      {children}
    </UnifiedAuthContext.Provider>
  );
};

export default UnifiedAuthProvider;