import { auth } from '../config/firebase';
import config from '../config/environment';

/**
 * Get token from local storage
 */
export const getToken = (): string | null => {
  // IMPORTANT: Prefer our application-issued JWT (may carry admin role)
  // over any Firebase ID token that might belong to a non-admin user still in storage.
  // Previous ordering caused admin actions to send a Firebase token (student/teacher)
  // resulting in 401/403 on protected admin routes.
  const appToken = localStorage.getItem(config.AUTH.TOKEN_STORAGE_KEY);
  if (appToken) return appToken;
  return localStorage.getItem('firebaseToken');
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
    
    console.log('Refreshing Firebase token for user:', currentUser.email);
    
    // Force token refresh
    const newToken = await currentUser.getIdToken(true);
    console.log('Firebase token refreshed successfully');
    
    // Update token in both storage locations
    localStorage.setItem('firebaseToken', newToken);
    localStorage.setItem(config.AUTH.TOKEN_STORAGE_KEY, newToken);
    
    // Also update the token in the currentUser object in localStorage
    const userData = localStorage.getItem(config.AUTH.CURRENT_USER_KEY);
    if (userData) {
      try {
        const user = JSON.parse(userData);
        user.token = newToken; // Update the token
        localStorage.setItem(config.AUTH.CURRENT_USER_KEY, JSON.stringify(user));
      } catch (error) {
        console.error('Error updating user data with new token:', error);
      }
    }
    
    return newToken;
  } catch (error) {
    console.error('Error refreshing Firebase token:', error);
    return null;
  }
};

// Function to get current token or refresh if needed
export const getAuthToken = async (): Promise<string | null> => {
  // Prefer app token first (could hold admin role)
  let token = localStorage.getItem(config.AUTH.TOKEN_STORAGE_KEY) || localStorage.getItem('firebaseToken');
  
  // If we have a Firebase user but token is missing or potentially expired, refresh it
  if (auth.currentUser) {
    if (!token) {
      console.log('No token found, refreshing Firebase token');
      return refreshFirebaseToken();
    }
    
    // Decode the token to check its expiration
    // Firebase tokens expire in 1 hour by default
    try {
      // Simplified check: if token is older than 50 minutes, refresh it
      // In a production app, you would decode and check the exp claim
      const lastRefresh = localStorage.getItem('lastTokenRefresh');
      const now = Date.now();
      
      if (!lastRefresh || (now - parseInt(lastRefresh)) > 50 * 60 * 1000) {
        console.log('Token might be expired, refreshing');
        localStorage.setItem('lastTokenRefresh', now.toString());
        return refreshFirebaseToken();
      }
    } catch (e) {
      console.error('Error checking token expiration:', e);
      return refreshFirebaseToken();
    }
  }
  
  return token;
};

// Function to check if user is authenticated
export const isAuthenticated = (): boolean => {
  const token = localStorage.getItem(config.AUTH.TOKEN_STORAGE_KEY) || localStorage.getItem('firebaseToken');
  const userData = localStorage.getItem(config.AUTH.CURRENT_USER_KEY);
  
  // Also check if we have a current Firebase user
  const firebaseUser = auth.currentUser;
  
  return !!(token && userData) || !!firebaseUser;
}; 