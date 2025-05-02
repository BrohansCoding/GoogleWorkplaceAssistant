import { createContext, useState, useEffect, ReactNode } from "react";
import { User, onAuthStateChanged, getAuth } from "firebase/auth";
import { app } from "@/lib/firebase-setup";

// Define the AuthContext type
export type AuthContextType = {
  user: User | null;
  isLoading: boolean;
};

// Create the AuthContext with default values
export const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true
});

// Props for the AuthProvider component
interface AuthProviderProps {
  children: ReactNode;
}

export const SimpleAuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    console.log("SimpleAuthProvider: Initializing");
    
    // Get the Firebase auth instance
    const auth = getAuth(app);
    
    // Set up auth state listener
    const unsubscribe = onAuthStateChanged(auth, (authUser) => {
      console.log("Auth state changed:", authUser ? "LOGGED IN" : "LOGGED OUT");
      setUser(authUser);
      setIsLoading(false);
    });
    
    return () => unsubscribe();
  }, []);
  
  console.log("SimpleAuthProvider: Current state", { 
    user: user ? "LOGGED IN" : "NOT LOGGED IN",
    isLoading 
  });
  
  // Provide the auth context to children
  return (
    <AuthContext.Provider value={{ user, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export default SimpleAuthProvider;