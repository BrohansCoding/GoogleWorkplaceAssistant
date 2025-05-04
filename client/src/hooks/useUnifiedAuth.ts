import { useContext } from 'react';
import { UnifiedAuthContext, UnifiedAuthContextType } from '@/components/UnifiedAuthProvider';

// Custom hook for accessing the UnifiedAuthContext
export const useUnifiedAuth = (): UnifiedAuthContextType => {
  const context = useContext(UnifiedAuthContext);
  
  if (context === undefined) {
    throw new Error('useUnifiedAuth must be used within a UnifiedAuthProvider');
  }
  
  return context;
};

export default useUnifiedAuth;