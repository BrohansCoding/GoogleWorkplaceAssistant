import { useContext, useCallback, useState } from "react";
import { AuthContext } from "@/context/AuthContext";
import { signInWithGoogle as firebaseSignInWithGoogle, signOut as firebaseSignOut } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";

export const useAuth = () => {
  const context = useContext(AuthContext);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  
  const { user, setUser } = context;

  const signInWithGoogle = useCallback(async () => {
    try {
      setIsLoading(true);
      const { user } = await firebaseSignInWithGoogle();
      setUser(user);
      toast({
        title: "Successfully signed in",
        description: `Welcome, ${user.displayName || "user"}!`,
      });
      return user;
    } catch (error) {
      console.error("Error signing in with Google:", error);
      toast({
        title: "Sign in failed",
        description: "There was a problem signing in with Google.",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [setUser, toast]);

  const signOut = useCallback(async () => {
    try {
      setIsLoading(true);
      await firebaseSignOut();
      setUser(null);
      toast({
        title: "Signed out",
        description: "You have been successfully signed out.",
      });
    } catch (error) {
      console.error("Error signing out:", error);
      toast({
        title: "Sign out failed",
        description: "There was a problem signing out.",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [setUser, toast]);

  const checkAuthState = useCallback(() => {
    // Auth state is already being handled by the AuthContext provider
    // This is just a convenience method to trigger a state check
  }, []);

  return {
    user,
    isAuthenticated: !!user,
    isLoading,
    signInWithGoogle,
    signOut,
    checkAuthState,
  };
};
