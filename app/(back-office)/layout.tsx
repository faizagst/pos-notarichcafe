'use client'
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import React, { useState } from 'react';

export default function Layout({ children }: { children: React.ReactNode }) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div className='flex h-screen '>
      <Sidebar isCollapsed={isCollapsed} onToggle={() => setIsCollapsed(prev => !prev)} />
      <div className='flex flex-col w-full'>
        <Header />
        <div
          className='flex-1 overflow-auto bg-white transition-all duration-300'
          style={{ marginLeft: isCollapsed ? '80px' : '256px' }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
