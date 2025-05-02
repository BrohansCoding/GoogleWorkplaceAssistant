import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CalendarIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { signInWithGoogle } from "@/lib/firebase";

const LoginButton = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  
  const handleLogin = async () => {
    try {
      console.log("LoginButton: Starting Google sign-in process");
      setIsLoading(true);
      await signInWithGoogle();
      // Page will redirect to Google
    } catch (error) {
      console.error("LoginButton: Sign in failed", error);
      toast({
        title: "Sign in failed",
        description: "There was a problem signing in with Google.",
        variant: "destructive",
      });
      setIsLoading(false);
    }
  };
  
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-neutral-50">
      <div className="text-center p-8 max-w-md">
        <h1 className="text-3xl font-bold mb-2 text-neutral-900">Calendar Agent</h1>
        <p className="text-neutral-700 mb-8">
          Your intelligent assistant for Google Calendar management
        </p>
        
        <div className="w-64 h-64 mx-auto mb-8 rounded-full bg-neutral-100 flex items-center justify-center">
          <CalendarIcon className="h-24 w-24 text-google-blue" />
        </div>
        
        <Button
          variant="outline" 
          className="flex items-center justify-center gap-2 px-6 py-6 bg-white border border-neutral-300 rounded-md shadow-sm hover:shadow-md transition duration-200 w-full max-w-xs mx-auto"
          onClick={handleLogin}
          disabled={isLoading}
        >
          <img 
            src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" 
            alt="Google logo" 
            className="w-5 h-5" 
          />
          <span className="text-neutral-800 font-medium">
            {isLoading ? "Signing in..." : "Sign in with Google"}
          </span>
        </Button>
        
        <p className="mt-6 text-sm text-neutral-600">
          We'll access your Google Calendar to provide personalized assistance
        </p>
      </div>
    </div>
  );
};

export default LoginButton;