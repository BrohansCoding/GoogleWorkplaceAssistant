import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Database, FolderOpen, LogIn } from "lucide-react";
import { signInWithGoogleDriveScope } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";

// No need for a complex type since we're handling all cases manually

interface DriveAuthButtonProps {
  onAuthSuccess?: () => void;
}

const DriveAuthButton = ({ onAuthSuccess }: DriveAuthButtonProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleDriveAuth = async () => {
    setIsLoading(true);
    try {
      // Call specialized function for Drive authentication
      const result = await signInWithGoogleDriveScope();
      
      if (result.success) {
        toast({
          title: "Drive Access Granted",
          description: "You can now access your Google Drive files and folders.",
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
            : "Failed to authenticate with Google Drive.";
            
        toast({
          title: "Authentication Error",
          description: errorMessage,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Drive authentication error:", error);
      toast({
        title: "Authentication Failed",
        description: "Could not authenticate with Google Drive. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      onClick={handleDriveAuth}
      disabled={isLoading}
      className="flex items-center gap-2 bg-emerald-700 hover:bg-emerald-600 text-white"
    >
      {isLoading ? (
        <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
      ) : (
        <FolderOpen className="h-4 w-4" />
      )}
      <span>{isLoading ? "Connecting..." : "Connect to Drive"}</span>
    </Button>
  );
};

export default DriveAuthButton;