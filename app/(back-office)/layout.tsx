import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import React from 'react';

export default function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className='flex h-screen'>
      <Sidebar />
      <div className='flex flex-col w-full'>
        <Header />
        <main className='flex-1 overflow-y-auto bg-slate-100'>
          {children}
        </main>
      </div>
    </div>
  );
}