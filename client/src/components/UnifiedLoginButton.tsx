import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, LogIn, CheckCircle } from "lucide-react";
import { useUnifiedAuth } from "@/hooks/useUnifiedAuth";
import { useToast } from "@/hooks/use-toast";

interface UnifiedLoginButtonProps {
  variant?: "default" | "outline" | "secondary" | "ghost" | "destructive" | "link";
  size?: "default" | "sm" | "lg" | "icon";
  text?: string;
  className?: string;
  fullWidth?: boolean;
  showIcon?: boolean;
  onSuccess?: () => void;
}

const UnifiedLoginButton = ({
  variant = "default",
  size = "default",
  text = "Sign in with Google",
  className = "",
  fullWidth = false,
  showIcon = true,
  onSuccess
}: UnifiedLoginButtonProps) => {
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [justConnected, setJustConnected] = useState(false);
  const { login, isAuthenticated, hasOAuthToken } = useUnifiedAuth();
  const { toast } = useToast();
  
  useEffect(() => {
    if (isAuthenticated && hasOAuthToken && justConnected) {
      // When authentication is successful, show success message
      toast({
        title: "Successfully connected",
        description: "Your Google Workspace is now fully connected with all services",
        duration: 3000
      });
      
      // Reset our state
      setJustConnected(false);
      
      // Trigger success callback after a short delay
      if (onSuccess) {
        setTimeout(onSuccess, 500);
      }
    }
  }, [isAuthenticated, hasOAuthToken, justConnected, onSuccess, toast]);
  
  const handleLogin = async () => {
    if (isAuthenticated && hasOAuthToken) {
      if (onSuccess) onSuccess();
      return;
    }
    
    try {
      setIsLoggingIn(true);
      
      // Show a toast to inform the user what's happening
      toast({
        title: "Connecting to Google Workspace",
        description: "We'll request access to your Calendar, Drive, and Gmail",
        duration: 5000
      });
      
      await login();
      setJustConnected(true);
    } catch (error) {
      console.error("Login error:", error);
      toast({
        title: "Connection failed",
        description: "There was a problem connecting to Google. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoggingIn(false);
    }
  };
  
  // If already authenticated with OAuth token, show a success state
  if (isAuthenticated && hasOAuthToken) {
    return (
      <Button
        variant="outline"
        size={size}
        className={`${fullWidth ? 'w-full' : ''} ${className} bg-green-900/20 text-green-400 border-green-800 hover:bg-green-900/30`}
        onClick={onSuccess}
      >
        <CheckCircle className="mr-2 h-4 w-4" />
        Connected to Google Workspace
      </Button>
    );
  }
  
  return (
    <Button
      variant={variant}
      size={size}
      className={`${fullWidth ? 'w-full' : ''} ${className}`}
      onClick={handleLogin}
      disabled={isLoggingIn}
    >
      {isLoggingIn ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Connecting to Google...
        </>
      ) : (
        <>
          {showIcon && (
            <img 
              src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" 
              alt="Google logo" 
              className="mr-2 h-4 w-4" 
            />
          )}
          {text}
        </>
      )}
    </Button>
  );
};

export default UnifiedLoginButton;