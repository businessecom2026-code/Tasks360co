import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../../stores/useAuthStore';

const ADMIN_EMAIL = 'admin@ecom360.co';

export function AdminGuard() {
  const user = useAuthStore((s) => s.user);

  if (user?.email !== ADMIN_EMAIL) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}

export function isAdminUser(email?: string | null): boolean {
  return email === ADMIN_EMAIL;
}
