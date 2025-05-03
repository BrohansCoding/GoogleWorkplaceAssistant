import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Mail } from "lucide-react";
import { signInWithGoogle } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";

interface EmailAuthButtonProps {
  onAuthSuccess?: () => void;
}

export const EmailAuthButton = ({ onAuthSuccess }: EmailAuthButtonProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleEmailAuth = async () => {
    setIsLoading(true);
    try {
      // Use the standard authentication function which now includes Gmail scope
      const result = await signInWithGoogle();
      
      if (result.success) {
        toast({
          title: "Gmail Access Granted",
          description: "You can now access your Gmail messages.",
          variant: "default",
        });
        
        // Call success callback if provided
        if (onAuthSuccess) {
          onAuthSuccess();
        }
      } else {
        // Handle the error case
        const errorMessage = typeof result.error === 'string'
          ? result.error
          : result.error instanceof Error
            ? result.error.message
            : "Failed to authenticate with Gmail.";
            
        toast({
          title: "Authentication Error",
          description: errorMessage,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Gmail authentication error:", error);
      toast({
        title: "Authentication Failed",
        description: "Could not authenticate with Gmail. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      onClick={handleEmailAuth}
      disabled={isLoading}
      className="flex items-center gap-2 bg-purple-700 hover:bg-purple-600 text-white"
    >
      {isLoading ? (
        <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
      ) : (
        <Mail className="h-4 w-4" />
      )}
      <span>{isLoading ? "Connecting..." : "Connect to Gmail"}</span>
    </Button>
  );
};

export default EmailAuthButton;