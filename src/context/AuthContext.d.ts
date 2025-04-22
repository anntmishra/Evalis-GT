interface User {
  id: number | string;
  name: string;
  role: 'student' | 'teacher' | 'admin';
  token: string;
  [key: string]: any;
}

export interface AuthContextType {
  currentUser: User | null;
  loading: boolean;
  error: string | null;
  studentLogin: (id: string, password: string) => Promise<User>;
  teacherLogin: (id: string, password: string) => Promise<User>;
  adminLogin: (username: string, password: string) => Promise<User>;
  logout: () => void;
  isAuthenticated: boolean;
  isStudent: boolean;
  isTeacher: boolean;
  isAdmin: boolean;
}

export function useAuth(): AuthContextType;
export function AuthProvider(props: { children: React.ReactNode }): JSX.Element; 