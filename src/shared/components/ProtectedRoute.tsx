import React, { useEffect, useState, useRef } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { Spin } from 'antd';
import { useAppStore } from '../../store/appStore';
import pb from '../../core/pocketbase';

export const ProtectedRoute: React.FC = () => {
  const currentUser = useAppStore((state) => state.currentUser);
  const [isValidating, setIsValidating] = useState(Boolean(currentUser));
  const hasValidatedRef = useRef(false);

  useEffect(() => {
    if (!currentUser || hasValidatedRef.current) {
      setIsValidating(false);
      return;
    }

    hasValidatedRef.current = true;
    pb.collection('users')
      .authRefresh()
      .catch(() => {
        pb.authStore.clear();
      })
      .finally(() => {
        setIsValidating(false);
      });
  }, [currentUser]);

  if (isValidating) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};
