'use client';
import Header from '@/components/Header';
import SidebarCashier from '@/components/SidebarCashier';
import { NotificationProvider } from ".././contexts/NotificationContext";
import { useEffect, useState } from 'react';

export default function Layout({ children }: { children: React.ReactNode }) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [permissions, setPermissions] = useState<{
    backofficePermissions: Record<string, any>;
    appPermissions: Record<string, boolean>;
  } | null>(null);

  useEffect(() => {
    const fetchRole = async () => {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        setPermissions({
          backofficePermissions: data.user?.backofficePermissions || {},
          appPermissions: data.user?.appPermissions || {},
        });
      } else {
        console.error('Failed to fetch permissions');
      }
    };
    fetchRole();
  }, []);

  if (!permissions) return <div>Loading...</div>;

  const sidebarWidth = isCollapsed ? 80 : 256;

  return (
    <div className="h-screen">
      <SidebarCashier isCollapsed={isCollapsed} onToggle={() => setIsCollapsed(prev => !prev)} role={permissions} />
  
      <div
        className="flex flex-col h-full transition-all duration-300"
        style={{ paddingLeft: `${sidebarWidth}px` }}
      >
        <Header />
        <main className="flex-1 overflow-auto bg-white">
          <NotificationProvider>
            {children}
          </NotificationProvider>
        </main>
      </div>
    </div>
  );
  
}
