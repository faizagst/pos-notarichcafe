'use client';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
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

  if (!permissions) {
    return (
        <div className="flex items-center justify-center h-64">
            <div className="flex flex-col items-center">
                <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="mt-4 text-gray-600 text-sm">Memuat data izin akses...</p>
            </div>
        </div>
    );
}

  const sidebarWidth = isCollapsed ? 80 : 256;

  return (
    <div className="h-screen">
      <Sidebar isCollapsed={isCollapsed} onToggle={() => setIsCollapsed(prev => !prev)} role={permissions} />

      <div
        className="flex flex-col h-full transition-all duration-300"
        style={{ paddingLeft: `${sidebarWidth}px` }}
      >
        <Header />
        <main className="flex-1 overflow-auto bg-white">
          {children}
        </main>
      </div>
    </div>
  );
}
