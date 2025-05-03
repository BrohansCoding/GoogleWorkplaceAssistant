import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "lucide-react";
import { signInWithGoogle } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";

interface CalendarAuthButtonProps {
  onAuthSuccess?: () => void;
}

const CalendarAuthButton = ({ onAuthSuccess }: CalendarAuthButtonProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleCalendarAuth = async () => {
    setIsLoading(true);
    try {
      // Call specialized function for Calendar authentication
      const result = await signInWithGoogle();
      
      if (result.success) {
        toast({
          title: "Calendar Access Granted",
          description: "You can now access your Google Calendar events.",
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
            : "Failed to authenticate with Google Calendar.";
            
        toast({
          title: "Authentication Error",
          description: errorMessage,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Calendar authentication error:", error);
      toast({
        title: "Authentication Failed",
        description: "Could not authenticate with Google Calendar. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      onClick={handleCalendarAuth}
      disabled={isLoading}
      className="flex items-center gap-2 bg-blue-700 hover:bg-blue-600 text-white"
    >
      {isLoading ? (
        <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
      ) : (
        <Calendar className="h-4 w-4" />
      )}
      <span>{isLoading ? "Connecting..." : "Connect to Calendar"}</span>
    </Button>
  );
};

export default CalendarAuthButton;