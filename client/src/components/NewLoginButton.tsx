import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CalendarIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getAuth, signInWithPopup, GoogleAuthProvider, getIdToken } from "firebase/auth";
import { app } from "@/lib/firebase-setup";

const NewLoginButton = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  
  const handleLogin = async () => {
    try {
      setIsLoading(true);
      console.log("Starting Google sign-in with popup...");
      
      const auth = getAuth(app);
      const provider = new GoogleAuthProvider();
      provider.addScope('https://www.googleapis.com/auth/calendar.readonly');
      provider.addScope('profile');
      provider.addScope('email');
      
      const result = await signInWithPopup(auth, provider);
      console.log("Sign in successful!", result.user.displayName);
      
      // Get an access token for Google Calendar API
      const credential = GoogleAuthProvider.credentialFromResult(result);
      
      // Debug the credential details
      console.log("Credential details:", credential ? {
        providerId: credential.providerId,
        hasAccessToken: !!credential.accessToken,
        tokenLength: credential.accessToken?.length
      } : "No credential");
      
      // Get access token from credential
      let token = credential?.accessToken;
      console.log("Access token from credential:", token ? `Present (length: ${token.length})` : "Missing");
      
      // IMPORTANT: We need to use the ID token for Firebase Auth but the access token for Google API
      // The access token is specifically for Google Calendar API
      if (!token && result.user) {
        console.log("No access token found, this will cause Google Calendar API to fail");
        
        // We'll still try to get an ID token for authentication with our server
        try {
          const idToken = await getIdToken(result.user, true);
          console.log("Got Firebase ID token as fallback");
          // Note: ID token cannot be used for Google Calendar API directly
          token = idToken;
        } catch (tokenError) {
          console.error("Error getting ID token:", tokenError);
        }
      }
      
      console.log("Final token to be sent to server:", token ? `Present (length: ${token.length})` : "No token");
      
      if (token) {
        // Send token to server
        const response = await fetch('/api/auth/google', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            token, 
            user: {
              uid: result.user.uid,
              displayName: result.user.displayName,
              email: result.user.email,
              photoURL: result.user.photoURL
            }
          }),
          credentials: 'include'
        });
        
        if (!response.ok) {
          console.error("Error sending token to server:", await response.text());
          throw new Error("Failed to authenticate with server");
        }
        
        console.log("Server authentication successful");
      } else {
        console.warn("No token available after sign-in, some features may not work");
      }
      
      toast({
        title: "Sign in successful",
        description: `Welcome, ${result.user.displayName || 'User'}!`,
      });
      
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

export default NewLoginButton;