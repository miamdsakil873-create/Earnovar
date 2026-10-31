import React, { useState, useEffect } from 'react';
import { UserPanelApp } from '../artifacts/earn-platform/UserPanelApp.tsx';
import { StandaloneAdminApp } from '../artifacts/earn-platform/StandaloneAdminApp.tsx';

const checkIsAdminRoute = (): boolean => {
  if (typeof window === 'undefined') return false;
  const path = window.location.pathname.toLowerCase();
  const hash = window.location.hash.toLowerCase();
  const search = window.location.search.toLowerCase();
  return (
    path === '/admin' ||
    path.startsWith('/admin') ||
    hash.includes('admin') ||
    search.includes('admin')
  );
};

export default function App() {
  const [isAdmin, setIsAdmin] = useState<boolean>(checkIsAdminRoute);

  useEffect(() => {
    const handleNavigation = () => {
      setIsAdmin(checkIsAdminRoute());
    };

    window.addEventListener('popstate', handleNavigation);
    window.addEventListener('hashchange', handleNavigation);
    const interval = setInterval(handleNavigation, 500);

    return () => {
      window.removeEventListener('popstate', handleNavigation);
      window.removeEventListener('hashchange', handleNavigation);
      clearInterval(interval);
    };
  }, []);

  if (isAdmin) {
    return (
      <StandaloneAdminApp
        onBackToUser={() => {
          window.history.pushState(null, '', '/');
          setIsAdmin(false);
        }}
      />
    );
  }

  return <UserPanelApp />;
}
