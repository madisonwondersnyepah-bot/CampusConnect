import { Navigate, Outlet } from 'react-router-dom';
import useAuth from '../hooks/useAuth';

// UI convenience only: the API enforces the real permissions.
export default function RoleRoute({ roles }) {
  const { user } = useAuth();
  if (!roles.includes(user.role)) return <Navigate to="/" replace />;
  return <Outlet />;
}