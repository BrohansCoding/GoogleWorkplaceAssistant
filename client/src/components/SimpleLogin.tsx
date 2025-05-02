import { useState, useContext, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { CalendarIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { signInWithGoogle } from "@/lib/firebase";
import { AuthContext } from "./SimpleAuthProvider";

const SimpleLogin = () => {
  const { isLoading } = useContext(AuthContext);
  const [signingIn, setSigningIn] = useState(false);
  
  // Force reset the signing in state when component renders
  useEffect(() => {
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
    <div className="flex flex-col items-center justify-center h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
      <div className="text-center p-8 max-w-md backdrop-blur-sm bg-white/70 rounded-2xl shadow-lg border border-white/40">
        <h1 className="text-4xl font-bold mb-2 text-indigo-900">G Assistant</h1>
        <p className="text-indigo-700 mb-6">
          Your intelligent assistant for productivity and organization
        </p>
        
        <div className="flex flex-wrap justify-center gap-6 mb-8">
          <div className="text-center p-4">
            <div className="w-16 h-16 mx-auto mb-2 rounded-full bg-blue-100 flex items-center justify-center">
              <CalendarIcon className="h-8 w-8 text-blue-600" />
            </div>
            <p className="text-sm font-medium text-gray-800">Calendar</p>
          </div>
          
          <div className="text-center p-4">
            <div className="w-16 h-16 mx-auto mb-2 rounded-full bg-emerald-100 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
            </div>
            <p className="text-sm font-medium text-gray-800">Folders</p>
          </div>
          
          <div className="text-center p-4">
            <div className="w-16 h-16 mx-auto mb-2 rounded-full bg-amber-100 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="text-sm font-medium text-gray-800">Email</p>
          </div>
        </div>
        
        <Button
          variant="outline" 
          className="flex items-center justify-center gap-2 px-6 py-6 bg-white/80 border border-indigo-100 rounded-xl shadow-sm hover:shadow-md transition duration-200 w-full max-w-xs mx-auto hover:bg-indigo-50"
          onClick={handleLogin}
          disabled={loading}
        >
          <img 
            src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" 
            alt="Google logo" 
            className="w-5 h-5" 
          />
          <span className="text-indigo-800 font-medium">
            {loading ? "Signing in..." : "Sign in with Google"}
          </span>
        </Button>
        
        <p className="mt-6 text-sm text-indigo-600">
          We'll help you manage your Calendar, Folders, and Email more efficiently
        </p>
      </div>
    </div>
  );
};

export default SimpleLogin;