import { useState, useEffect, useCallback } from 'react';
import { getIdToken, User, GoogleAuthProvider, getAuth, signInWithPopup } from 'firebase/auth';
import { auth } from '@/lib/firebase-setup';

/**
 * Custom hook for handling Firebase and OAuth tokens
 * This hook will keep track of tokens and refresh them when needed
 */
export const useFirebaseToken = (user: User | null) => {
  const [isTokenLoading, setIsTokenLoading] = useState(false);
  const [tokenError, setTokenError] = useState<Error | null>(null);
  const [lastAccessToken, setLastAccessToken] = useState<string | null>(null);

  // Function to get a fresh Firebase ID token
  const getIdTokenFresh = useCallback(async (): Promise<string | null> => {
    if (!user) {
      console.log('No user available to get ID token');
      return null;
    }

    try {
      setIsTokenLoading(true);
      setTokenError(null);
      
      // This will force refresh the token if it's expired
      const token = await getIdToken(user, true);
      console.log('Fresh ID token generated');
      
      return token;
    } catch (err) {
      console.error('Error getting fresh ID token:', err);
      setTokenError(err instanceof Error ? err : new Error('Failed to get ID token'));
      return null;
    } finally {
      setIsTokenLoading(false);
    }
  }, [user]);

  // Function to get a fresh OAuth access token (requires re-authentication)
  const getAccessToken = useCallback(async (): Promise<string | null> => {
    if (!user) {
      console.log('No user available to get access token');
      return null;
    }

    try {
      setIsTokenLoading(true);
      setTokenError(null);
      
      // To get a fresh OAuth token, we need to re-authenticate
      const auth = getAuth();
      const provider = new GoogleAuthProvider();
      
      // Request the same scopes we originally used
      provider.addScope('https://www.googleapis.com/auth/calendar.readonly');
      provider.addScope('profile');
      provider.addScope('email');
      
      // Force consent screen to ensure we get a refresh token
      provider.setCustomParameters({
        prompt: 'consent',
        access_type: 'offline'
      });
      
      // This will show a popup to the user
      console.log('Opening Google sign-in popup to refresh OAuth token...');
      const result = await signInWithPopup(auth, provider);
      
      // Get the OAuth access token
      const credential = GoogleAuthProvider.credentialFromResult(result);
      const accessToken = credential?.accessToken;
      
      if (!accessToken) {
        throw new Error('No access token returned from Google');
      }
      
      console.log('Fresh OAuth access token generated');
      setLastAccessToken(accessToken);
      
      return accessToken;
    } catch (err) {
      console.error('Error getting fresh OAuth access token:', err);
      setTokenError(err instanceof Error ? err : new Error('Failed to get access token'));
      return null;
    } finally {
      setIsTokenLoading(false);
    }
  }, [user]);

  // Function to send tokens to the backend for session storage
  const syncTokensWithBackend = useCallback(async () => {
    if (!user) return false;
    
    try {
      // Get both tokens
      const idToken = await getIdTokenFresh();
      
      // We only attempt to get a new access token if we don't have one
      // or if explicitly requested by calling getAccessToken() directly
      let accessToken = lastAccessToken;
      
      if (!idToken) return false;
      
      const response = await fetch('/api/auth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          idToken,
          accessToken,
          user: {
            uid: user.uid,
            displayName: user.displayName,
            email: user.email,
            photoURL: user.photoURL
          }
        }),
        credentials: 'include'
      });
      
      return response.ok;
    } catch (err) {
      console.error('Error syncing tokens with backend:', err);
      return false;
    }
  }, [user, getIdTokenFresh, lastAccessToken]);
  
  // Sync tokens when the user changes
  useEffect(() => {
    if (user) {
      syncTokensWithBackend();
    }
  }, [user, syncTokensWithBackend]);

  return {
    getIdToken: getIdTokenFresh,
    getAccessToken,
    syncTokensWithBackend,
    isTokenLoading,
    tokenError
  };
};

export default useFirebaseToken;