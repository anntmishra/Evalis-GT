interface User {
  id: number | string;
  name: string;
  role: 'student' | 'teacher' | 'admin';
  token: string;
  [key: string]: any;
}

export interface AuthContextType {
  currentUser: User | null;
  firebaseUser: any | null;
  loading: boolean;
  error: string | null;
  login: (identifier: string, password: string) => Promise<User>;
  logout: () => void;
  setupTeacherPassword: (email: string, currentPassword: string, newPassword: string) => Promise<User>;
  requestPasswordReset: (email: string) => Promise<void>;
}

export function useAuth(): AuthContextType;
export function AuthProvider(props: { children: React.ReactNode }): JSX.Element; 