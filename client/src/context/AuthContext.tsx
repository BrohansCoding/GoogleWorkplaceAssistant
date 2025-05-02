import { createContext, useState, useEffect, ReactNode } from "react";
import { User } from "firebase/auth";
import { onAuthChange } from "@/lib/firebase";

interface AuthContextType {
  user: User | null;
  setUser: (user: User | null) => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log("AuthProvider: Setting up auth state listener");
    // Subscribe to auth state changes
    const unsubscribe = onAuthChange((authUser) => {
      console.log("AuthProvider: Auth state changed", authUser ? "User logged in" : "User logged out");
      setUser(authUser);
      setLoading(false);
    });

    // Clean up subscription
    return () => unsubscribe();
  }, []);
  
  // This will be called from LoginScreen after successful redirect
  const handleSetUser = (newUser: User | null) => {
    console.log("AuthProvider: setUser called explicitly", newUser ? "with user" : "with null");
    setUser(newUser);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-neutral-50">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-neutral-300 border-t-google-blue" />
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, setUser: handleSetUser }}>
      {children}
    </AuthContext.Provider>
  );
};
