import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { portalHome } from '../context/DevelopmentAuth';
export function WorkspaceHome() { const { currentUser, loading } = useAuth(); return loading ? <p className="p-8">Loading workspace…</p> : <Navigate to={currentUser ? portalHome(currentUser.role) : '/login'} replace />; }
export default function WorkspaceGuard({ roles, children }: { roles: string[]; children: ReactNode }) {
  const { currentUser, loading } = useAuth();
  if (loading) return <p className="p-8">Verifying access…</p>;
  if (!currentUser) return <Navigate to="/login" replace />;
  if (!roles.includes(currentUser.role)) return <Navigate to={portalHome(currentUser.role)} replace />;
  return <>{children}</>;
}
