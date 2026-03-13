import React from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { BottomNav } from '@/components/BottomNav';
import { TopNav } from '@/components/TopNav';

export const AppLayout: React.FC = () => {
  const { profile } = useAuth();
  const isMobile = useIsMobile();
  const location = useLocation();

  const isAuthPage = location.pathname === '/auth';
  const isAdminPage = location.pathname.startsWith('/tianadmin');

  if (isAuthPage || isAdminPage) {
    return <Outlet />;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {!isMobile && <TopNav />}
      <main className={`flex-1 ${isMobile ? 'pb-16' : ''}`}>
        <Outlet />
      </main>
      {isMobile && <BottomNav />}
    </div>
  );
};
