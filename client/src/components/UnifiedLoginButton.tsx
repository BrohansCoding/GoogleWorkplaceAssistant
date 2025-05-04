import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, LogIn, CheckCircle, AlertCircle, ExternalLink } from "lucide-react";
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
  const [loginError, setLoginError] = useState<string | null>(null);
  const { login, isAuthenticated, hasOAuthToken } = useUnifiedAuth();
  const { toast } = useToast();
  
  // Check for Firebase configuration
  const hasValidFirebaseConfig = () => {
    const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
    const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;
    const appId = import.meta.env.VITE_FIREBASE_APP_ID;
    
    return Boolean(apiKey && projectId && appId);
  };
  
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
      setLoginError(null);
      
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
    
    // Validate Firebase configuration first
    if (!hasValidFirebaseConfig()) {
      console.error("Missing Firebase configuration. Check environment variables.");
      toast({
        title: "Configuration Error",
        description: "Firebase configuration is incomplete. Please check the application setup.",
        variant: "destructive",
        duration: 5000
      });
      setLoginError("Firebase configuration error. Please check environment variables.");
      return;
    }
    
    try {
      setIsLoggingIn(true);
      setLoginError(null);
      
      // Show a toast to inform the user what's happening
      toast({
        title: "Connecting to Google Workspace",
        description: "We'll request access to your Calendar, Drive, and Gmail",
        duration: 5000
      });
      
      await login();
      setJustConnected(true);
    } catch (error: any) {
      console.error("Login error:", error);
      
      // Determine the error type to provide more helpful messages
      let errorMessage = "There was a problem connecting to Google. Please try again.";
      
      if (error.code === 'auth/popup-blocked') {
        errorMessage = "Popup was blocked by your browser. Please enable popups or try using Incognito mode.";
      } else if (error.code === 'auth/popup-closed-by-user') {
        errorMessage = "Authentication popup was closed before completing the sign-in process.";
      } else if (error.code === 'auth/unauthorized-domain') {
        errorMessage = "This domain is not authorized for Firebase authentication. Check Firebase Console settings.";
      } else if (error.message && error.message.includes('CORS')) {
        errorMessage = "Cross-origin request blocked. Check Firebase Authentication domain settings.";
      } else if (error.code === 'auth/network-request-failed') {
        errorMessage = "Network error. Check your internet connection and try again.";
      }
      
      setLoginError(errorMessage);
      
      toast({
        title: "Connection failed",
        description: errorMessage,
        variant: "destructive",
        duration: 7000
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
    <div className="flex flex-col">
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
      
      {/* Error message display */}
      {loginError && (
        <div className="mt-4 p-4 border border-red-700 bg-red-900/20 rounded-md text-red-400 text-sm">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">{loginError}</p>
              <p className="mt-2 text-xs text-red-300">
                If using a deployed app, make sure your domain is added to the authorized domains in Firebase Authentication settings.
                <a 
                  href="https://console.firebase.google.com/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center mt-1 text-red-300 hover:text-red-200"
                >
                  Open Firebase Console <ExternalLink className="ml-1 h-3 w-3" />
                </a>
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UnifiedLoginButton;