// This file is kept for backwards compatibility but Firebase functionality has been removed
// All authentication is now handled by Clerk

// Placeholder objects
export const auth = null;
export const analytics = null;
const app = null;

// Deprecated functions - these will no longer work and should be replaced with Clerk
export const loginWithEmailAndPassword = async (
  email: string, 
  password: string
): Promise<any> => {
  throw new Error('Firebase authentication has been removed. Please use Clerk authentication.');
};

export const registerWithEmailAndPassword = async (
  email: string, 
  password: string
): Promise<any> => {
  throw new Error('Firebase authentication has been removed. Please use Clerk authentication.');
};

export const sendPasswordReset = async (email: string): Promise<{ success: boolean; message: string }> => {
  throw new Error('Firebase authentication has been removed. Please use Clerk authentication.');
};

export const logoutUser = async (): Promise<void> => {
  throw new Error('Firebase authentication has been removed. Please use Clerk authentication.');
};

export const getCurrentUser = (): any | null => {
  return null;
};

export default app;
