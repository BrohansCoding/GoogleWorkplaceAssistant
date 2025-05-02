import { createContext, useState, useEffect, ReactNode } from "react";
import { User } from "firebase/auth";
import { onAuthChange, auth, checkRedirectResult } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";

// Type for our auth context
export type AuthContextType = {
  user: User | null;
  isLoading: boolean;
};

// Create the context with default values
export const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true
});

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);  // Changed to false to prevent perpetual loading
  const { toast } = useToast();

  // Handle authentication state changes
  useEffect(() => {
    console.log("AuthProvider: Initializing");
    
    // Check for redirect result first (on page load after redirect)
    const handleRedirectResult = async () => {
      try {
        console.log("AuthProvider: Checking redirect result");
        const result = await checkRedirectResult();
        
        if (result && result.user) {
          console.log("AuthProvider: Found user from redirect", result.user.uid);
          toast({
            title: "Successfully signed in",
            description: `Welcome, ${result.user.displayName || "user"}!`,
          });
        }
      } catch (error) {
        console.error("AuthProvider: Error checking redirect", error);
        toast({
          title: "Sign in failed",
          description: "There was a problem signing in with Google.",
          variant: "destructive",
        });
      }
    };
    
    // Set up auth state listener 
    const unsubscribe = onAuthChange((authUser) => {
      console.log("AuthProvider: Auth state changed", authUser ? "LOGGED IN" : "LOGGED OUT");
      setUser(authUser);
      setIsLoading(false);
    });
    
    // On mount, check for redirect results
    handleRedirectResult();
    
    // Clean up subscription
    return () => unsubscribe();
  }, [toast]);

  // Log current auth state for debugging
  useEffect(() => {
    console.log("AuthProvider: Current auth state", { 
      user: user ? "LOGGED IN" : "NOT LOGGED IN",
      isLoading
    });
  }, [user, isLoading]);

  return (
    <AuthContext.Provider value={{ user, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};