import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CalendarIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { signInWithGoogle } from "@/lib/firebase";

const NewLoginButton = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  
  const handleLogin = async () => {
    try {
      setIsLoading(true);
      console.log("Starting Google sign-in with combined Calendar AND Drive scopes...");
      
      // Use our signInWithGoogle function that now uses the combined provider
      // This will request all necessary permissions at once (Calendar and Drive)
      const result = await signInWithGoogle();
      
      if (!result.success) {
        throw new Error(typeof result.error === 'string' ? result.error : "Authentication failed");
      }
      
      if (result.user) {
        console.log("Sign in successful!", result.user.displayName);
        
        toast({
          title: "Sign in successful",
          description: `Welcome, ${result.user.displayName || 'User'}!`,
        });
      } else {
        // This happens with redirect flow - user will be redirected to Google
        console.log("Redirecting to Google sign-in...");
      }
    } catch (error) {
      console.error("Login error:", error);
      toast({
        title: "Sign in failed",
        description: "There was a problem signing in with Google.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-background">
      <div className="text-center p-8 max-w-md">
        <h1 className="text-3xl font-bold mb-2 text-foreground">Calendar Agent</h1>
        <p className="text-muted-foreground mb-8">
          Your intelligent assistant for Google Calendar management
        </p>
        
        <div className="w-64 h-64 mx-auto mb-8 rounded-full bg-card flex items-center justify-center border border-border shadow-lg">
          <CalendarIcon className="h-24 w-24 text-primary" />
        </div>
        
        <Button
          variant="outline" 
          className="flex items-center justify-center gap-2 px-6 py-6 bg-card/50 border border-border rounded-md shadow-md hover:shadow-lg transition duration-200 w-full max-w-xs mx-auto hover:bg-primary hover:text-primary-foreground"
          onClick={handleLogin}
          disabled={isLoading}
        >
          <img 
            src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" 
            alt="Google logo" 
            className="w-5 h-5" 
          />
          <span className="font-medium">
            {isLoading ? "Signing in..." : "Sign in with Google"}
          </span>
        </Button>
        
        <p className="mt-6 text-sm text-muted-foreground">
          We'll access your Google Calendar to provide personalized assistance
        </p>
      </div>
    </div>
  );
};

export default NewLoginButton;