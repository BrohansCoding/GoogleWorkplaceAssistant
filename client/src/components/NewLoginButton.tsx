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
      
      // IMPORTANT: The scope MUST be exact for Google Calendar API
      // This is the critical part that ensures we get a token with calendar access
      provider.addScope('https://www.googleapis.com/auth/calendar.readonly');
      provider.addScope('https://www.googleapis.com/auth/calendar.events.readonly');
      provider.addScope('profile');
      provider.addScope('email');
      
      // Force consent screen to ensure we get all permissions
      provider.setCustomParameters({
        prompt: 'consent',
        access_type: 'offline'
      });
      
      console.log("Starting Google sign-in with correct calendar scopes...");
      const result = await signInWithPopup(auth, provider);
      console.log("Sign in successful!", result.user.displayName);
      
      // Get OAuth tokens for Google Calendar API - this is crucial
      const credential = GoogleAuthProvider.credentialFromResult(result);
      
      // Debug the credential details
      console.log("Credential details:", credential ? {
        providerId: credential.providerId,
        hasAccessToken: !!credential.accessToken,
        tokenLength: credential.accessToken?.length
      } : "No credential");
      
      // The OAuth access token is what we need for Google Calendar API
      const accessToken = credential?.accessToken;
      console.log("Access token:", accessToken ? `Present (length: ${accessToken.length})` : "Missing");
      
      // We now need to get the refresh token from the credential also
      // When prompt='consent' and access_type='offline' are set, we should receive a refresh token
      // This part requires examining credential response or making a server-side token exchange
      
      // Get refresh token - this is tricky with Firebase Auth since it doesn't expose refresh tokens directly
      // But we can include logic to extract it from the credential object
      let refreshToken = null;
      
      // In Firebase Auth, the refresh token might be available within auth.currentUser
      // First attempt to get it from the credential directly
      try {
        // @ts-ignore - Access internal properties carefully
        if (credential && credential._tokenResponse && credential._tokenResponse.refreshToken) {
          // @ts-ignore - This is not in the official type definitions but often exists
          refreshToken = credential._tokenResponse.refreshToken;
          console.log("Refresh token found in credential:", refreshToken ? `Present (length: ${refreshToken.length})` : "Missing");
        }
      } catch (refreshTokenError) {
        console.warn("Could not extract refresh token from credential:", refreshTokenError);
      }
      
      // Also get ID token for Firebase Auth verification on our server
      let idToken = null;
      try {
        idToken = result.user ? await getIdToken(result.user, true) : null;
        console.log("ID token retrieved:", idToken ? `Present (length: ${idToken.length})` : "Missing");
      } catch (tokenError) {
        console.error("Error getting ID token:", tokenError);
      }
      
      if (!accessToken) {
        console.error("No access token found! Google Calendar API will fail without it.");
        toast({
          title: "Authentication issue",
          description: "Failed to get access to your Google Calendar. Please try again.",
          variant: "destructive",
        });
        return;
      }
      
      // Store OAuth tokens in localStorage
      if (accessToken) {
        // Import the storage function
        const { storeOAuthToken } = await import('@/lib/firebase');
        storeOAuthToken(accessToken, 3600, refreshToken || undefined);
      }
      
      // Send tokens to server with clear parameter names for consistency
      const response = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          oauthToken: accessToken,  // Be explicit that this is the OAuth access token
          refreshToken,             // Include refresh token if we have it
          idToken,                  // Also send Firebase ID token
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
        console.error("Error sending tokens to server:", await response.text());
        throw new Error("Failed to authenticate with server");
      }
      
      console.log("Server authentication successful");
      
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