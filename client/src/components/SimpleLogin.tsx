import { useState, useContext, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { CalendarIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { signInWithGoogle } from "@/lib/firebase";
import { AuthContext } from "./SimpleAuthProvider";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

const SimpleLogin = () => {
  const { isLoading } = useContext(AuthContext);
  const [signingIn, setSigningIn] = useState(false);
  const [authMessage, setAuthMessage] = useState<string | null>(null);
  const [needsWritePermission, setNeedsWritePermission] = useState(false);
  
  // Force reset the signing in state when component renders
  useEffect(() => {
    // Check for authentication message
    const storedMessage = window.localStorage.getItem('AUTH_MESSAGE');
    if (storedMessage) {
      setAuthMessage(storedMessage);
      // Clear it after reading
      window.localStorage.removeItem('AUTH_MESSAGE');
    }
    
    // Check if we need calendar write permission
    const needsWrite = window.localStorage.getItem('NEED_CALENDAR_WRITE');
    if (needsWrite === 'true') {
      setNeedsWritePermission(true);
      // Don't remove this flag - we'll need it for the sign-in process
    }
    
    setSigningIn(false);
  }, []);
  
  const { toast } = useToast();
  
  const handleLogin = async () => {
    try {
      console.log("SimpleLogin: Starting Google sign-in process");
      setSigningIn(true);
      await signInWithGoogle();
      // Page will redirect to Google
    } catch (error) {
      console.error("SimpleLogin: Sign in failed", error);
      toast({
        title: "Sign in failed",
        description: "There was a problem signing in with Google.",
        variant: "destructive",
      });
      setSigningIn(false);
    }
  };

  const loading = isLoading || signingIn;
  
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gradient-to-br from-gray-900 to-gray-800">
      <div className="text-center p-8 max-w-md backdrop-blur-sm bg-gray-800/70 rounded-2xl shadow-lg border border-gray-700">
        <h1 className="text-4xl font-bold mb-2 text-white">G Assistant</h1>
        <p className="text-gray-300 mb-4">
          Your intelligent assistant for productivity and organization
        </p>
        
        {authMessage && (
          <Alert className="mb-4 bg-amber-950 border-amber-800 text-left">
            <AlertCircle className="h-4 w-4 text-amber-400" />
            <AlertTitle className="text-amber-300">Authentication Required</AlertTitle>
            <AlertDescription className="text-amber-200">
              {authMessage}
            </AlertDescription>
          </Alert>
        )}
        
        {needsWritePermission && !authMessage && (
          <Alert className="mb-4 bg-blue-950 border-blue-800 text-left">
            <AlertCircle className="h-4 w-4 text-blue-400" />
            <AlertTitle className="text-blue-300">Calendar Write Permission</AlertTitle>
            <AlertDescription className="text-blue-200">
              You're being asked to sign in again to grant permission for adding and removing calendar events.
            </AlertDescription>
          </Alert>
        )}
        
        <div className="flex flex-wrap justify-center gap-6 mb-8">
          <div className="text-center p-4">
            <div className="w-16 h-16 mx-auto mb-2 rounded-full bg-blue-900 flex items-center justify-center">
              <CalendarIcon className="h-8 w-8 text-blue-400" />
            </div>
            <p className="text-sm font-medium text-gray-300">Calendar</p>
          </div>
          
          <div className="text-center p-4">
            <div className="w-16 h-16 mx-auto mb-2 rounded-full bg-emerald-900 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
            </div>
            <p className="text-sm font-medium text-gray-300">Folders</p>
          </div>
          
          <div className="text-center p-4">
            <div className="w-16 h-16 mx-auto mb-2 rounded-full bg-amber-900 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="text-sm font-medium text-gray-300">Email</p>
          </div>
        </div>
        
        <Button
          variant="outline" 
          className="flex items-center justify-center gap-2 px-6 py-6 bg-gray-700 border border-gray-600 rounded-xl shadow-sm hover:shadow-md transition duration-200 w-full max-w-xs mx-auto hover:bg-gray-600 text-white"
          onClick={handleLogin}
          disabled={loading}
        >
          <img 
            src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" 
            alt="Google logo" 
            className="w-5 h-5" 
          />
          <span className="text-gray-100 font-medium">
            {loading ? "Signing in..." : needsWritePermission 
              ? "Sign in with Enhanced Access" 
              : "Sign in with Google"}
          </span>
        </Button>
        
        <p className="mt-6 text-sm text-gray-400">
          We'll help you manage your Calendar, Folders, and Email more efficiently
        </p>
      </div>
    </div>
  );
};

export default SimpleLogin;