import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, LogIn } from "lucide-react";
import { useUnifiedAuth } from "@/hooks/useUnifiedAuth";

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
  const { login, isAuthenticated } = useUnifiedAuth();
  
  const handleLogin = async () => {
    if (isAuthenticated) {
      if (onSuccess) onSuccess();
      return;
    }
    
    try {
      setIsLoggingIn(true);
      await login();
      if (onSuccess) onSuccess();
    } finally {
      setIsLoggingIn(false);
    }
  };
  
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
          Signing in...
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