import { useEffect, useState } from 'react';
import { authStore } from '../stores/authStore';

export const useAuth = () => {
  const [isLoading, setIsLoading] = useState(true);
  const { isSignedIn, user } = authStore();

  useEffect(() => {
    const checkAuth = async () => {
      await authStore.getState().checkAuth();
      setIsLoading(false);
    };

    checkAuth();
  }, []);

  return {
    isLoading,
    isSignedIn,
    user,
  };
};
