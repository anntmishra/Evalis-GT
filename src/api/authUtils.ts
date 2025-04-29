import { auth } from '../config/firebase';
import config from '../config/environment';

/**
 * Get token from local storage
 */
export const getToken = (): string | null => {
  const token = localStorage.getItem(config.AUTH.TOKEN_STORAGE_KEY);
  return token;
};

/**
 * Get auth config for axios requests
 */
export const getAuthConfig = () => {
  const token = getToken();
  return {
    headers: {
      'Content-Type': 'application/json',
      Authorization: token ? `Bearer ${token}` : ''
    }
  };
};

// Function to refresh Firebase token
export const refreshFirebaseToken = async (): Promise<string | null> => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      console.log('No current Firebase user found for token refresh');
      return null;
    }
    
    // Force token refresh
    const newToken = await currentUser.getIdToken(true);
    console.log('Firebase token refreshed');
    
    // Update token in storage
    localStorage.setItem('firebaseToken', newToken);
    localStorage.setItem(config.AUTH.TOKEN_STORAGE_KEY, newToken);
    
    return newToken;
  } catch (error) {
    console.error('Error refreshing Firebase token:', error);
    return null;
  }
};

// Function to get current token or refresh if needed
export const getAuthToken = async (): Promise<string | null> => {
  // First try to get Firebase token
  let token = localStorage.getItem('firebaseToken');
  
  // Then fall back to our stored token
  if (!token) {
    token = localStorage.getItem(config.AUTH.TOKEN_STORAGE_KEY);
  }
  
  // If we have a Firebase user but token is missing or potentially expired, refresh it
  if (auth.currentUser && (!token || Math.random() < 0.1)) {
    // Randomly refresh token 10% of the time to avoid expiration issues
    return refreshFirebaseToken();
  }
  
  return token;
};

// Function to check if user is authenticated
export const isAuthenticated = (): boolean => {
  const token = localStorage.getItem(config.AUTH.TOKEN_STORAGE_KEY) || 
                localStorage.getItem('firebaseToken');
  const userData = localStorage.getItem(config.AUTH.CURRENT_USER_KEY);
  
  return !!(token && userData);
}; 