import config from '../config/environment';

let clerkGetToken: (() => Promise<string | null>) | null = null;

export const setTokenGetter = (fn: any) => {
  clerkGetToken = fn;
};

/**
 * Get token from local storage (Clerk only)
 */
export const getToken = async (): Promise<string | null> => {
  if (clerkGetToken) {
    try {
      const token = await clerkGetToken();
      if (token) return token;
    } catch (e) {
      console.error('Error getting token from Clerk:', e);
    }
  }
  // Fallback to local storage
  return localStorage.getItem(config.AUTH.TOKEN_STORAGE_KEY);
};

/**
 * Get auth config for axios requests
 */
export const getAuthConfig = async () => {
  const token = await getToken();
  return {
    headers: {
      'Content-Type': 'application/json',
      Authorization: token ? `Bearer ${token}` : ''
    }
  };
};

// Firebase token refresh removed - using Clerk only
export const refreshFirebaseToken = async (): Promise<string | null> => {
  console.warn('Firebase token refresh is disabled. Using Clerk authentication only.');
  return null;
};

// Function to get current token (Clerk only)
export const getAuthToken = async (): Promise<string | null> => {
  return localStorage.getItem(config.AUTH.TOKEN_STORAGE_KEY);
};

// Function to check if user is authenticated (Clerk only)
export const isAuthenticated = (): boolean => {
  const token = localStorage.getItem(config.AUTH.TOKEN_STORAGE_KEY);
  const userData = localStorage.getItem(config.AUTH.CURRENT_USER_KEY);
  
  return !!(token && userData);
}; 