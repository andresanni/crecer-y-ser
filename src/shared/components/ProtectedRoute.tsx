import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAppStore } from '../../store/appStore';

export const ProtectedRoute: React.FC = () => {
  const currentUser = useAppStore((state) => state.currentUser);

  // Si no hay un usuario autenticado, lo enviamos al login
  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  // Si está autenticado, renderizamos las rutas hijas
  return <Outlet />;
};
