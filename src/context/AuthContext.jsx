import { createContext, useContext, useState, useEffect } from 'react';
import { getUserProfile } from '../api';
import config from '../config/environment';
import { 
  auth, 
  loginWithEmailAndPassword, 
  logoutUser,
  getCurrentUser
} from '../config/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import axios from 'axios';

// Create context
const AuthContext = createContext(null);

// Hook to use the auth context
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Auth Provider component
export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // This effect runs on initial component mount to restore user state
  useEffect(() => {
    // Check for user in localStorage on page load
    const storedUser = localStorage.getItem(config.AUTH.CURRENT_USER_KEY);
    
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setCurrentUser(parsedUser);
        
        // Make sure token is also available in the TOKEN_STORAGE_KEY
        if (parsedUser.token && !localStorage.getItem(config.AUTH.TOKEN_STORAGE_KEY)) {
          localStorage.setItem(config.AUTH.TOKEN_STORAGE_KEY, parsedUser.token);
        }
        
        // Validate the session silently
        const validateSession = async () => {
          try {
            // Check if token is still valid by making a lightweight API call
            const token = localStorage.getItem(config.AUTH.TOKEN_STORAGE_KEY);
            if (!token) return;
            
            const response = await axios.get(
              `${config.API_BASE_URL}/auth/status`,
              { 
                headers: { 
                  Authorization: `Bearer ${token}` 
                },
                // Avoid throwing 401s which might trigger logout
                validateStatus: (status) => status < 500
              }
            );
            
            // If session is invalid, try refresh token if available
            if (response.status !== 200 && parsedUser.refreshToken) {
              try {
                const refreshResponse = await axios.post(
                  `${config.API_BASE_URL}/auth/refresh`,
                  { refreshToken: parsedUser.refreshToken }
                );
                
                if (refreshResponse.status === 200 && refreshResponse.data.token) {
                  // Update tokens
                  localStorage.setItem(config.AUTH.TOKEN_STORAGE_KEY, refreshResponse.data.token);
                  
                  // Update user object
                  parsedUser.token = refreshResponse.data.token;
                  if (refreshResponse.data.refreshToken) {
                    parsedUser.refreshToken = refreshResponse.data.refreshToken;
                  }
                  
                  localStorage.setItem(config.AUTH.CURRENT_USER_KEY, JSON.stringify(parsedUser));
                  setCurrentUser(parsedUser);
                }
              } catch (refreshError) {
                console.error('Token refresh failed:', refreshError);
                // Don't logout here, let the app continue with potentially invalid token
                // The API interceptor will handle actual API call failures
              }
            }
          } catch (error) {
            console.error('Session validation error:', error);
            // Don't logout here to avoid disrupting user experience on page load
          }
        };
        
        validateSession();
      } catch (e) {
        console.error('Error parsing stored user data:', e);
        // If there's an error parsing the user data, clear it
        localStorage.removeItem(config.AUTH.CURRENT_USER_KEY);
      }
    }
    
    // Subscribe to Firebase auth state changes
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
      setLoading(false);
    });
    
    return () => unsubscribe();
  }, []);

  // Unified login function
  const login = async (identifier, password) => {
    try {
      setLoading(true);
      setError(null);
      
      // Check if this is an admin login attempt (no @ symbol)
      if (!identifier.includes('@')) {
        try {
          console.log('Attempting admin login with username:', identifier);
          const response = await fetch(`${config.API_ENDPOINTS.AUTH.ADMIN_LOGIN}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              username: identifier,
              password: password
            }),
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Admin login failed');
          }

          const userData = await response.json();
          
          // Store user data
          localStorage.setItem(config.AUTH.CURRENT_USER_KEY, JSON.stringify(userData));
          localStorage.setItem(config.AUTH.TOKEN_STORAGE_KEY, userData.token);
          
          setCurrentUser(userData);
          return userData;
        } catch (adminError) {
          console.log('Admin login failed:', adminError.message);
          throw new Error('Invalid username or password. Please check your credentials and try again.');
        }
      }
      
      // For email-based login (students and teachers), try our own APIs first
      const trimmedEmail = identifier.trim();
      console.log('Attempting login with email:', trimmedEmail);
      
      // First try direct teacher login through our own API
      try {
        console.log('Attempting teacher login through our API');
        const response = await axios.post(`${config.API_BASE_URL}/auth/teacher/login`, {
          email: trimmedEmail,
          password
        });
        
        if (response.status === 200 && response.data) {
          console.log('Teacher login successful via our API:', response.data);
          const userData = response.data;
          
          // Store user data and token
          localStorage.setItem(config.AUTH.CURRENT_USER_KEY, JSON.stringify(userData));
          localStorage.setItem(config.AUTH.TOKEN_STORAGE_KEY, userData.token);
          
          setCurrentUser(userData);
          setLoading(false);
          return userData;
        }
      } catch (teacherLoginError) {
        console.log('Teacher login through our API failed, will try Firebase:', teacherLoginError.message);
        // Continue to Firebase authentication if our API login fails
      }
      
      // Try Firebase authentication as fallback
      try {
        console.log('Attempting Firebase login with email:', trimmedEmail);
        
        try {
          const userCredential = await loginWithEmailAndPassword(trimmedEmail, password);
          const user = userCredential.user;
          
          console.log('Firebase login successful, user:', user.uid);
          
          // Get Firebase ID token
          const firebaseToken = await user.getIdToken();
          
          // Store Firebase token separately for API calls
          localStorage.setItem('firebaseToken', firebaseToken);
          
          // Try to get user profile from backend API
          try {
            console.log('Fetching user profile from backend');
            const profileResponse = await getUserProfile();
            console.log('Profile response:', profileResponse);
            
            const userData = {
              id: profileResponse.data.id,
              email: user.email,
              name: profileResponse.data.name || user.displayName || user.email.split('@')[0],
              role: profileResponse.data.role || 'student',
              token: firebaseToken
            };
            
            console.log('User data with profile:', userData);
            localStorage.setItem(config.AUTH.CURRENT_USER_KEY, JSON.stringify(userData));
            localStorage.setItem(config.AUTH.TOKEN_STORAGE_KEY, firebaseToken);
            
            setCurrentUser(userData);
            return userData;
          } catch (profileError) {
            console.log('User not found in backend, error:', profileError);
            console.log('Using Firebase data only');
            
            // If backend doesn't have the user, create a minimal user object from Firebase data
            const userData = {
              id: user.uid,
              email: user.email,
              name: user.displayName || user.email.split('@')[0],
              role: 'student', // Default role
              token: firebaseToken
            };
            
            console.log('User data from Firebase only:', userData);
            localStorage.setItem(config.AUTH.CURRENT_USER_KEY, JSON.stringify(userData));
            localStorage.setItem(config.AUTH.TOKEN_STORAGE_KEY, firebaseToken);
            
            setCurrentUser(userData);
            return userData;
          }
        } catch (firebaseError) {
          console.error('Firebase login failed:', firebaseError.code, firebaseError.message);
          // Preserve the original error code for specific error handling
          throw firebaseError;
        }
      } catch (err) {
        console.error('Login error:', err.code, err.message);
        setError(err.message || 'Invalid email or password. Please check your credentials and try again.');
        throw err;
      } finally {
        setLoading(false);
      }
    } catch (err) {
      console.error('Login error:', err);
      setError(err.message || 'Invalid email or password. Please check your credentials and try again.');
      throw err;
    }
  };

  const setupTeacherPassword = async (email, currentPassword, newPassword) => {
    try {
      setLoading(true);
      setError(null);
      
      // For password setup, we'll just rely on Firebase password update
      // This functionality can be implemented later if needed
      throw new Error('Password setup is now handled through Firebase');
    } catch (err) {
      setError(err.message || 'Password setup failed');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    // Sign out from Firebase if user is signed in
    if (firebaseUser) {
      await logoutUser();
    }
    
    // Clear all storage
    localStorage.removeItem(config.AUTH.CURRENT_USER_KEY);
    localStorage.removeItem(config.AUTH.TOKEN_STORAGE_KEY);
    localStorage.removeItem('firebaseToken');
    
    setCurrentUser(null);
  };

  // Set up password reset request
  const requestPasswordReset = async (email) => {
    // This would be handled by Firebase's password reset functionality
    throw new Error('Password reset is now handled through Firebase');
  };

  const value = {
    currentUser,
    firebaseUser,
    loading,
    error,
    login,
    logout,
    setupTeacherPassword,
    requestPasswordReset
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// No default export to avoid Fast Refresh issues 