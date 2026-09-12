import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAppStore } from '../../store/appStore';

export const ProtectedRoute: React.FC = () => {
  const currentUser = useAppStore((state) => state.currentUser);


  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }


  return <Outlet />;
};
