import { useState, useEffect, useCallback } from 'react';
import { getIdToken, User } from 'firebase/auth';
import { auth } from '@/lib/firebase-setup';

/**
 * Custom hook for handling Firebase tokens
 * This hook will keep track of the current ID token and refresh it
 * when needed for API calls
 */
export const useFirebaseToken = (user: User | null) => {
  const [isTokenLoading, setIsTokenLoading] = useState(false);
  const [tokenError, setTokenError] = useState<Error | null>(null);

  // Function to get a fresh ID token
  const getToken = useCallback(async (): Promise<string | null> => {
    if (!user) {
      console.log('No user available to get token');
      return null;
    }

    try {
      setIsTokenLoading(true);
      setTokenError(null);
      
      // This will force refresh the token if it's expired
      const token = await getIdToken(user, true);
      console.log('Fresh token generated');
      
      return token;
    } catch (err) {
      console.error('Error getting fresh token:', err);
      setTokenError(err instanceof Error ? err : new Error('Failed to get token'));
      return null;
    } finally {
      setIsTokenLoading(false);
    }
  }, [user]);

  // Function to send the token to the backend for session storage
  const syncTokenWithBackend = useCallback(async () => {
    if (!user) return false;
    
    try {
      const token = await getToken();
      if (!token) return false;
      
      const response = await fetch('/api/auth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          token,
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
      console.error('Error syncing token with backend:', err);
      return false;
    }
  }, [user, getToken]);
  
  // Sync the token when the user changes
  useEffect(() => {
    if (user) {
      syncTokenWithBackend();
    }
  }, [user, syncTokenWithBackend]);

  return {
    getToken,
    syncTokenWithBackend,
    isTokenLoading,
    tokenError
  };
};

export default useFirebaseToken;