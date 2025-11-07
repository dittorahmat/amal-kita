import { Navigate, useLocation } from 'react-router-dom';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedAdminRoute({ children }: ProtectedRouteProps) {
  const isAuthenticated = localStorage.getItem('admin-authenticated') === 'true';
  const location = useLocation();
  
  if (!isAuthenticated) {
    // Redirect to login page with return url
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }
  
  return <>{children}</>;
}