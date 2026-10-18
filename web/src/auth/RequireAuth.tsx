import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useCurrentUser } from './useCurrentUser';

export function RequireAuth({ children }: { children: ReactNode }) {
  const { data: user, isPending } = useCurrentUser();
  const location = useLocation();

  if (isPending) {
    return null;
  }

  if (!user) {
    return <Navigate to="/sign-in" state={{ from: location.pathname }} replace />;
  }

  return children;
}