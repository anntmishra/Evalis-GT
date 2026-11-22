import { LOCAL_AUTH, useDevelopmentAuth } from '../context/DevelopmentAuth';
import { useUser, useAuth as useClerkAuth } from '@clerk/clerk-react';
import { useEffect, useState } from 'react';
import axios from 'axios';
import config from '../config/environment';

type UserRole = 'admin' | 'master_admin' | 'teacher' | 'student' | 'hod' | 'dean' | 'assistant_dean' | 'programme_coordinator' | 'coe';

interface UserProfile {
  id: string;
  email: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  role: UserRole;
}

function useClerkProfile() {
  const { isSignedIn, getToken, signOut } = useClerkAuth();
  const { user } = useUser();
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const syncUserProfile = async () => {
      if (!isSignedIn || !user) {
        setCurrentUser(null);
        setLoading(false);
        return;
      }

      try {
        const normalizeProfile = (profileData: any) => {
          const profile = profileData?.user && typeof profileData.user === 'object' ? profileData.user : profileData;
          const email = profile?.email || profile?.primaryEmailAddress?.emailAddress || user.emailAddresses[0]?.emailAddress || '';
          const name = profile?.name || `${profile?.firstName || ''} ${profile?.lastName || ''}`.trim();
          const role = profile?.role || (localStorage.getItem('userRole') as UserRole | null) || 'student';

          return {
            id: profile?.id || profile?.username || user.id,
            email,
            name: name || email.split('@')[0] || 'User',
            firstName: profile?.firstName || user.firstName || undefined,
            lastName: profile?.lastName || user.lastName || undefined,
            role,
          } as UserProfile;
        };

        // Get Clerk token
        const token = await getToken();
        if (!token) {
          throw new Error('No token available');
        }

        // Store token for API calls
        localStorage.setItem('authToken', token);
        localStorage.setItem(config.AUTH.TOKEN_STORAGE_KEY, token);

        // Try to get user profile from backend
        const response = await axios.get(`${config.API_BASE_URL}/auth/profile`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        const normalizedProfile = normalizeProfile(response.data);
        setCurrentUser(normalizedProfile);

        // Store user data
        localStorage.setItem(config.AUTH.CURRENT_USER_KEY, JSON.stringify(normalizedProfile));
        localStorage.setItem('currentUser', JSON.stringify(normalizedProfile));
        localStorage.setItem('userRole', normalizedProfile.role);

      } catch (err: any) {
        console.error('Error syncing user profile:', err);
        setError(err.response?.data?.message || err.message || 'Failed to sync profile');
        
        // If the backend returns 401 or 403, the user is explicitly not authorized in the DB
        if (err.response?.status === 401 || err.response?.status === 403) {
          setCurrentUser(null);
          localStorage.removeItem(config.AUTH.CURRENT_USER_KEY);
          localStorage.removeItem('currentUser');
          localStorage.removeItem('userRole');
        } else if (user) {
          // Soft failure (network issue, etc) - use Clerk data but don't force a role
          const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim();
          const fallbackProfile = {
            id: user.id,
            email: user.emailAddresses[0]?.emailAddress || '',
            name: fullName || user.emailAddresses[0]?.emailAddress?.split('@')[0] || 'User',
            firstName: user.firstName || undefined,
            lastName: user.lastName || undefined,
            role: (localStorage.getItem('userRole') as UserRole) || 'student'
          };
          setCurrentUser(fallbackProfile);
          localStorage.setItem(config.AUTH.CURRENT_USER_KEY, JSON.stringify(fallbackProfile));
          localStorage.setItem('currentUser', JSON.stringify(fallbackProfile));
          localStorage.setItem('userRole', fallbackProfile.role);
        }
      } finally {
        setLoading(false);
      }
    };

    syncUserProfile();
  }, [isSignedIn, user, getToken]);

  const logout = async () => {
    // Clear local storage
    localStorage.removeItem('authToken');
    localStorage.removeItem(config.AUTH.TOKEN_STORAGE_KEY);
    localStorage.removeItem(config.AUTH.CURRENT_USER_KEY);
    localStorage.removeItem('currentUser');
    localStorage.removeItem('userRole');
    
    await signOut();
    setCurrentUser(null);
  };

  const updateUser = (userData: Partial<UserProfile>) => {
    if (currentUser) {
      const updatedUser = { ...currentUser, ...userData };
      setCurrentUser(updatedUser);
      localStorage.setItem(config.AUTH.CURRENT_USER_KEY, JSON.stringify(updatedUser));
    }
  };

  return {
    currentUser,
    loading,
    error,
    isSignedIn,
    logout,
    updateUser,
    setError
  };
}

export const useAuth = LOCAL_AUTH ? useDevelopmentAuth : useClerkProfile;
